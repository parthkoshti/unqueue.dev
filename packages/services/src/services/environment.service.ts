import { eq } from "drizzle-orm";
import {
  createId,
  DEFAULT_ENVIRONMENT_NAMES,
} from "@unqueue/shared";
import { environments } from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import type { ServiceDeps } from "../context.js";

const ENVIRONMENT_SORT_ORDER = new Map(
  DEFAULT_ENVIRONMENT_NAMES.map((name, index) => [name, index]),
);

function sortEnvironments<
  T extends { name: string; createdAt: Date },
>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aOrder = ENVIRONMENT_SORT_ORDER.get(
      a.name.toLowerCase() as (typeof DEFAULT_ENVIRONMENT_NAMES)[number],
    );
    const bOrder = ENVIRONMENT_SORT_ORDER.get(
      b.name.toLowerCase() as (typeof DEFAULT_ENVIRONMENT_NAMES)[number],
    );

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function createEnvironmentService(deps: ServiceDeps, logger: Logger) {
  return {
    async list(workspaceId: string) {
      logger.debug({ workspaceId }, "Listing environments");

      const rows = await deps.db
        .select()
        .from(environments)
        .where(eq(environments.workspaceId, workspaceId));

      return sortEnvironments(rows);
    },

    async createDefaults(workspaceId: string) {
      const created = DEFAULT_ENVIRONMENT_NAMES.map((name) => ({
        id: createId(),
        workspaceId,
        name,
      }));

      logger.info(
        { workspaceId, environmentIds: created.map((env) => env.id) },
        "Creating default environments",
      );

      await deps.db.insert(environments).values(created);

      return created;
    },

    async create(input: { workspaceId: string; name: string }) {
      const id = createId();

      logger.info(
        { workspaceId: input.workspaceId, environmentId: id, name: input.name },
        "Creating environment",
      );

      await deps.db.insert(environments).values({
        id,
        workspaceId: input.workspaceId,
        name: input.name,
      });

      return { id };
    },
  };
}

export type EnvironmentService = ReturnType<typeof createEnvironmentService>;
