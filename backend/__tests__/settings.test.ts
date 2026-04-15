import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { initDb, getDb, closeDb } from "../db/index";
import { Settings } from "../settings";

import migration0000 from "../db/migrations/0000_baseline.sql" with { type: "text" };

function applyMigrations() {
    const db = getDb();
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
}

beforeEach(() => {
    initDb(":memory:");
    applyMigrations();
    // Reset the settings cache between tests
    Settings.cacheList = {};
    Settings.stopCacheCleaner();
});

afterEach(() => {
    Settings.stopCacheCleaner();
    closeDb();
});

// ---------------------------------------------------------------------------
// get / set round-trip
// ---------------------------------------------------------------------------

describe("Settings.get / Settings.set", () => {
    test("returns null for a key that does not exist", async () => {
        expect(await Settings.get("nonexistent")).toBeNull();
    });

    test("round-trips a string value", async () => {
        await Settings.set("myKey", "hello");
        expect(await Settings.get("myKey")).toBe("hello");
    });

    test("round-trips a number value", async () => {
        await Settings.set("port", 8080);
        expect(await Settings.get("port")).toBe(8080);
    });

    test("round-trips a boolean value", async () => {
        await Settings.set("flag", true);
        expect(await Settings.get("flag")).toBe(true);
    });

    test("round-trips an object value", async () => {
        await Settings.set("obj", { a: 1, b: "two" });
        const result = await Settings.get("obj");
        expect(result).toEqual({ a: 1, b: "two" });
    });

    test("overwrites an existing value", async () => {
        await Settings.set("myKey", "first");
        await Settings.set("myKey", "second");
        expect(await Settings.get("myKey")).toBe("second");
    });
});

// ---------------------------------------------------------------------------
// Cache behaviour
// ---------------------------------------------------------------------------

describe("Settings cache", () => {
    test("cache is populated after a get", async () => {
        await Settings.set("cached", "value");
        await Settings.get("cached");
        expect("cached" in Settings.cacheList).toBe(true);
    });

    test("deleteCache removes entry", async () => {
        await Settings.set("cached", "value");
        await Settings.get("cached");
        Settings.deleteCache(["cached"]);
        expect("cached" in Settings.cacheList).toBe(false);
    });

    test("set invalidates cache for that key", async () => {
        await Settings.set("k", "v1");
        await Settings.get("k");               // populates cache
        await Settings.set("k", "v2");         // should bust cache
        expect("k" in Settings.cacheList).toBe(false);
        expect(await Settings.get("k")).toBe("v2");
    });
});

// ---------------------------------------------------------------------------
// getSettings / setSettings
// ---------------------------------------------------------------------------

describe("Settings.getSettings / Settings.setSettings", () => {
    test("returns an empty object when no settings of that type exist", async () => {
        const result = await Settings.getSettings("general");
        expect(result).toEqual({});
    });

    test("stores and retrieves settings by type", async () => {
        await Settings.setSettings("general", { theme: "dark", lang: "en" });
        const result = await Settings.getSettings("general");
        expect(result.theme).toBe("dark");
        expect(result.lang).toBe("en");
    });

    test("setSettings does not overwrite a key belonging to a different type", async () => {
        await Settings.setSettings("general", { sharedKey: "general-value" });
        // Attempt to update same key under a different type — should be a no-op
        await Settings.setSettings("other", { sharedKey: "other-value" });
        const result = await Settings.getSettings("general");
        expect(result.sharedKey).toBe("general-value");
    });

    test("multiple types are isolated", async () => {
        await Settings.setSettings("general", { a: 1 });
        await Settings.setSettings("notifications", { b: 2 });
        const general = await Settings.getSettings("general");
        const notifs = await Settings.getSettings("notifications");
        expect(general).not.toHaveProperty("b");
        expect(notifs).not.toHaveProperty("a");
    });

    test("updates an existing setting within the same type", async () => {
        await Settings.setSettings("general", { theme: "light" });
        await Settings.setSettings("general", { theme: "dark" });
        const result = await Settings.getSettings("general");
        expect(result.theme).toBe("dark");
    });
});
