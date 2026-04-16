import { Database } from "bun:sqlite";
import { drizzle, BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

export type DB = BunSQLiteDatabase<typeof schema> & { $client: Database };

let _db: DB | null = null;
let _sqlite: Database | null = null;

/**
 * Initialise the database connection. Call once at startup with the full path.
 * For tests, pass ":memory:" to get an isolated in-memory database.
 */
export function initDb(path: string): DB {
    _sqlite = new Database(path, { create: true });
    _db = drizzle(_sqlite, { schema });
    return _db;
}

/**
 * Return the active database instance. Throws if initDb has not been called.
 */
export function getDb(): DB {
    if (!_db) {
        throw new Error("Database not initialised — call initDb() first");
    }
    return _db;
}

/**
 * Close the database connection. Used for graceful shutdown and test teardown.
 */
export function closeDb(): void {
    _sqlite?.close();
    _sqlite = null;
    _db = null;
}
