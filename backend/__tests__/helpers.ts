import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import type { DB } from "../db/index";

import migration0000 from "../db/migrations/0000_baseline.sql" with { type: "text" };
import migration0001 from "../db/migrations/0001_stack_auto_update.sql" with { type: "text" };

const allMigrations = [ migration0000, migration0001 ];

function runMigrations(sqlite: Database) {
    for (const migration of allMigrations) {
        const statements = migration
            .split("\n")
            .filter((line: string) => !line.trim().startsWith("--"))
            .join("\n")
            .split(";")
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        for (const statement of statements) {
            sqlite.run(statement);
        }
    }
}

/**
 * Create an isolated in-memory SQLite database with all migrations applied.
 * Each call returns a fresh database — tests are fully isolated.
 */
export function createTestDb(): DB {
    const sqlite = new Database(":memory:");
    const db = drizzle(sqlite, { schema });
    runMigrations(sqlite);
    return db;
}

export { runMigrations, allMigrations };
