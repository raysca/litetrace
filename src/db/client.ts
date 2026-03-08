import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { config } from "../config";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const dbPath = config.database.path === ":memory:"
      ? ":memory:"
      : join(process.cwd(), config.database.path);
    const sqlite = new Database(dbPath);
    sqlite.exec("PRAGMA journal_mode=WAL;");
    sqlite.exec("PRAGMA foreign_keys=ON;");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA journal_mode=WAL;");
  sqlite.exec("PRAGMA foreign_keys=ON;");
  return drizzle(sqlite, { schema });
}
