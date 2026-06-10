import { Hono } from "hono";
import { cors } from "hono/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { createServer } from "node:http";
import { createDb } from "@unstall/db";
import { createAuth } from "@unstall/auth";
import { createLogger } from "@unstall/logger";
import { eq } from "drizzle-orm";
import { redisInstances } from "@unstall/db/schema";
import type { EncryptedEnvelope } from "@unstall/shared";
import { env } from "./env.js";
import { RealtimeManager } from "./realtime/manager.js";
import { attachSocketServer } from "./realtime/socket.js";
import { AlertEngine } from "./alerts/engine.js";
import { appRouter } from "./rpc/router.js";
import { getMembership } from "./rbac.js";
import { decryptSecret } from "./encryption-service.js";

const logger = createLogger("server");
const db = createDb(env.DATABASE_URL);

const auth = createAuth({
  db,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  cookieDomain: env.COOKIE_DOMAIN,
  platformURL: env.PLATFORM_URL,
});

const httpServer = createServer();
const realtime = new RealtimeManager(null, logger);
const io = attachSocketServer(httpServer, auth, db, realtime, logger, env.PLATFORM_URL);
realtime.setSocketServer(io);

const alertEngine = new AlertEngine(db, realtime.getMetrics(), logger);
const rpcHandler = new RPCHandler(appRouter);

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
      realtime,
      alertEngine,
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
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (response.body) {
    const arrayBuffer = await response.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } else {
    res.end();
  }
});

httpServer.listen(Number(env.PORT), async () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
  await bootstrapRedisInstances();
  await alertEngine.start();
});

async function bootstrapRedisInstances() {
  const instances = await db.select().from(redisInstances);

  for (const instance of instances) {
    try {
      const password = decryptSecret(
        instance.encryptedCredentials as EncryptedEnvelope,
      );
      await realtime.registerInstance({
        id: instance.id,
        host: instance.host,
        port: instance.port,
        password: password || undefined,
        tls: instance.tls,
        bullmqPrefix: instance.bullmqPrefix,
      });
      await db
        .update(redisInstances)
        .set({ status: "connected", lastConnectedAt: new Date() })
        .where(eq(redisInstances.id, instance.id));
    } catch (error) {
      logger.error({ error, id: instance.id }, "Failed to connect redis instance");
      await db
        .update(redisInstances)
        .set({
          status: "error",
          lastError: error instanceof Error ? error.message : "Connection failed",
        })
        .where(eq(redisInstances.id, instance.id));
    }
  }
}
