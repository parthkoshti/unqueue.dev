import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";

export const roleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const redisStatusEnum = pgEnum("redis_status", [
  "connected",
  "disconnected",
  "error",
]);

export const bookmarkTargetEnum = pgEnum("bookmark_target", ["queue", "job"]);

export const alertEventStatusEnum = pgEnum("alert_event_status", [
  "fired",
  "resolved",
]);

export const workspaces = pgTable("workspaces", {
  id: varchar("id", { length: 24 }).primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: varchar("id", { length: 24 }).primaryKey(),
    workspaceId: varchar("workspace_id", { length: 24 })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 24 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_idx").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export const workspaceInvites = pgTable("workspace_invites", {
  id: varchar("id", { length: 24 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 24 })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  invitedBy: varchar("invited_by", { length: 24 })
    .notNull()
    .references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const environments = pgTable("environments", {
  id: varchar("id", { length: 24 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 24 })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const redisInstances = pgTable("redis_instances", {
  id: varchar("id", { length: 24 }).primaryKey(),
  environmentId: varchar("environment_id", { length: 24 })
    .notNull()
    .references(() => environments.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  tls: boolean("tls").notNull().default(false),
  username: text("username"),
  db: integer("db").notNull().default(0),
  tlsServername: text("tls_servername"),
  encryptedCredentials: jsonb("encrypted_credentials").notNull(),
  bullmqPrefix: varchar("bullmq_prefix", { length: 100 }).notNull().default("bull"),
  status: redisStatusEnum("status").notNull().default("disconnected"),
  lastConnectedAt: timestamp("last_connected_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const encryptionKeys = pgTable("encryption_keys", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookmarkFolders = pgTable("bookmark_folders", {
  id: varchar("id", { length: 24 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 24 })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isShared: boolean("is_shared").notNull().default(false),
  createdBy: varchar("created_by", { length: 24 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: varchar("id", { length: 24 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 24 })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  folderId: varchar("folder_id", { length: 24 })
    .notNull()
    .references(() => bookmarkFolders.id, { onDelete: "cascade" }),
  targetType: bookmarkTargetEnum("target_type").notNull(),
  targetRef: jsonb("target_ref").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdBy: varchar("created_by", { length: 24 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookmarkNotes = pgTable("bookmark_notes", {
  id: varchar("id", { length: 24 }).primaryKey(),
  bookmarkId: varchar("bookmark_id", { length: 24 })
    .notNull()
    .references(() => bookmarks.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 24 })
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 24 }).primaryKey(),
  environmentId: varchar("environment_id", { length: 24 })
    .notNull()
    .references(() => environments.id, { onDelete: "cascade" }),
  redisInstanceId: varchar("redis_instance_id", { length: 24 })
    .notNull()
    .references(() => redisInstances.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  queueName: text("queue_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").notNull(),
  encryptedWebhook: jsonb("encrypted_webhook").notNull(),
  intervalMinutes: integer("interval_minutes").notNull().default(15),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const alertEvents = pgTable("alert_events", {
  id: varchar("id", { length: 24 }).primaryKey(),
  alertId: varchar("alert_id", { length: 24 })
    .notNull()
    .references(() => alerts.id, { onDelete: "cascade" }),
  status: alertEventStatusEnum("status").notNull(),
  conditionSnapshot: jsonb("condition_snapshot").notNull(),
  discordMessageId: text("discord_message_id"),
  firedAt: timestamp("fired_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});
