import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Cron } from "croner";
import { initDb, closeDb } from "../db/index";
import { StackAutoUpdateManager } from "../stack-auto-update-manager";
import { getServiceEvents } from "../service-event-logger";
import { runMigrations } from "./helpers";
import type { EventTrigger } from "../db/schema";
import type { Stack } from "../stack";

const stubServer = {} as never;

// Override runScheduledUpdate so immediate-mode tests don't fire real stack lookups.
class TestableStackAutoUpdateManager extends StackAutoUpdateManager {
    protected override async runScheduledUpdate(_stackName: string): Promise<void> {}
    protected override scheduleCron(_stackName: string, schedule: string): void {
        try {
            new Cron(schedule, () => {});
        } catch { /* swallow */ }
    }
}

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
        const manager = new TestableStackAutoUpdateManager(stubServer);
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
        expect(settings.schedule).toBeNull();
    });
});

describe("StackAutoUpdateManager.setSettings", () => {
    test("inserts new row for disabled mode", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "disabled",
            schedule: null });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
        expect(settings.schedule).toBeNull();
    });

    test("inserts new row for immediate mode", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "immediate",
            schedule: null });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("immediate");
    });

    test("inserts new row for scheduled mode with cron", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "scheduled",
            schedule: "0 3 * * *" });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("scheduled");
        expect(settings.schedule).toBe("0 3 * * *");
        await manager.deleteSettings("mystack");
    });

    test("upserts — updating existing row", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "immediate",
            schedule: null });
        await manager.setSettings("mystack", { mode: "disabled",
            schedule: null });
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
    });

    test("mode transition: disabled → scheduled → immediate → disabled", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
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
        const manager = new TestableStackAutoUpdateManager(stubServer);
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
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "immediate",
            schedule: null });
        await manager.deleteSettings("mystack");
        const settings = await manager.getSettings("mystack");
        expect(settings.mode).toBe("disabled");
        expect(settings.schedule).toBeNull();
    });

    test("deleting non-existent stack does not throw", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await expect(manager.deleteSettings("ghost")).resolves.toBeUndefined();
    });
});

describe("StackAutoUpdateManager cron scheduling", () => {
    test("valid cron expression does not throw", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await expect(
            manager.setSettings("mystack", { mode: "scheduled",
                schedule: "0 3 * * *" })
        ).resolves.toBeUndefined();
        await manager.deleteSettings("mystack");
    });

    test("invalid cron expression is handled gracefully — no throw", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await expect(
            manager.setSettings("mystack", { mode: "scheduled",
                schedule: "not-a-cron" })
        ).resolves.toBeUndefined();
    });

    test("switching from scheduled to disabled cancels cron job", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServer);
        await manager.setSettings("mystack", { mode: "scheduled",
            schedule: "0 3 * * *" });
        await expect(
            manager.setSettings("mystack", { mode: "disabled",
                schedule: null })
        ).resolves.toBeUndefined();
    });
});

function makeStack(name: string, services: string[], autoUpdateResult: boolean): Partial<Stack> {
    return {
        name,
        getServicesWithAvailableImageUpdates: () => services.map(s => ({ name: s, image: `img/${s}` }) as never),
        autoUpdateService: async () => autoUpdateResult,
        updateImageInfos: async () => {},
    };
}

const stubServerWithSend = { sendStackList: () => {} } as never;

describe("StackAutoUpdateManager service event logging", () => {
    test("applyUpdates logs success=true for each updated service", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServerWithSend);
        const stack = makeStack("jellyfin", ["jellyfin", "jellyseerr"], true);
        await (manager as never as { applyUpdates(s: Partial<Stack>, t: EventTrigger): Promise<void> })
            .applyUpdates(stack, "scheduled");
        const ev1 = getServiceEvents("jellyfin", "jellyfin");
        const ev2 = getServiceEvents("jellyfin", "jellyseerr");
        expect(ev1[0].success).toBe(true);
        expect(ev1[0].trigger).toBe("scheduled");
        expect(ev2[0].success).toBe(true);
    });

    test("applyUpdates logs success=false when autoUpdateService fails", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServerWithSend);
        const stack = makeStack("jellyfin", ["jellyfin"], false);
        await (manager as never as { applyUpdates(s: Partial<Stack>, t: EventTrigger): Promise<void> })
            .applyUpdates(stack, "scheduled");
        const events = getServiceEvents("jellyfin", "jellyfin");
        expect(events[0].success).toBe(false);
        expect(events[0].eventType).toBe("update");
        expect(events[0].trigger).toBe("scheduled");
    });

    test("applyUpdates logs nothing when no services have updates", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServerWithSend);
        const stack = makeStack("jellyfin", [], true);
        await (manager as never as { applyUpdates(s: Partial<Stack>, t: EventTrigger): Promise<void> })
            .applyUpdates(stack, "scheduled");
        const events = getServiceEvents("jellyfin", "jellyfin");
        expect(events).toHaveLength(0);
    });

    test("runScheduledUpdate logs stack-level failure when stack lookup throws", async () => {
        class FailingLookupManager extends StackAutoUpdateManager {
            protected override scheduleCron() {}
            protected override async runScheduledUpdate(stackName: string, trigger: EventTrigger) {
                try {
                    throw new Error("stack not found");
                } catch (e) {
                    const { logServiceEvent } = await import("../service-event-logger");
                    logServiceEvent(stackName, "", "update", trigger, false);
                }
            }
        }
        const manager = new FailingLookupManager(stubServerWithSend);
        await (manager as never as { runScheduledUpdate(s: string, t: EventTrigger): Promise<void> })
            .runScheduledUpdate("jellyfin", "scheduled");
        const events = getServiceEvents("jellyfin", "");
        expect(events).toHaveLength(1);
        expect(events[0].success).toBe(false);
        expect(events[0].serviceName).toBe("");
        expect(events[0].trigger).toBe("scheduled");
    });

    test("immediate trigger is recorded correctly", async () => {
        const manager = new TestableStackAutoUpdateManager(stubServerWithSend);
        const stack = makeStack("mystack", ["app"], true);
        await (manager as never as { applyUpdates(s: Partial<Stack>, t: EventTrigger): Promise<void> })
            .applyUpdates(stack, "immediate");
        const events = getServiceEvents("mystack", "app");
        expect(events[0].trigger).toBe("immediate");
    });
});

// ---------------------------------------------------------------------------
// init()
// ---------------------------------------------------------------------------

class TrackingScheduleManager extends StackAutoUpdateManager {
    scheduledStacks: string[] = [];
    protected override scheduleCron(stackName: string, _schedule: string): void {
        this.scheduledStacks.push(stackName);
    }
    protected override async runScheduledUpdate(): Promise<void> {}
}

describe("StackAutoUpdateManager.init", () => {
    test("schedules cron for each stack with mode=scheduled", async () => {
        const manager = new TrackingScheduleManager(stubServer);
        await manager.setSettings("alpha", { mode: "scheduled", schedule: "0 3 * * *" });
        await manager.setSettings("beta", { mode: "scheduled", schedule: "0 4 * * *" });
        await manager.setSettings("gamma", { mode: "disabled", schedule: null });

        manager.scheduledStacks = [];
        await manager.init();

        expect(manager.scheduledStacks).toContain("alpha");
        expect(manager.scheduledStacks).toContain("beta");
        expect(manager.scheduledStacks).not.toContain("gamma");
    });

    test("does not schedule cron for disabled or immediate stacks", async () => {
        const manager = new TrackingScheduleManager(stubServer);
        await manager.setSettings("immediate-stack", { mode: "immediate", schedule: null });
        await manager.setSettings("disabled-stack", { mode: "disabled", schedule: null });

        manager.scheduledStacks = [];
        await manager.init();

        expect(manager.scheduledStacks).toHaveLength(0);
    });

    test("init with empty DB does not throw", async () => {
        const manager = new TrackingScheduleManager(stubServer);
        await expect(manager.init()).resolves.toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// onImageUpdateDetected()
// ---------------------------------------------------------------------------

describe("StackAutoUpdateManager.onImageUpdateDetected", () => {
    test("calls applyUpdates when mode is immediate", async () => {
        let applyCalled = false;
        class TrackingApplyManager extends StackAutoUpdateManager {
            protected override scheduleCron() {}
            protected override async applyUpdates(): Promise<void> {
                applyCalled = true;
            }
        }
        const manager = new TrackingApplyManager(stubServerWithSend);
        await manager.setSettings("mystack", { mode: "immediate", schedule: null });
        const fakeStack = makeStack("mystack", [], true) as Stack;
        await manager.onImageUpdateDetected(fakeStack);
        expect(applyCalled).toBe(true);
    });

    test("does not call applyUpdates when mode is scheduled", async () => {
        let applyCalled = false;
        class TrackingApplyManager extends StackAutoUpdateManager {
            protected override scheduleCron() {}
            protected override async applyUpdates(): Promise<void> {
                applyCalled = true;
            }
        }
        const manager = new TrackingApplyManager(stubServerWithSend);
        await manager.setSettings("mystack", { mode: "scheduled", schedule: "0 3 * * *" });
        const fakeStack = makeStack("mystack", [], true) as Stack;
        await manager.onImageUpdateDetected(fakeStack);
        expect(applyCalled).toBe(false);
    });

    test("does not call applyUpdates when mode is disabled", async () => {
        let applyCalled = false;
        class TrackingApplyManager extends StackAutoUpdateManager {
            protected override scheduleCron() {}
            protected override async applyUpdates(): Promise<void> {
                applyCalled = true;
            }
        }
        const manager = new TrackingApplyManager(stubServerWithSend);
        const fakeStack = makeStack("mystack", [], true) as Stack;
        await manager.onImageUpdateDetected(fakeStack);
        expect(applyCalled).toBe(false);
    });
});
