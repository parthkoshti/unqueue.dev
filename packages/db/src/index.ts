import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import * as schema from "./schema/index.js";

export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export async function runMigrations(connectionString: string) {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "../drizzle");
  await migrate(db, { migrationsFolder });
  await client.end();
}

export type Database = ReturnType<typeof createDb>;
export * from "./schema/index.js";
