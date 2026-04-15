import { log } from "./log";
import { initDb, closeDb, getDb } from "./db/index";
import fs from "fs";
import path from "path";
import { sleep } from "../common/util-common";

// Dynamically import migration SQL at startup
import migration0000 from "./db/migrations/0000_baseline.sql" with { type: "text" };

interface DBConfig {
    type?: "sqlite";
}

export class Database {
    /**
     * SQLite file path (Default: ./data/arbour.db)
     */
    static sqlitePath: string;

    static dbConfig: DBConfig = {};

    static async init(dataDir: string) {
        log.debug("server", "Connecting to the database");

        const dbConfig = Database.readOrCreateConfig(dataDir);
        Database.dbConfig = dbConfig;

        log.info("db", `Database Type: ${dbConfig.type}`);

        if (dbConfig.type === "sqlite") {
            Database.sqlitePath = path.join(dataDir, "arbour.db");
        } else {
            throw new Error("Unknown Database type: " + dbConfig.type);
        }

        initDb(Database.sqlitePath);
        log.info("server", "Connected to the database");

        await Database.migrate();
        await Database.pragmas();
    }

    private static readOrCreateConfig(dataDir: string): DBConfig {
        const configPath = path.join(dataDir, "db-config.json");
        try {
            const raw = fs.readFileSync(configPath).toString("utf-8");
            const parsed = JSON.parse(raw);
            if (typeof parsed !== "object" || typeof parsed.type !== "string") {
                throw new Error("Invalid db-config.json");
            }
            return parsed as DBConfig;
        } catch (err) {
            if (err instanceof Error) {
                log.warn("db", err.message);
            }
            const config: DBConfig = { type: "sqlite" };
            fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
            return config;
        }
    }

    /**
     * Run the baseline SQL migration. Uses IF NOT EXISTS throughout, so it is
     * safe to run against both fresh databases and existing ones that were
     * previously managed by Knex.
     */
    static async migrate() {
        const db = getDb();
        try {
            // Strip comment lines, then split on statement boundaries
            const statements = migration0000
                .split("\n")
                .filter((line: string) => !line.trim().startsWith("--"))
                .join("\n")
                .split(";")
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0);

            for (const statement of statements) {
                db.$client.run(statement);
            }
            log.debug("db", "Migrations applied");
        } catch (e) {
            log.error("db", "Migration failed");
            throw e;
        }
    }

    /** Apply recommended SQLite PRAGMAs for performance and durability. */
    static async pragmas() {
        const db = getDb();
        db.$client.run("PRAGMA foreign_keys = ON");
        db.$client.run("PRAGMA journal_mode = WAL");
        db.$client.run("PRAGMA cache_size = -12000");
        db.$client.run("PRAGMA auto_vacuum = INCREMENTAL");
        db.$client.run("PRAGMA synchronous = NORMAL");

        log.debug("db", "SQLite journal_mode: " + (db.$client.query("PRAGMA journal_mode").get() as Record<string, string>)["journal_mode"]);
        log.debug("db", "SQLite cache_size:   " + (db.$client.query("PRAGMA cache_size").get() as Record<string, number>)["cache_size"]);
        log.debug("db", "SQLite Version: " + (db.$client.query("SELECT sqlite_version()").get() as Record<string, string>)["sqlite_version()"]);
    }

    static async close() {
        log.info("db", "Closing the database");

        const db = getDb();
        try {
            db.$client.run("PRAGMA wal_checkpoint(TRUNCATE)");
        } catch (_) {
            // best-effort flush
        }

        await sleep(100);
        closeDb();
        log.info("db", "Database closed");
    }

    static getSize(): number {
        if (Database.dbConfig.type === "sqlite") {
            log.debug("db", "Database.getSize()");
            const stats = fs.statSync(Database.sqlitePath);
            return stats.size;
        }
        return 0;
    }

    static async shrink() {
        if (Database.dbConfig.type === "sqlite") {
            getDb().$client.run("VACUUM");
        }
    }
}
