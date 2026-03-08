import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { getDb } from "./client";

export async function runMigrations() {
  const db = getDb();
  migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("✓ Database migrations applied");
}
