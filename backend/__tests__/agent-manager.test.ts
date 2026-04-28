import { describe, expect, test, spyOn } from "bun:test";
import { AgentManager } from "../agent-manager";
import { ArbourSocket } from "../util-server";
import { log } from "../log";
import semver from "semver";

// The version range used in agent-manager.ts connect() to reject incompatible agents.
// Tested here independently so a future change to the range is caught explicitly.
const SUPPORTED_RANGE = ">=0.2.0 <1.0.0 || >=1.4.0";

function mockSocket(): ArbourSocket {
    return {
        endpoint: "",
        emit: () => {},
    } as unknown as ArbourSocket;
}

// ---------------------------------------------------------------------------
// Version compatibility range
// ---------------------------------------------------------------------------

describe("agent version range", () => {
    test("accepts Arbour 0.2.x", () => {
        expect(semver.satisfies("0.2.0", SUPPORTED_RANGE)).toBe(true);
        expect(semver.satisfies("0.2.9", SUPPORTED_RANGE)).toBe(true);
    });

    test("accepts Arbour 0.3.x and 0.4.x", () => {
        expect(semver.satisfies("0.3.0", SUPPORTED_RANGE)).toBe(true);
        expect(semver.satisfies("0.4.0", SUPPORTED_RANGE)).toBe(true);
    });

    test("accepts Dockge 1.4.x (maintained fork compatibility)", () => {
        expect(semver.satisfies("1.4.0", SUPPORTED_RANGE)).toBe(true);
        expect(semver.satisfies("1.5.2", SUPPORTED_RANGE)).toBe(true);
    });

    test("rejects Dockge 1.0–1.3 (unsupported range)", () => {
        expect(semver.satisfies("1.0.0", SUPPORTED_RANGE)).toBe(false);
        expect(semver.satisfies("1.1.0", SUPPORTED_RANGE)).toBe(false);
        expect(semver.satisfies("1.3.9", SUPPORTED_RANGE)).toBe(false);
    });

    test("rejects pre-Arbour versions below 0.2.0", () => {
        expect(semver.satisfies("0.1.0", SUPPORTED_RANGE)).toBe(false);
        expect(semver.satisfies("0.0.1", SUPPORTED_RANGE)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// emitToEndpoint — error cases
// ---------------------------------------------------------------------------

describe("AgentManager.emitToEndpoint()", () => {
    test("throws when endpoint has no registered socket client", async () => {
        const spy = spyOn(log, "error").mockImplementation(() => {});
        const manager = new AgentManager(mockSocket());
        await expect(
            manager.emitToEndpoint("unknown-host:3001", "someEvent")
        ).rejects.toThrow("Socket client not found for endpoint: unknown-host:3001");
        spy.mockRestore();
    });
});
