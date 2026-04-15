import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import type { DB } from "../db/index";

// Import the baseline migration SQL
import migration0000 from "../db/migrations/0000_baseline.sql" with { type: "text" };

/**
 * Create an isolated in-memory SQLite database with the schema applied.
 * Each call returns a fresh database — tests are fully isolated.
 */
export function createTestDb(): DB {
    const sqlite = new Database(":memory:");
    const db = drizzle(sqlite, { schema });

    // Apply the baseline migration
    const statements = migration0000
        .split("\n")
        .filter((line: string) => !line.trim().startsWith("--"))
        .join("\n")
        .split(";")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

    for (const statement of statements) {
        sqlite.run(statement);
    }

    return db;
}
