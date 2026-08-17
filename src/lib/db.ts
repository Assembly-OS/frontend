import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// Каталог данных задаётся снаружи: в образе это /data — постоянный том,
// смонтированный рядом с /data/uploads. Без переменной база уходит в
// /app/data, то есть в эфемерный слой контейнера: файлы вложений
// переживают перезапуск, а строки в базе — нет. Расхождение состояния
// хуже честного падения.
const DB_DIR =
  process.env.ASSAMBLEYA_DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "assambleya.db");

type Global = typeof globalThis & { __assambleyaDb?: DatabaseSync };

/**
 * The backend owns schema creation and migrations. The frontend deliberately
 * refuses to create an empty database: starting it before backend readiness
 * would otherwise produce a second, incomplete source of truth. It also has no
 * `db/schema.sql` to read — the image ships only the built app — so reaching
 * for one here fails every page that touches the database.
 */
function open(): DatabaseSync {
  if (!fs.existsSync(/* turbopackIgnore: true */ DB_PATH)) {
    throw new Error(
      "The platform database is not initialized; wait for backend readiness.",
    );
  }

  const database = new DatabaseSync(DB_PATH);

  // node:sqlite does not enable these by default. Set them before any query:
  //  - WAL: concurrent readers never block the single writer.
  //  - foreign_keys: the schema's relationships are actually enforced.
  //  - busy_timeout: a contended write waits instead of throwing SQLITE_BUSY.
  //  - synchronous NORMAL: the safe, fast pairing with WAL.
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
  `);

  return database;
}

/**
 * One connection per process, parked on globalThis so Next's dev-mode module
 * reloading does not leak a new SQLite handle on every edit.
 */
export function db(): DatabaseSync {
  const g = globalThis as Global;
  if (!g.__assambleyaDb) g.__assambleyaDb = open();
  return g.__assambleyaDb;
}

type Param = string | number | null | bigint | Uint8Array;

/**
 * node:sqlite hands back null-prototype objects, which React refuses to pass
 * from a Server Component to a Client Component. Copy into plain objects once,
 * here, so every caller gets serialisable rows.
 */
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

/** `YYYY-MM-DD HH:MM:SS` in UTC — the format every timestamp column uses. */
export function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
