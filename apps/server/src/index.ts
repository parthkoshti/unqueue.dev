import { Hono } from "hono";
import { cors } from "hono/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { createServer } from "node:http";
import { createDb, runMigrations } from "@unqueue/db";
import { redisInstances, waitlistSubscribers } from "@unqueue/db/schema";
import { createAuth } from "@unqueue/auth";
import { createLogger } from "@unqueue/logger";
import { createServices, getMembership } from "@unqueue/services";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createDiscoveryCache } from "@unqueue/redis";
import { env } from "./env.js";
import { RealtimeManager } from "./realtime/manager.js";
import { attachSocketServer } from "./realtime/socket.js";
import { AlertEngine } from "./alerts/engine.js";
import { appRouter } from "@unqueue/orpc";
import { createRpcHandlerPlugins } from "./rpc/logging.js";

const logger = createLogger("server");
logger.info({ PLATFORM_URL: env.PLATFORM_URL, WEB_URL: env.WEB_URL }, "CORS allowed origins");
const db = createDb(env.DATABASE_URL);
const waitlistRateLimit = new Map<string, { count: number; resetAt: number }>();
const waitlistInputSchema = z.object({
  email: z.string().trim().email().max(320),
});

const auth = createAuth({
  db,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  cookieDomain: env.COOKIE_DOMAIN,
  platformURL: env.PLATFORM_URL,
});

const discoveryCache = createDiscoveryCache(env.REDIS_URL);

const httpServer = createServer();
const realtime = new RealtimeManager(
  null,
  logger,
  discoveryCache,
  (redisInstanceId, status, error) => {
  void db
    .update(redisInstances)
    .set({
      status,
      lastError: error ?? null,
      ...(status === "connected" ? { lastConnectedAt: new Date() } : {}),
    })
    .where(eq(redisInstances.id, redisInstanceId))
    .then(() => {
      logger.debug({ redisInstanceId, status }, "Updated redis instance health");
    })
    .catch((err) => {
      logger.error({ err, redisInstanceId, status }, "Failed to persist redis health");
    });
  },
);
const io = attachSocketServer(httpServer, auth, db, realtime, logger, env.PLATFORM_URL);
realtime.setSocketServer(io);

const alertEngine = new AlertEngine(db, realtime.getMetrics(), logger, env.ENCRYPTION_KEYS);
const services = createServices({
  db,
  logger,
  platformUrl: env.PLATFORM_URL,
  encryptionKeys: env.ENCRYPTION_KEYS,
  realtime,
  alerts: alertEngine,
});

const rpcHandler = new RPCHandler(appRouter, {
  plugins: createRpcHandlerPlugins(logger),
});

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = new Set([
        env.PLATFORM_URL,
        env.WEB_URL,
        env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
      ].filter(Boolean));

      return allowedOrigins.has(origin) ? origin : null;
    },
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/api/waitlist", async (c) => {
  const ip = getClientIp(c.req.raw);
  const rateLimit = checkWaitlistRateLimit(ip);
  if (!rateLimit.ok) {
    return c.json(
      { error: "Too many waitlist submissions. Try again later." },
      429,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = waitlistInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Enter a valid email address." }, 400);
  }

  const email = parsed.data.email.toLowerCase();
  const userAgent = c.req.header("user-agent") ?? null;

  try {
    const inserted = await db
      .insert(waitlistSubscribers)
      .values({ email, userAgent })
      .onConflictDoNothing({ target: waitlistSubscribers.email })
      .returning({ id: waitlistSubscribers.id });

    if (inserted.length > 0) {
      await notifyDiscord(email).catch((err) => {
        logger.error({ err, email }, "Failed to notify Discord for waitlist signup");
      });
    }

    return c.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to store waitlist signup");
    return c.json({ error: "Could not join the waitlist right now." }, 500);
  }
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/rpc/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  let membership;
  const workspaceId = c.req.header("x-workspace-id");
  if (session?.user && workspaceId) {
    const m = await getMembership(db, session.user.id, workspaceId);
    if (m) membership = { workspaceId, role: m.role };
  }

  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: {
      db,
      logger,
      services,
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          }
        : null,
      membership,
    },
  });

  if (matched) return c.newResponse(response.body, response);
  await next();
});

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    request.headers.get("cf-connecting-ip") ??
    forwardedFor?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function checkWaitlistRateLimit(ip: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;
  const current = waitlistRateLimit.get(ip);

  if (!current || current.resetAt <= now) {
    waitlistRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= maxRequests) return { ok: false };

  current.count += 1;
  return { ok: true };
}

async function notifyDiscord(email: string) {
  if (!env.DISCORD_NOTIFICATION_URL) return;

  const response = await fetch(env.DISCORD_NOTIFICATION_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: `New hosted waitlist signup: ${email}`,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook returned ${response.status}`);
  }
}

httpServer.on("request", async (req, res) => {
  // Socket.IO registers its own request handler on this server; skip those requests.
  if (req.url?.startsWith("/socket.io")) return;

  const url = `http://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await new Promise<Buffer>((resolve) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => resolve(Buffer.concat(chunks)));
        })
      : undefined;

  const request = new Request(url, {
    method: req.method,
    headers,
    body: body?.length ? body : undefined,
  });

  const response = await app.fetch(request);
  if (res.headersSent) return;

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (response.body) {
    const arrayBuffer = await response.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } else {
    res.end();
  }
});

await runMigrations(env.DATABASE_URL);
logger.info("Database migrations complete");

httpServer.listen(Number(env.PORT), () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);

  void (async () => {
    await services.redis.bootstrapInstances();
    await alertEngine.start();
  })();
});
