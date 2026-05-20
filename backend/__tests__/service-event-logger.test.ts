import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { initDb, closeDb } from "../db/index";
import { logServiceEvent, getServiceEvents } from "../service-event-logger";
import { runMigrations } from "./helpers";

function setup() {
    const db = initDb(":memory:");
    runMigrations(db.$client);
}

beforeEach(setup);
afterEach(closeDb);

describe("logServiceEvent", () => {
    test("inserts a retrievable event", () => {
        logServiceEvent("mystack", "web", "deploy", "manual", true);
        const events = getServiceEvents("mystack", "web");
        expect(events).toHaveLength(1);
        expect(events[0].stackName).toBe("mystack");
        expect(events[0].serviceName).toBe("web");
        expect(events[0].eventType).toBe("deploy");
        expect(events[0].trigger).toBe("manual");
        expect(events[0].success).toBe(true);
    });

    test("records success=false", () => {
        logServiceEvent("mystack", "web", "update", "scheduled", false);
        const events = getServiceEvents("mystack", "web");
        expect(events[0].success).toBe(false);
    });

    test("records success=null when omitted", () => {
        logServiceEvent("mystack", "web", "start", "manual");
        const events = getServiceEvents("mystack", "web");
        expect(events[0].success).toBeNull();
    });

    test("records timestamp as milliseconds close to now", () => {
        const before = Date.now();
        logServiceEvent("mystack", "web", "stop", "manual");
        const after = Date.now();
        const events = getServiceEvents("mystack", "web");
        expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(events[0].timestamp).toBeLessThanOrEqual(after);
    });

    test("does not throw when called multiple times", () => {
        expect(() => {
            logServiceEvent("mystack", "web", "start", "manual", true);
            logServiceEvent("mystack", "web", "stop", "manual", true);
            logServiceEvent("mystack", "web", "restart", "manual", true);
        }).not.toThrow();
    });
});

describe("getServiceEvents", () => {
    test("excludes events from other stacks", () => {
        logServiceEvent("stack-a", "web", "deploy", "manual", true);
        logServiceEvent("stack-b", "web", "deploy", "manual", true);
        const events = getServiceEvents("stack-a", "web");
        expect(events).toHaveLength(1);
        expect(events[0].stackName).toBe("stack-a");
    });

    test("excludes events for unrelated services in same stack", () => {
        logServiceEvent("mystack", "web", "start", "manual", true);
        logServiceEvent("mystack", "db", "start", "manual", true);
        const events = getServiceEvents("mystack", "web");
        expect(events.every(e => e.serviceName === "web" || e.serviceName === "")).toBe(true);
        expect(events).toHaveLength(1);
    });

    test("includes stack-level events (serviceName='') when querying a service", () => {
        logServiceEvent("mystack", "", "deploy", "manual", true);
        logServiceEvent("mystack", "web", "start", "manual", true);
        const events = getServiceEvents("mystack", "web");
        expect(events).toHaveLength(2);
        expect(events.some(e => e.serviceName === "")).toBe(true);
        expect(events.some(e => e.serviceName === "web")).toBe(true);
    });

    test("returns events newest-first", () => {
        logServiceEvent("mystack", "web", "start", "manual", true);
        logServiceEvent("mystack", "web", "stop", "manual", true);
        logServiceEvent("mystack", "web", "restart", "manual", true);
        const events = getServiceEvents("mystack", "web");
        for (let i = 0; i < events.length - 1; i++) {
            expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i + 1].timestamp);
        }
    });

    test("respects limit", () => {
        for (let i = 0; i < 10; i++) {
            logServiceEvent("mystack", "web", "start", "manual", true);
        }
        const events = getServiceEvents("mystack", "web", 3);
        expect(events).toHaveLength(3);
    });

    test("returns empty array when no events exist", () => {
        const events = getServiceEvents("ghost-stack", "web");
        expect(events).toEqual([]);
    });

    test("all EventType values are stored and retrieved correctly", () => {
        const types = ["deploy", "start", "stop", "restart", "update", "recreate", "down"] as const;
        for (const t of types) {
            logServiceEvent("mystack", "web", t, "manual");
        }
        const events = getServiceEvents("mystack", "web");
        const gotTypes = new Set(events.map(e => e.eventType));
        for (const t of types) {
            expect(gotTypes.has(t)).toBe(true);
        }
    });

    test("all EventTrigger values are stored and retrieved correctly", () => {
        logServiceEvent("mystack", "web", "update", "manual");
        logServiceEvent("mystack", "web", "update", "scheduled");
        logServiceEvent("mystack", "web", "update", "immediate");
        const events = getServiceEvents("mystack", "web");
        const triggers = new Set(events.map(e => e.trigger));
        expect(triggers.has("manual")).toBe(true);
        expect(triggers.has("scheduled")).toBe(true);
        expect(triggers.has("immediate")).toBe(true);
    });
});
