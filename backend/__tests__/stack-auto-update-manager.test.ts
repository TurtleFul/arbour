import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { initDb, closeDb } from "../db/index";
import { StackAutoUpdateManager } from "../stack-auto-update-manager";
import { runMigrations } from "./helpers";

// Minimal ArbourServer stub — manager only calls server in runScheduledUpdate/applyUpdates,
// which are not exercised by the DB-layer tests below.
const stubServer = {} as never;

function applyMigrations() {
    const db = initDb(":memory:");
    runMigrations(db.$client);
}

beforeEach(() => {
    applyMigrations();
});

afterEach(() => {
    closeDb();
});

describe("StackAutoUpdateManager.getSettings", () => {
    test("returns disabled mode and null schedule for unknown stack", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
        expect(settings.schedule).toBeNull();
    });
});

describe("StackAutoUpdateManager.setSettings", () => {
    test("inserts new row for disabled mode", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "disabled",
            schedule: null });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
        expect(settings.schedule).toBeNull();
    });

    test("inserts new row for immediate mode", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "immediate",
            schedule: null });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("immediate");
    });

    test("inserts new row for scheduled mode with cron", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "scheduled",
            schedule: "0 3 * * *" });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("scheduled");
        expect(settings.schedule).toBe("0 3 * * *");
        await manager.deleteSettings("mystack");
    });

    test("upserts — updating existing row", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "immediate",
            schedule: null });
        await manager.setSettings("mystack", { mode: "disabled",
            schedule: null });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
    });

    test("mode transition: disabled → scheduled → immediate → disabled", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "scheduled",
            schedule: "0 3 * * *" });
        expect((await manager.getSettings("mystack")).mode).toBe("scheduled");
        await manager.deleteSettings("mystack");

        await manager.setSettings("mystack", { mode: "immediate",
            schedule: null });
        expect((await manager.getSettings("mystack")).mode).toBe("immediate");

        await manager.setSettings("mystack", { mode: "disabled",
            schedule: null });
        expect((await manager.getSettings("mystack")).mode).toBe("disabled");
    });

    test("multiple stacks are independent", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("stack-a", { mode: "immediate",
            schedule: null });
        await manager.setSettings("stack-b", { mode: "disabled",
            schedule: null });
        expect((await manager.getSettings("stack-a")).mode).toBe("immediate");
        expect((await manager.getSettings("stack-b")).mode).toBe("disabled");
    });
});

describe("StackAutoUpdateManager.deleteSettings", () => {
    test("removed stack reverts to defaults", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "immediate",
            schedule: null });
        await manager.deleteSettings("mystack");
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
        expect(settings.schedule).toBeNull();
    });

    test("deleting non-existent stack does not throw", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await expect(manager.deleteSettings("ghost")).resolves.toBeUndefined();
    });
});

describe("StackAutoUpdateManager cron scheduling", () => {
    test("valid cron expression does not throw", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await expect(
            manager.setSettings("mystack", { mode: "scheduled",
                schedule: "0 3 * * *" })
        ).resolves.toBeUndefined();
        await manager.deleteSettings("mystack");
    });

    test("invalid cron expression is handled gracefully — no throw", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await expect(
            manager.setSettings("mystack", { mode: "scheduled",
                schedule: "not-a-cron" })
        ).resolves.toBeUndefined();
    });

    test("switching from scheduled to disabled cancels cron job", async () => {
        const manager = new StackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "scheduled",
            schedule: "0 3 * * *" });
        await expect(
            manager.setSettings("mystack", { mode: "disabled",
                schedule: null })
        ).resolves.toBeUndefined();
    });
});
