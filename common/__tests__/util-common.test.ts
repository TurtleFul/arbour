import { describe, expect, test } from "bun:test";
import {
    intHash,
    genSecret,
    parseDockerPort,
    getComposeTerminalName,
    getCombinedTerminalName,
    getContainerTerminalName,
    getContainerLogName,
    getAgentMaintenanceTerminalName,
    isRecord,
    getNested,
    getCryptoRandomInt,
    StackStatusInfo,
    StackFilter,
    StackFilterCategory,
    RUNNING, RUNNING_AND_EXITED, UNHEALTHY, EXITED, UNKNOWN, CREATED_FILE, CREATED_STACK,
} from "../util-common";

// ---------------------------------------------------------------------------
// intHash
// ---------------------------------------------------------------------------

describe("intHash", () => {
    test("returns a number in [0, length)", () => {
        for (const str of [ "", "hello", "world", "abc123", "a".repeat(100) ]) {
            const result = intHash(str);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThan(10);
        }
    });

    test("respects custom length", () => {
        for (let len = 1; len <= 20; len++) {
            const result = intHash("test", len);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThan(len);
        }
    });

    test("is deterministic", () => {
        expect(intHash("hello")).toBe(intHash("hello"));
        expect(intHash("world", 5)).toBe(intHash("world", 5));
    });

    test("empty string returns 0 with default length", () => {
        expect(intHash("")).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// genSecret
// ---------------------------------------------------------------------------

describe("genSecret", () => {
    test("returns a string of the requested length", () => {
        expect(genSecret(32)).toHaveLength(32);
        expect(genSecret(64)).toHaveLength(64);
        expect(genSecret(128)).toHaveLength(128);
    });

    test("default length is 64", () => {
        expect(genSecret()).toHaveLength(64);
    });

    test("only contains alphanumeric characters", () => {
        const secret = genSecret(200);
        expect(secret).toMatch(/^[A-Za-z0-9]+$/);
    });

    test("two calls return different values", () => {
        // Probability of collision is astronomically small
        expect(genSecret()).not.toBe(genSecret());
    });
});

// ---------------------------------------------------------------------------
// parseDockerPort
// ---------------------------------------------------------------------------

describe("parseDockerPort", () => {
    const H = "localhost";

    test("bare port number", () => {
        const r = parseDockerPort("3000", H);
        expect(r.url).toBe("http://localhost:3000");
        expect(r.display).toBe("3000");
    });

    test("port range — uses first port", () => {
        const r = parseDockerPort("3000-3005", H);
        expect(r.url).toBe("http://localhost:3000");
        expect(r.display).toBe("3000-3005");
    });

    test("port mapping host:container", () => {
        const r = parseDockerPort("8000:8000", H);
        expect(r.url).toBe("http://localhost:8000");
        expect(r.display).toBe("8000");
    });

    test("port range mapping", () => {
        const r = parseDockerPort("9090-9091:8080-8081", H);
        expect(r.url).toBe("http://localhost:9090");
    });

    test("ip:port:container", () => {
        const r = parseDockerPort("127.0.0.1:8001:8001", H);
        expect(r.url).toBe("http://127.0.0.1:8001");
    });

    test("udp protocol preserved for non-443", () => {
        const r = parseDockerPort("6060:6060/udp", H);
        expect(r.url).toBe("udp://localhost:6060");
    });

    test("port 443 becomes https", () => {
        const r = parseDockerPort("443:443", H);
        expect(r.url).toBe("https://localhost:443");
    });
});

// ---------------------------------------------------------------------------
// Terminal name helpers
// ---------------------------------------------------------------------------

describe("terminal name helpers", () => {
    test("getComposeTerminalName", () => {
        expect(getComposeTerminalName("ep1", "mystack")).toBe("compose-ep1-mystack");
    });

    test("getCombinedTerminalName", () => {
        expect(getCombinedTerminalName("ep1", "mystack")).toBe("combined-ep1-mystack");
    });

    test("getContainerTerminalName", () => {
        expect(getContainerTerminalName("ep1", "stack", "web", "bash", 0))
            .toBe("container-terminal-ep1-stack-web-bash-0");
    });

    test("getContainerLogName", () => {
        expect(getContainerLogName("ep1", "stack", "web", 0))
            .toBe("container-log-ep1-web");
    });

    test("getAgentMaintenanceTerminalName", () => {
        expect(getAgentMaintenanceTerminalName("ep1")).toBe("agent-maintenance-ep1");
    });
});

// ---------------------------------------------------------------------------
// isRecord / getNested
// ---------------------------------------------------------------------------

describe("isRecord", () => {
    test("returns true for plain objects", () => {
        expect(isRecord({})).toBe(true);
        expect(isRecord({ a: 1 })).toBe(true);
    });

    test("returns false for non-objects", () => {
        expect(isRecord(null)).toBe(false);
        expect(isRecord(42)).toBe(false);
        expect(isRecord("str")).toBe(false);
        expect(isRecord([])).toBe(true); // arrays are objects
    });
});

describe("getNested", () => {
    const obj = { a: { b: { c: 42 } } };

    test("retrieves a deeply nested value", () => {
        expect(getNested<number>(obj, [ "a", "b", "c" ])).toBe(42);
    });

    test("returns undefined for missing keys", () => {
        expect(getNested(obj, [ "a", "x" ])).toBeUndefined();
        expect(getNested(obj, [ "z" ])).toBeUndefined();
    });

    test("returns undefined for non-object intermediaries", () => {
        expect(getNested({ a: 1 }, [ "a", "b" ])).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// getCryptoRandomInt
// ---------------------------------------------------------------------------

describe("getCryptoRandomInt", () => {
    test("result is within [min, max]", () => {
        for (let i = 0; i < 50; i++) {
            const n = getCryptoRandomInt(5, 10);
            expect(n).toBeGreaterThanOrEqual(5);
            expect(n).toBeLessThanOrEqual(10);
        }
    });

    test("min === max returns that value", () => {
        expect(getCryptoRandomInt(7, 7)).toBe(7);
    });

    test("produces values across the full range", () => {
        const seen = new Set<number>();
        for (let i = 0; i < 200; i++) {
            seen.add(getCryptoRandomInt(0, 3));
        }
        expect(seen.size).toBe(4); // 0, 1, 2, 3 all seen
    });
});

// ---------------------------------------------------------------------------
// StackStatusInfo
// ---------------------------------------------------------------------------

describe("StackStatusInfo.get()", () => {
    test("RUNNING maps to active", () => {
        expect(StackStatusInfo.get(RUNNING).label).toBe("active");
    });

    test("RUNNING_AND_EXITED maps to partially", () => {
        expect(StackStatusInfo.get(RUNNING_AND_EXITED).label).toBe("partially");
    });

    test("UNHEALTHY maps to unhealthy", () => {
        expect(StackStatusInfo.get(UNHEALTHY).label).toBe("unhealthy");
    });

    test("EXITED maps to exited", () => {
        expect(StackStatusInfo.get(EXITED).label).toBe("exited");
    });

    test("CREATED_FILE maps to inactive", () => {
        expect(StackStatusInfo.get(CREATED_FILE).label).toBe("inactive");
    });

    test("CREATED_STACK maps to inactive", () => {
        expect(StackStatusInfo.get(CREATED_STACK).label).toBe("inactive");
    });

    test("UNKNOWN falls back to default", () => {
        expect(StackStatusInfo.get(UNKNOWN).label).toBe("?");
    });

    test("unknown id falls back to default", () => {
        expect(StackStatusInfo.get(999).label).toBe("?");
    });

    test("ALL contains 5 entries", () => {
        expect(StackStatusInfo.ALL).toHaveLength(5);
    });
});

// ---------------------------------------------------------------------------
// StackFilterCategory
// ---------------------------------------------------------------------------

describe("StackFilterCategory", () => {
    test("starts with no selection", () => {
        const cat = new StackFilterCategory<string>("test");
        expect(cat.isFilterSelected()).toBe(false);
    });

    test("hasOptions false when empty", () => {
        const cat = new StackFilterCategory<string>("test");
        expect(cat.hasOptions()).toBe(false);
    });

    test("hasOptions true when options added", () => {
        const cat = new StackFilterCategory<string>("test");
        cat.options["a"] = "alpha";
        expect(cat.hasOptions()).toBe(true);
    });

    test("toggleSelected adds a value", () => {
        const cat = new StackFilterCategory<string>("test");
        cat.options["a"] = "alpha";
        cat.toggleSelected("alpha");
        expect(cat.selected.has("alpha")).toBe(true);
    });

    test("toggleSelected removes an already-selected value", () => {
        const cat = new StackFilterCategory<string>("test");
        cat.options["a"] = "alpha";
        cat.toggleSelected("alpha");
        cat.toggleSelected("alpha");
        expect(cat.selected.has("alpha")).toBe(false);
    });

    test("isFilterSelected true only when selected value exists in options", () => {
        const cat = new StackFilterCategory<string>("test");
        cat.options["a"] = "alpha";
        cat.selected.add("alpha");
        expect(cat.isFilterSelected()).toBe(true);
    });

    test("isFilterSelected false when selected value not in options", () => {
        const cat = new StackFilterCategory<string>("test");
        cat.options["a"] = "alpha";
        cat.selected.add("beta"); // not in options
        expect(cat.isFilterSelected()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// StackFilter
// ---------------------------------------------------------------------------

describe("StackFilter", () => {
    test("isFilterSelected false when nothing selected", () => {
        const filter = new StackFilter();
        expect(filter.isFilterSelected()).toBe(false);
    });

    test("isFilterSelected true when an agent category has a match", () => {
        const filter = new StackFilter();
        filter.agents.options["host1"] = "host1";
        filter.agents.selected.add("host1");
        expect(filter.isFilterSelected()).toBe(true);
    });

    test("isFilterSelected true when a status category has a match", () => {
        const filter = new StackFilter();
        filter.status.options["active"] = "active";
        filter.status.selected.add("active");
        expect(filter.isFilterSelected()).toBe(true);
    });

    test("clear resets all categories", () => {
        const filter = new StackFilter();
        filter.agents.options["host1"] = "host1";
        filter.agents.selected.add("host1");
        filter.status.options["active"] = "active";
        filter.status.selected.add("active");

        filter.clear();

        expect(filter.isFilterSelected()).toBe(false);
        expect(filter.agents.selected.size).toBe(0);
        expect(filter.status.selected.size).toBe(0);
    });

    test("has three categories: agents, status, attributes", () => {
        const filter = new StackFilter();
        expect(filter.categories).toHaveLength(3);
    });
});
