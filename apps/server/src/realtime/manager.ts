import { QueueEvents } from "bullmq";
import {
  ConnectionPool,
  type RedisConnection,
  discoverQueues,
  diffQueues,
  getQueueMeta,
  MetricsAggregator,
  type JobSummary,
  type RedisInstanceConfig,
} from "@unstall/bullmq";
import type { Logger } from "@unstall/logger";
import type { Server as SocketServer } from "socket.io";

type RoomEvent = {
  seq: number;
  type: string;
  payload: unknown;
};

type InstanceState = {
  config: RedisInstanceConfig;
  queues: string[];
  queueEvents: QueueEvents;
  discoveryTimer?: ReturnType<typeof setInterval>;
};

export class RealtimeManager {
  private pool = new ConnectionPool();
  private instances = new Map<string, InstanceState>();
  private seq = new Map<string, number>();
  private buffers = new Map<string, RoomEvent[]>();
  private metrics = new MetricsAggregator();
  private countDebounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private io: SocketServer | null,
    private logger: Logger,
  ) {}

  setSocketServer(io: SocketServer): void {
    this.io = io;
  }

  getMetrics() {
    return this.metrics;
  }

  getQueues(redisInstanceId: string): string[] {
    return this.instances.get(redisInstanceId)?.queues ?? [];
  }

  async registerInstance(config: RedisInstanceConfig): Promise<void> {
    await this.unregisterInstance(config.id);

    const connection = this.pool.getConnection(config);
    const queues = await discoverQueues(connection, config.bullmqPrefix);

    const queueEvents = new QueueEvents("*", {
      connection: this.pool.duplicate(config),
      prefix: config.bullmqPrefix,
    });

    this.attachEventHandlers(config, queueEvents);
    const discoveryTimer = setInterval(
      () => void this.refreshDiscovery(config.id),
      10 * 60 * 1000,
    );

    this.instances.set(config.id, {
      config,
      queues,
      queueEvents,
      discoveryTimer,
    });

    this.logger.info({ redisId: config.id, queueCount: queues.length }, "Registered redis instance");
  }

  async unregisterInstance(redisInstanceId: string): Promise<void> {
    const state = this.instances.get(redisInstanceId);
    if (!state) return;

    if (state.discoveryTimer) clearInterval(state.discoveryTimer);
    await state.queueEvents.close();
    await this.pool.remove(redisInstanceId);
    this.instances.delete(redisInstanceId);
  }

  async refreshDiscovery(redisInstanceId: string): Promise<string[]> {
    const state = this.instances.get(redisInstanceId);
    if (!state) return [];

    const connection = this.pool.getConnection(state.config);
    const current = await discoverQueues(connection, state.config.bullmqPrefix);
    const { added, removed } = diffQueues(state.queues, current);

    state.queues = current;

    for (const queueName of removed) {
      this.emit(`redis:${redisInstanceId}`, "queue:removed", { queueName });
    }
    for (const queueName of added) {
      this.emit(`redis:${redisInstanceId}`, "queue:added", { queueName });
    }

    return current;
  }

  async getQueueMeta(redisInstanceId: string, queueName: string) {
    const state = this.instances.get(redisInstanceId);
    if (!state) throw new Error("Redis instance not connected");

    const connection = this.pool.getConnection(state.config);
    return getQueueMeta(connection, queueName, state.config.bullmqPrefix);
  }

  getConnection(redisInstanceId: string): {
    connection: RedisConnection;
    prefix: string;
    config: RedisInstanceConfig;
  } {
    const state = this.instances.get(redisInstanceId);
    if (!state) throw new Error("Redis instance not connected");
    return {
      connection: this.pool.getConnection(state.config),
      prefix: state.config.bullmqPrefix,
      config: state.config,
    };
  }

  async close(): Promise<void> {
    for (const id of this.instances.keys()) {
      await this.unregisterInstance(id);
    }
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

  private attachEventHandlers(
    config: RedisInstanceConfig,
    queueEvents: QueueEvents,
  ): void {
    const redisId = config.id;

    const handlers: Array<[string, (args: Record<string, unknown>) => void]> = [
      ["added", (args) => this.onJobEvent(redisId, args, "waiting")],
      ["active", (args) => this.onJobEvent(redisId, args, "active")],
      ["completed", (args) => this.onCompleted(redisId, args)],
      ["failed", (args) => this.onFailed(redisId, args)],
      ["progress", (args) => this.onProgress(redisId, args)],
      ["delayed", (args) => this.onJobEvent(redisId, args, "delayed")],
      ["waiting", (args) => this.onJobEvent(redisId, args, "waiting")],
      ["stalled", (args) => this.onStalled(redisId, args)],
      ["removed", (args) => this.onRemoved(redisId, args)],
      ["paused", () => this.scheduleCountUpdate(redisId, "*")],
      ["resumed", () => this.scheduleCountUpdate(redisId, "*")],
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
      for (const q of state.queues) {
        await this.pushCounts(redisId, q);
      }
      return;
    }

    try {
      const meta = await this.getQueueMeta(redisId, queueName);
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
