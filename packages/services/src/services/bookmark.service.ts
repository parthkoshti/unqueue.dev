import {
  getJobLogs,
  getJobPayload,
  getJobProgress,
  getJobState,
} from "@unqueue/bullmq";
import { and, count, desc, eq, or } from "drizzle-orm";
import {
  bookmarkFolders,
  bookmarkNotes,
  bookmarks,
  users,
} from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import {
  createId,
  type JobBookmarkSnapshot,
  type JobBookmarkTargetRef,
} from "@unqueue/shared";
import type { ServiceDeps } from "../context.js";
import { forbidden, notFound } from "../errors.js";
import { assertRedisInstanceAccess, assertWorkspaceAccess } from "../rbac.js";
import type { Actor } from "../types.js";

function assertCanModifyBookmarks(actor: Actor) {
  if (!actor.membership || actor.membership.role === "viewer") {
    forbidden();
  }
}

export function createBookmarkService(deps: ServiceDeps, logger: Logger) {
  async function getFolder(folderId: string) {
    const [folder] = await deps.db
      .select()
      .from(bookmarkFolders)
      .where(eq(bookmarkFolders.id, folderId))
      .limit(1);

    if (!folder) notFound("Folder");
    return folder;
  }

  async function assertFolderReadable(actor: Actor, folderId: string) {
    const folder = await getFolder(folderId);
    await assertWorkspaceAccess(
      deps.db,
      actor.userId,
      folder.workspaceId,
      "viewer",
    );

    if (!folder.isShared && folder.createdBy !== actor.userId) {
      forbidden();
    }

    return folder;
  }

  async function assertFolderWritable(actor: Actor, folderId: string) {
    const folder = await assertFolderReadable(actor, folderId);
    assertCanModifyBookmarks(actor);
    return folder;
  }

  async function assertFolderCreator(actor: Actor, folderId: string) {
    const folder = await assertFolderReadable(actor, folderId);
    if (folder.createdBy !== actor.userId) {
      forbidden();
    }
    return folder;
  }

  async function getBookmarkRow(bookmarkId: string) {
    const [bookmark] = await deps.db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId))
      .limit(1);

    if (!bookmark) notFound("Bookmark");
    return bookmark;
  }

  async function captureJobSnapshot(
    actor: Actor,
    input: {
      redisInstanceId: string;
      queueName: string;
      jobId: string;
      environmentId: string;
    },
  ): Promise<{
    targetRef: JobBookmarkTargetRef;
    snapshot: JobBookmarkSnapshot;
  }> {
    const instance = await assertRedisInstanceAccess(
      deps.db,
      actor.userId,
      input.redisInstanceId,
      "viewer",
    );

    if (instance.environmentId !== input.environmentId) {
      forbidden("Environment mismatch");
    }

    await deps.redisInstances.ensureRegistered(input.redisInstanceId);

    const { connection, prefix } = deps.realtime.getConnection(
      input.redisInstanceId,
    );

    const [job, payload, progress, logs] = await Promise.all([
      getJobState(connection, input.queueName, prefix, input.jobId),
      getJobPayload(connection, input.queueName, prefix, input.jobId),
      getJobProgress(connection, input.queueName, prefix, input.jobId),
      getJobLogs(connection, input.queueName, prefix, input.jobId),
    ]);

    if (!job) notFound("Job");

    return {
      targetRef: {
        redisInstanceId: input.redisInstanceId,
        queueName: input.queueName,
        jobId: input.jobId,
        environmentId: input.environmentId,
      },
      snapshot: {
        capturedAt: new Date().toISOString(),
        job,
        payload,
        progress,
        logs,
      },
    };
  }

  return {
    async listFolders(actor: Actor, workspaceId: string) {
      await assertWorkspaceAccess(deps.db, actor.userId, workspaceId, "viewer");

      logger.debug({ workspaceId }, "Listing bookmark folders");

      return deps.db
        .select({
          id: bookmarkFolders.id,
          workspaceId: bookmarkFolders.workspaceId,
          name: bookmarkFolders.name,
          isShared: bookmarkFolders.isShared,
          createdBy: bookmarkFolders.createdBy,
          createdAt: bookmarkFolders.createdAt,
        })
        .from(bookmarkFolders)
        .where(
          and(
            eq(bookmarkFolders.workspaceId, workspaceId),
            or(
              eq(bookmarkFolders.createdBy, actor.userId),
              eq(bookmarkFolders.isShared, true),
            ),
          ),
        )
        .orderBy(bookmarkFolders.name);
    },

    async createFolder(
      actor: Actor,
      input: { workspaceId: string; name: string; isShared?: boolean },
    ) {
      await assertWorkspaceAccess(
        deps.db,
        actor.userId,
        input.workspaceId,
        "member",
      );

      const id = createId();

      logger.info(
        { workspaceId: input.workspaceId, folderId: id },
        "Creating bookmark folder",
      );

      await deps.db.insert(bookmarkFolders).values({
        id,
        workspaceId: input.workspaceId,
        name: input.name.trim(),
        isShared: input.isShared ?? false,
        createdBy: actor.userId,
      });

      return { id };
    },

    async updateFolder(
      actor: Actor,
      input: { id: string; name?: string; isShared?: boolean },
    ) {
      await assertFolderCreator(actor, input.id);

      const updates: Partial<typeof bookmarkFolders.$inferInsert> = {};
      if (input.name !== undefined) {
        updates.name = input.name.trim();
      }
      if (input.isShared !== undefined) {
        updates.isShared = input.isShared;
      }

      if (Object.keys(updates).length === 0) {
        return { ok: true as const };
      }

      logger.info({ folderId: input.id }, "Updating bookmark folder");

      await deps.db
        .update(bookmarkFolders)
        .set(updates)
        .where(eq(bookmarkFolders.id, input.id));

      return { ok: true as const };
    },

    async deleteFolder(actor: Actor, id: string) {
      await assertFolderCreator(actor, id);

      logger.info({ folderId: id }, "Deleting bookmark folder");

      await deps.db.delete(bookmarkFolders).where(eq(bookmarkFolders.id, id));
      return { ok: true as const };
    },

    async listBookmarks(actor: Actor, input: { workspaceId: string; folderId: string }) {
      const folder = await assertFolderReadable(actor, input.folderId);
      if (folder.workspaceId !== input.workspaceId) {
        forbidden();
      }

      logger.debug(
        { workspaceId: input.workspaceId, folderId: input.folderId },
        "Listing bookmarks",
      );

      const rows = await deps.db
        .select({
          id: bookmarks.id,
          workspaceId: bookmarks.workspaceId,
          folderId: bookmarks.folderId,
          targetType: bookmarks.targetType,
          targetRef: bookmarks.targetRef,
          snapshot: bookmarks.snapshot,
          createdBy: bookmarks.createdBy,
          createdAt: bookmarks.createdAt,
          creatorName: users.name,
          creatorEmail: users.email,
          noteCount: count(bookmarkNotes.id),
        })
        .from(bookmarks)
        .innerJoin(users, eq(users.id, bookmarks.createdBy))
        .leftJoin(bookmarkNotes, eq(bookmarkNotes.bookmarkId, bookmarks.id))
        .where(eq(bookmarks.folderId, input.folderId))
        .groupBy(
          bookmarks.id,
          bookmarks.workspaceId,
          bookmarks.folderId,
          bookmarks.targetType,
          bookmarks.targetRef,
          bookmarks.snapshot,
          bookmarks.createdBy,
          bookmarks.createdAt,
          users.id,
          users.name,
          users.email,
        )
        .orderBy(desc(bookmarks.createdAt));

      return rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspaceId,
        folderId: row.folderId,
        targetType: row.targetType,
        targetRef: row.targetRef as JobBookmarkTargetRef,
        snapshot: row.snapshot as JobBookmarkSnapshot,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        creator: {
          id: row.createdBy,
          name: row.creatorName,
          email: row.creatorEmail,
        },
        noteCount: Number(row.noteCount),
      }));
    },

    async getBookmark(actor: Actor, id: string) {
      const bookmark = await getBookmarkRow(id);
      await assertFolderReadable(actor, bookmark.folderId);

      const [creator] = await deps.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, bookmark.createdBy))
        .limit(1);

      const notes = await deps.db
        .select({
          id: bookmarkNotes.id,
          bookmarkId: bookmarkNotes.bookmarkId,
          userId: bookmarkNotes.userId,
          body: bookmarkNotes.body,
          createdAt: bookmarkNotes.createdAt,
          updatedAt: bookmarkNotes.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
        })
        .from(bookmarkNotes)
        .innerJoin(users, eq(users.id, bookmarkNotes.userId))
        .where(eq(bookmarkNotes.bookmarkId, id))
        .orderBy(bookmarkNotes.createdAt);

      return {
        id: bookmark.id,
        workspaceId: bookmark.workspaceId,
        folderId: bookmark.folderId,
        targetType: bookmark.targetType,
        targetRef: bookmark.targetRef as JobBookmarkTargetRef,
        snapshot: bookmark.snapshot as JobBookmarkSnapshot,
        createdBy: bookmark.createdBy,
        createdAt: bookmark.createdAt,
        creator: creator ?? {
          id: bookmark.createdBy,
          name: null,
          email: "",
        },
        notes: notes.map((note) => ({
          id: note.id,
          bookmarkId: note.bookmarkId,
          userId: note.userId,
          body: note.body,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          author: {
            id: note.userId,
            name: note.authorName,
            email: note.authorEmail,
          },
        })),
      };
    },

    async createBookmark(
      actor: Actor,
      input: {
        workspaceId: string;
        folderId: string;
        redisInstanceId: string;
        queueName: string;
        jobId: string;
        environmentId: string;
      },
    ) {
      const folder = await assertFolderWritable(actor, input.folderId);
      if (folder.workspaceId !== input.workspaceId) {
        forbidden();
      }

      const { targetRef, snapshot } = await captureJobSnapshot(actor, input);
      const id = createId();

      logger.info(
        {
          workspaceId: input.workspaceId,
          bookmarkId: id,
          folderId: input.folderId,
          jobId: input.jobId,
        },
        "Creating bookmark",
      );

      await deps.db.insert(bookmarks).values({
        id,
        workspaceId: input.workspaceId,
        folderId: input.folderId,
        targetType: "job",
        targetRef,
        snapshot,
        createdBy: actor.userId,
      });

      return { id };
    },

    async deleteBookmark(actor: Actor, id: string) {
      const bookmark = await getBookmarkRow(id);
      await assertFolderWritable(actor, bookmark.folderId);

      logger.info({ bookmarkId: id }, "Deleting bookmark");

      await deps.db.delete(bookmarks).where(eq(bookmarks.id, id));
      return { ok: true as const };
    },

    async createNote(actor: Actor, input: { bookmarkId: string; body: string }) {
      const bookmark = await getBookmarkRow(input.bookmarkId);
      await assertFolderWritable(actor, bookmark.folderId);

      const body = input.body.trim();
      if (!body) {
        forbidden("Note cannot be empty");
      }

      const id = createId();

      logger.info({ bookmarkId: input.bookmarkId, noteId: id }, "Creating bookmark note");

      await deps.db.insert(bookmarkNotes).values({
        id,
        bookmarkId: input.bookmarkId,
        userId: actor.userId,
        body,
      });

      return { id };
    },

    async updateNote(actor: Actor, input: { id: string; body: string }) {
      const [note] = await deps.db
        .select()
        .from(bookmarkNotes)
        .where(eq(bookmarkNotes.id, input.id))
        .limit(1);

      if (!note) notFound("Note");
      if (note.userId !== actor.userId) forbidden();

      const bookmark = await getBookmarkRow(note.bookmarkId);
      await assertFolderReadable(actor, bookmark.folderId);
      assertCanModifyBookmarks(actor);

      const body = input.body.trim();
      if (!body) {
        forbidden("Note cannot be empty");
      }

      await deps.db
        .update(bookmarkNotes)
        .set({ body, updatedAt: new Date() })
        .where(eq(bookmarkNotes.id, input.id));

      return { ok: true as const };
    },

    async deleteNote(actor: Actor, id: string) {
      const [note] = await deps.db
        .select()
        .from(bookmarkNotes)
        .where(eq(bookmarkNotes.id, id))
        .limit(1);

      if (!note) notFound("Note");
      if (note.userId !== actor.userId) forbidden();

      const bookmark = await getBookmarkRow(note.bookmarkId);
      await assertFolderReadable(actor, bookmark.folderId);
      assertCanModifyBookmarks(actor);

      await deps.db.delete(bookmarkNotes).where(eq(bookmarkNotes.id, id));
      return { ok: true as const };
    },
  };
}

export type BookmarkService = ReturnType<typeof createBookmarkService>;
