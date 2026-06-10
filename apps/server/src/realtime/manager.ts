import { QueueEvents } from "bullmq";
import {
  ConnectionPool,
  type HealthChangeCallback,
  type QueueMeta,
  type RedisConnection,
  discoverQueues,
  diffQueues,
  getQueueMeta,
  getQueueMetaBatch,
  MetricsAggregator,
  QueuePool,
  type JobSummary,
  type RedisInstanceConfig,
} from "@unstall/bullmq";
import type { Logger } from "@unstall/logger";
import {
  DISCOVERY_CACHE_TTL_SEC,
  type DiscoveryCache,
} from "@unstall/redis";
import type { Server as SocketServer } from "socket.io";

type RoomEvent = {
  seq: number;
  type: string;
  payload: unknown;
};

type CachedMeta = {
  meta: QueueMeta;
  updatedAt: number;
};

type InstanceState = {
  config: RedisInstanceConfig;
  queues: string[];
  metaCache: Map<string, CachedMeta>;
  queueEvents: Map<string, QueueEvents>;
  discoveryTimer?: ReturnType<typeof setInterval>;
  lastScannedAt: number;
};

const PUSH_COUNTS_CONCURRENCY = 10;
// Minimum interval between re-scans for an instance that returned 0 queues.
// Prevents hammering the user's Redis on every request when no queues exist yet.
const MIN_RESCAN_INTERVAL_MS = 30_000;

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    async () => {
      while (index < items.length) {
        const current = index++;
        await fn(items[current]!);
      }
    },
  );
  await Promise.all(workers);
}

export class RealtimeManager {
  private pool: ConnectionPool;
  private queuePool = new QueuePool();
  private instances = new Map<string, InstanceState>();
  private instanceWorkspaces = new Map<string, string>();
  private registering = new Map<string, Promise<void>>();
  private discovering = new Map<string, Promise<string[]>>();
  private metaWarming = new Map<string, Promise<void>>();
  private seq = new Map<string, number>();
  private buffers = new Map<string, RoomEvent[]>();
  private metrics = new MetricsAggregator();
  private countDebounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private io: SocketServer | null,
    private logger: Logger,
    private discoveryCache: DiscoveryCache,
    onHealthChange?: HealthChangeCallback,
  ) {
    this.pool = new ConnectionPool(onHealthChange);
  }

  setSocketServer(io: SocketServer): void {
    this.io = io;
  }

  getMetrics() {
    return this.metrics;
  }

  getQueues(redisInstanceId: string): string[] {
    return this.instances.get(redisInstanceId)?.queues ?? [];
  }

  getWorkspaceIdForInstance(redisInstanceId: string): string | undefined {
    return this.instanceWorkspaces.get(redisInstanceId);
  }

  hasInstance(redisInstanceId: string): boolean {
    return this.instances.has(redisInstanceId);
  }

  async awaitRegistration(redisInstanceId: string): Promise<void> {
    if (this.instances.has(redisInstanceId)) {
      return;
    }

    const inFlight = this.registering.get(redisInstanceId);
    if (inFlight) {
      await inFlight;
    }
  }

  async registerInstance(config: RedisInstanceConfig): Promise<void> {
    if (this.instances.has(config.id)) {
      return;
    }

    const inFlight = this.registering.get(config.id);
    if (inFlight) {
      return inFlight;
    }

    const promise = this.doRegisterInstance(config);
    this.registering.set(config.id, promise);

    try {
      await promise;
    } finally {
      this.registering.delete(config.id);
    }
  }

  private async doRegisterInstance(config: RedisInstanceConfig): Promise<void> {
    if (this.instances.has(config.id)) {
      return;
    }

    this.pool.getConnection(config);

    const discoveryTimer = setInterval(
      () => void this.scheduleDiscovery(config.id),
      10 * 60 * 1000,
    );

    this.instances.set(config.id, {
      config,
      queues: [],
      metaCache: new Map(),
      queueEvents: new Map(),
      discoveryTimer,
      lastScannedAt: 0,
    });
    this.instanceWorkspaces.set(config.id, config.workspaceId);

    this.logger.info({ redisId: config.id }, "Registered redis instance");

    void this.runInitialDiscovery(config.id);
  }

  private async runInitialDiscovery(redisInstanceId: string): Promise<void> {
    const queues = await this.scheduleDiscovery(redisInstanceId);
    this.logger.info(
      { redisId: redisInstanceId, queueCount: queues.length },
      "Initial queue discovery complete",
    );
  }

  private scheduleDiscovery(redisInstanceId: string): Promise<string[]> {
    const existing = this.discovering.get(redisInstanceId);
    if (existing) {
      return existing;
    }

    const promise = this.refreshDiscovery(redisInstanceId)
      .catch((error) => {
        this.logger.error(
          { error, redisId: redisInstanceId },
          "Queue discovery failed",
        );
        return [] as string[];
      })
      .finally(() => {
        this.discovering.delete(redisInstanceId);
      });

    this.discovering.set(redisInstanceId, promise);
    return promise;
  }

  async ensureQueuesDiscovered(redisInstanceId: string): Promise<string[]> {
    const existing = this.getQueues(redisInstanceId);
    if (existing.length > 0) {
      return existing;
    }

    // If a previous scan returned 0 queues, don't immediately re-scan on the
    // next request. Wait MIN_RESCAN_INTERVAL_MS to avoid hammering a Redis
    // instance that has no queues yet (e.g. workers haven't started).
    const state = this.instances.get(redisInstanceId);
    if (state && state.lastScannedAt > 0) {
      const elapsed = Date.now() - state.lastScannedAt;
      if (elapsed < MIN_RESCAN_INTERVAL_MS) {
        return [];
      }
    }

    return this.scheduleDiscovery(redisInstanceId);
  }

  async unregisterInstance(redisInstanceId: string): Promise<void> {
    const state = this.instances.get(redisInstanceId);
    if (!state) return;

    if (state.discoveryTimer) clearInterval(state.discoveryTimer);
    await Promise.all([...state.queueEvents.values()].map((qe) => qe.close()));
    state.queueEvents.clear();
    await this.queuePool.closeForInstance(redisInstanceId);
    await this.pool.remove(redisInstanceId);
    this.instances.delete(redisInstanceId);
    this.instanceWorkspaces.delete(redisInstanceId);
    await this.discoveryCache.invalidate(redisInstanceId);
  }

  async refreshDiscovery(redisInstanceId: string): Promise<string[]> {
    const state = this.instances.get(redisInstanceId);
    if (!state) return [];

    // On cold start (no in-memory queues), seed from cache immediately so the
    // hot path doesn't block on a full SCAN of the user's keyspace. A background
    // scan will reconcile any drift and update the cache for next time.
    if (state.queues.length === 0) {
      const cached = await this.discoveryCache.get(redisInstanceId);
      if (cached && cached.length > 0) {
        state.queues = cached;
        for (const queueName of cached) {
          this.ensureQueueEvents(state, queueName);
        }
        void this.runScan(redisInstanceId);
        return cached;
      }
    }

    return this.runScan(redisInstanceId);
  }

  private async runScan(redisInstanceId: string): Promise<string[]> {
    const state = this.instances.get(redisInstanceId);
    if (!state) return [];

    const connection = this.pool.getConnection(state.config);
    const current = await discoverQueues(connection, state.config.bullmqPrefix);
    const { added, removed } = diffQueues(state.queues, current);

    state.queues = current;
    state.lastScannedAt = Date.now();

    await this.discoveryCache.set(
      redisInstanceId,
      current,
      DISCOVERY_CACHE_TTL_SEC,
    );

    for (const queueName of removed) {
      state.metaCache.delete(queueName);
      void this.removeQueueEvents(state, queueName);
      this.emit(`redis:${redisInstanceId}`, "queue:removed", { queueName });
    }
    for (const queueName of added) {
      this.ensureQueueEvents(state, queueName);
      this.emit(`redis:${redisInstanceId}`, "queue:added", { queueName });
    }

    if (added.length > 0) {
      void this.warmQueueMeta(redisInstanceId, added);
    }

    return current;
  }

  private getPoolContext(redisInstanceId: string) {
    return {
      instance: this.queuePool,
      redisInstanceId,
    };
  }

  private async fetchQueueMetaFromRedis(
    redisInstanceId: string,
    queueName: string,
  ): Promise<QueueMeta> {
    const state = this.instances.get(redisInstanceId);
    if (!state) throw new Error("Redis instance not connected");

    const connection = this.pool.getConnection(state.config);
    return getQueueMeta(
      connection,
      queueName,
      state.config.bullmqPrefix,
      this.getPoolContext(redisInstanceId),
    );
  }

  private setMetaCache(
    redisInstanceId: string,
    queueName: string,
    meta: QueueMeta,
  ): void {
    const state = this.instances.get(redisInstanceId);
    if (!state) return;
    state.metaCache.set(queueName, { meta, updatedAt: Date.now() });
  }

  async warmQueueMeta(
    redisInstanceId: string,
    queueNames: string[],
    forceRefresh = false,
  ): Promise<void> {
    if (queueNames.length === 0) return;

    const state = this.instances.get(redisInstanceId);
    if (!state) return;

    const toFetch = forceRefresh
      ? queueNames
      : queueNames.filter((name) => !state.metaCache.has(name));

    if (toFetch.length === 0) return;

    // Deduplicate against any in-flight warm for the same instance.
    const warmingKey = redisInstanceId;
    const inFlight = this.metaWarming.get(warmingKey);
    if (inFlight) {
      await inFlight;
      return;
    }

    const promise = (async () => {
      const connection = this.pool.getConnection(state.config);
      try {
        const metas = await getQueueMetaBatch(
          connection,
          toFetch,
          state.config.bullmqPrefix,
        );
        for (const meta of metas) {
          this.setMetaCache(redisInstanceId, meta.name, meta);
        }
      } catch (error) {
        this.logger.warn(
          { error, redisId: redisInstanceId, queueCount: toFetch.length },
          "Failed to warm queue meta batch",
        );
      }
    })();

    this.metaWarming.set(warmingKey, promise);
    try {
      await promise;
    } finally {
      this.metaWarming.delete(warmingKey);
    }
  }

  async listQueueMeta(
    redisInstanceId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<QueueMeta[]> {
    const names = await this.ensureQueuesDiscovered(redisInstanceId);
    const state = this.instances.get(redisInstanceId);
    if (!state) return [];

    const missing = options?.forceRefresh
      ? names
      : names.filter((name) => !state.metaCache.has(name));

    if (missing.length > 0) {
      await this.warmQueueMeta(redisInstanceId, missing, options?.forceRefresh);
    }

    return names
      .map((name) => state.metaCache.get(name)?.meta)
      .filter((meta): meta is QueueMeta => meta != null);
  }

  async getCachedQueueMeta(
    redisInstanceId: string,
    queueName: string,
    options?: { forceRefresh?: boolean },
  ): Promise<QueueMeta> {
    const state = this.instances.get(redisInstanceId);
    if (!state) throw new Error("Redis instance not connected");

    const cached = state.metaCache.get(queueName);
    if (cached && !options?.forceRefresh) {
      return cached.meta;
    }

    const meta = await this.fetchQueueMetaFromRedis(redisInstanceId, queueName);
    this.setMetaCache(redisInstanceId, queueName, meta);
    return meta;
  }

  async getQueueMeta(redisInstanceId: string, queueName: string) {
    return this.getCachedQueueMeta(redisInstanceId, queueName);
  }

  async refreshCounts(redisInstanceId: string, queueName: string): Promise<void> {
    await this.pushCounts(redisInstanceId, queueName);
  }

  getQueueMetrics(
    redisInstanceId: string,
    queueName: string,
    window: Parameters<MetricsAggregator["getMetrics"]>[2] = "1h",
  ) {
    return this.metrics.getMetrics(redisInstanceId, queueName, window);
  }

  getConnection(redisInstanceId: string): {
    connection: RedisConnection;
    prefix: string;
    config: RedisInstanceConfig;
    queuePool: ReturnType<RealtimeManager["getPoolContext"]>;
  } {
    const state = this.instances.get(redisInstanceId);
    if (!state) throw new Error("Redis instance not connected");
    return {
      connection: this.pool.getConnection(state.config),
      prefix: state.config.bullmqPrefix,
      config: state.config,
      queuePool: this.getPoolContext(redisInstanceId),
    };
  }

  async close(): Promise<void> {
    for (const id of this.instances.keys()) {
      await this.unregisterInstance(id);
    }
    await this.queuePool.closeAll();
    await this.pool.closeAll();
  }

  getEventsSince(room: string, lastSeq: number): RoomEvent[] {
    const buffer = this.buffers.get(room) ?? [];
    return buffer.filter((e) => e.seq > lastSeq);
  }

  shouldResync(room: string, lastSeq: number): boolean {
    const buffer = this.buffers.get(room) ?? [];
    if (buffer.length === 0) return lastSeq > 0;
    const oldest = buffer[0]?.seq ?? 0;
    return lastSeq > 0 && lastSeq < oldest - 1;
  }

  private ensureQueueEvents(state: InstanceState, queueName: string): void {
    if (state.queueEvents.has(queueName)) return;

    const queueEvents = new QueueEvents(queueName, {
      connection: this.pool.duplicate(state.config),
      prefix: state.config.bullmqPrefix,
    });

    queueEvents.on("error", (error: Error) => {
      this.logger.error(
        { error, redisId: state.config.id, queueName },
        "QueueEvents error",
      );
    });

    this.attachEventHandlers(state.config, queueEvents, queueName);
    state.queueEvents.set(queueName, queueEvents);

    this.logger.debug(
      { redisId: state.config.id, queueName },
      "Listening to queue events",
    );
  }

  private async removeQueueEvents(
    state: InstanceState,
    queueName: string,
  ): Promise<void> {
    const queueEvents = state.queueEvents.get(queueName);
    if (!queueEvents) return;
    state.queueEvents.delete(queueName);
    await queueEvents.close();
  }

  private attachEventHandlers(
    config: RedisInstanceConfig,
    queueEvents: QueueEvents,
    queueName: string,
  ): void {
    const redisId = config.id;
    const withQueue = (args: Record<string, unknown> = {}) => ({
      ...args,
      queueName,
    });

    const handlers: Array<[string, (args: Record<string, unknown>) => void]> = [
      ["added", (args) => this.onJobEvent(redisId, withQueue(args), "waiting")],
      ["active", (args) => this.onJobEvent(redisId, withQueue(args), "active")],
      ["completed", (args) => this.onCompleted(redisId, withQueue(args))],
      ["failed", (args) => this.onFailed(redisId, withQueue(args))],
      ["progress", (args) => this.onProgress(redisId, withQueue(args))],
      ["delayed", (args) => this.onJobEvent(redisId, withQueue(args), "delayed")],
      ["waiting", (args) => this.onJobEvent(redisId, withQueue(args), "waiting")],
      ["stalled", (args) => this.onStalled(redisId, withQueue(args))],
      ["removed", (args) => this.onRemoved(redisId, withQueue(args))],
      ["paused", () => this.scheduleCountUpdate(redisId, queueName)],
      ["resumed", () => this.scheduleCountUpdate(redisId, queueName)],
    ];

    for (const [event, handler] of handlers) {
      queueEvents.on(event as "added", handler as () => void);
    }
  }

  private onJobEvent(
    redisId: string,
    args: Record<string, unknown>,
    state: string,
  ): void {
    const queueName = String(args.queueName ?? args.name ?? "");
    const jobId = String(args.jobId ?? "");
    if (!queueName || !jobId) return;

    const job: JobSummary = {
      id: jobId,
      name: String(args.name ?? ""),
      state,
      timestamp: Date.now(),
      attemptsMade: Number(args.attemptsMade ?? 0),
    };

    this.emit(`queue:${redisId}:${queueName}`, "job:update", { job });
    this.emit(`job:${redisId}:${queueName}:${jobId}`, "job:update", { job });
    this.scheduleCountUpdate(redisId, queueName);
  }

  private onCompleted(redisId: string, args: Record<string, unknown>): void {
    const queueName = String(args.queueName ?? "");
    const jobId = String(args.jobId ?? "");
    const returnvalue = args.returnvalue;

    let runtimeMs = 0;
    if (
      typeof args.processedOn === "number" &&
      typeof args.finishedOn === "number"
    ) {
      runtimeMs = args.finishedOn - args.processedOn;
    }

    this.metrics.recordCompletion(redisId, queueName, runtimeMs, true);
    this.onJobEvent(redisId, { ...args, name: returnvalue }, "completed");
  }

  private onFailed(redisId: string, args: Record<string, unknown>): void {
    const queueName = String(args.queueName ?? "");
    this.metrics.recordCompletion(redisId, queueName, 0, false);
    this.onJobEvent(redisId, args, "failed");
  }

  private onProgress(redisId: string, args: Record<string, unknown>): void {
    const queueName = String(args.queueName ?? "");
    const jobId = String(args.jobId ?? "");
    this.emit(`job:${redisId}:${queueName}:${jobId}`, "job:progress", {
      progress: args.data,
    });
  }

  private onStalled(redisId: string, args: Record<string, unknown>): void {
    const queueName = String(args.queueName ?? "");
    this.metrics.recordStalled(redisId, queueName);
    this.onJobEvent(redisId, args, "active");
  }

  private onRemoved(redisId: string, args: Record<string, unknown>): void {
    const queueName = String(args.queueName ?? "");
    const jobId = String(args.jobId ?? "");
    this.emit(`queue:${redisId}:${queueName}`, "job:removed", { jobId });
    this.scheduleCountUpdate(redisId, queueName);
  }

  private scheduleCountUpdate(redisId: string, queueName: string): void {
    const key = `${redisId}:${queueName}`;
    const existing = this.countDebounce.get(key);
    if (existing) clearTimeout(existing);

    this.countDebounce.set(
      key,
      setTimeout(() => void this.pushCounts(redisId, queueName), 250),
    );
  }

  private async pushCounts(redisId: string, queueName: string): Promise<void> {
    if (queueName === "*") {
      const state = this.instances.get(redisId);
      if (!state) return;
      await mapWithConcurrency(state.queues, PUSH_COUNTS_CONCURRENCY, (q) =>
        this.pushCounts(redisId, q),
      );
      return;
    }

    try {
      const meta = await this.fetchQueueMetaFromRedis(redisId, queueName);
      this.setMetaCache(redisId, queueName, meta);
      this.metrics.updateCounts(redisId, queueName, meta.counts);
      this.emit(`queue:${redisId}:${queueName}`, "queue:counts", {
        counts: meta.counts,
        isPaused: meta.isPaused,
      });
      this.emit(`queue:${redisId}:${queueName}`, "metrics:update", {
        metrics: this.metrics.getMetrics(redisId, queueName),
      });
    } catch (error) {
      this.logger.error({ error, redisId, queueName }, "Failed to push counts");
    }
  }

  private emit(room: string, type: string, payload: unknown): void {
    const nextSeq = (this.seq.get(room) ?? 0) + 1;
    this.seq.set(room, nextSeq);

    const event: RoomEvent = { seq: nextSeq, type, payload };
    const buffer = this.buffers.get(room) ?? [];
    buffer.push(event);
    if (buffer.length > 1000) buffer.shift();
    this.buffers.set(room, buffer);

    this.io?.to(room).emit("event", { room, ...event });
  }
}
