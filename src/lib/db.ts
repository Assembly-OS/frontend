import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DB_DIR =
  process.env.ASSAMBLEYA_DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "assambleya.db");

type Global = typeof globalThis & { __assambleyaDb?: DatabaseSync };

/**
 * The backend owns schema creation and migrations. The frontend deliberately
 * refuses to create an empty database: starting it before backend readiness
 * would otherwise produce a second, incomplete source of truth.
 */
function open(): DatabaseSync {
  if (!fs.existsSync(/* turbopackIgnore: true */ DB_PATH)) {
    throw new Error(
      "The platform database is not initialized; wait for backend readiness.",
    );
  }

  const database = new DatabaseSync(DB_PATH);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
  `);
  return database;
}

export function db(): DatabaseSync {
  const g = globalThis as Global;
  if (!g.__assambleyaDb) g.__assambleyaDb = open();
  return g.__assambleyaDb;
}

type Param = string | number | null | bigint | Uint8Array;

function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

export function all<T>(sql: string, ...params: Param[]): T[] {
  return db()
    .prepare(sql)
    .all(...params)
    .map((row) => plain<T>(row));
}

export function get<T>(sql: string, ...params: Param[]): T | undefined {
  const row = db().prepare(sql).get(...params);
  return row === undefined ? undefined : plain<T>(row);
}

export function run(sql: string, ...params: Param[]) {
  return db().prepare(sql).run(...params);
}

export function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
