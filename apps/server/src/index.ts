import { Hono } from "hono";
import { cors } from "hono/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { createServer } from "node:http";
import { createDb } from "@unstall/db";
import { redisInstances } from "@unstall/db/schema";
import { createAuth } from "@unstall/auth";
import { createLogger } from "@unstall/logger";
import { createServices, getMembership } from "@unstall/services";
import { eq } from "drizzle-orm";
import { createDiscoveryCache } from "@unstall/redis";
import { env } from "./env.js";
import { RealtimeManager } from "./realtime/manager.js";
import { attachSocketServer } from "./realtime/socket.js";
import { AlertEngine } from "./alerts/engine.js";
import { appRouter } from "./rpc/router.js";
import { createRpcHandlerPlugins } from "./rpc/logging.js";

const logger = createLogger("server");
const db = createDb(env.DATABASE_URL);

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
    origin: env.PLATFORM_URL,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

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

httpServer.listen(Number(env.PORT), () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);

  void (async () => {
    await services.redis.bootstrapInstances();
    await alertEngine.start();
  })();
});
