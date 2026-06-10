import { os } from "@orpc/server";
import { z } from "zod";
import { createId, ROLES } from "@unstall/shared";
import { alertConditionSchema, redisInstanceInputSchema } from "@unstall/validators";
import { authed, requireRole } from "./middleware.js";
import { forbidden, notFound } from "./errors.js";
import type { ORPCContext } from "./context.js";

const base = os.$context<ORPCContext>();

export const workspaceRouter = {
  list: base
    .use(authed)
    .handler(async ({ context }) => {
      const { db, user } = context;
      const { workspaceMembers, workspaces } = await import("@unstall/db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          role: workspaceMembers.role,
          createdAt: workspaces.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, user!.id));

      return rows;
    }),

  get: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const { db } = context;
      const { workspaces } = await import("@unstall/db/schema");
      const { eq } = await import("drizzle-orm");

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.workspaceId))
        .limit(1);

      if (!workspace) notFound("Workspace");
      return workspace;
    }),

  update: base
    .input(z.object({ workspaceId: z.string().length(24), name: z.string().min(1) }))
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { db } = context;
      const { workspaces } = await import("@unstall/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(workspaces)
        .set({ name: input.name })
        .where(eq(workspaces.id, input.workspaceId));

      return { ok: true as const };
    }),
};

export const membersRouter = {
  list: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const { db } = context;
      const { users, workspaceMembers } = await import("@unstall/db/schema");
      const { eq } = await import("drizzle-orm");

      return db
        .select({
          id: workspaceMembers.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: workspaceMembers.role,
          createdAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, input.workspaceId));
    }),

  invite: base
    .input(
      z.object({
        workspaceId: z.string().length(24),
        email: z.string().email(),
        role: z.enum(ROLES).refine((r) => r !== "owner", "Cannot invite as owner"),
      }),
    )
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { db, user } = context;
      const { workspaceInvites } = await import("@unstall/db/schema");
      const { createHash, randomBytes } = await import("node:crypto");

      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const id = createId();

      await db.insert(workspaceInvites).values({
        id,
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: user!.id,
      });

      const platformURL = process.env.PLATFORM_URL ?? "http://localhost:5174";
      const inviteUrl = `${platformURL}/invite/${token}`;

      return { inviteUrl, id };
    }),
};

export const environmentRouter = {
  list: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const { db } = context;
      const { environments } = await import("@unstall/db/schema");
      const { eq } = await import("drizzle-orm");

      return db
        .select()
        .from(environments)
        .where(eq(environments.workspaceId, input.workspaceId));
    }),

  create: base
    .input(
      z.object({
        workspaceId: z.string().length(24),
        name: z.string().min(1),
      }),
    )
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { db } = context;
      const { environments } = await import("@unstall/db/schema");
      const id = createId();

      await db.insert(environments).values({
        id,
        workspaceId: input.workspaceId,
        name: input.name,
      });

      return { id };
    }),
};

export const router = {
  workspace: workspaceRouter,
  members: membersRouter,
  environment: environmentRouter,
};

export type AppRouter = typeof router;
