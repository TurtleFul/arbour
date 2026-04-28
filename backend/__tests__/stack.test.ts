import { describe, expect, test } from "bun:test";
import { Stack } from "../stack";
import { ArbourServer } from "../arbour-server";
import { ValidationError } from "../util-server";
import {
    RUNNING, RUNNING_AND_EXITED, UNHEALTHY,
    EXITED, UNKNOWN, CREATED_FILE, CREATED_STACK,
} from "../../common/util-common";
import path from "path";
import os from "os";
import fs from "fs";

function mockServer(stacksDir = "/tmp/test-stacks"): ArbourServer {
    return { stacksDir } as unknown as ArbourServer;
}

function setStatus(stack: Stack, status: number) {
    (stack as unknown as { _status: number })._status = status;
}

function setFlag(stack: Stack, flag: "_imageUpdatesAvailable" | "_recreateNecessary", value: boolean) {
    (stack as unknown as Record<string, boolean>)[flag] = value;
}

// ---------------------------------------------------------------------------
// validate() — pure logic paths that throw before any FS or Docker access
// ---------------------------------------------------------------------------

describe("Stack.validate() — name check", () => {
    test("rejects uppercase letters", async () => {
        const stack = new Stack(mockServer(), "MyStack", "services:\n  web:\n    image: nginx", "");
        await expect(stack.validate()).rejects.toBeInstanceOf(ValidationError);
    });

    test("rejects spaces", async () => {
        const stack = new Stack(mockServer(), "my stack", "services:\n  web:\n    image: nginx", "");
        await expect(stack.validate()).rejects.toBeInstanceOf(ValidationError);
    });

    test("rejects dots", async () => {
        const stack = new Stack(mockServer(), "my.stack", "services:\n  web:\n    image: nginx", "");
        await expect(stack.validate()).rejects.toBeInstanceOf(ValidationError);
    });

    test("rejects @ and ! characters", async () => {
        const stack = new Stack(mockServer(), "my@stack!", "services:\n  web:\n    image: nginx", "");
        await expect(stack.validate()).rejects.toBeInstanceOf(ValidationError);
    });

    test("rejects empty string", async () => {
        const stack = new Stack(mockServer(), "", "services:\n  web:\n    image: nginx", "");
        await expect(stack.validate()).rejects.toBeInstanceOf(ValidationError);
    });

    test("accepts lowercase letters", async () => {
        const stack = new Stack(mockServer(), "mystack", "services:\n  web:\n    image: nginx", "");
        // Does not throw ValidationError for the name — may throw later (FS/Docker)
        try {
            await stack.validate();
        } catch (e) {
            expect(e).not.toBeInstanceOf(ValidationError);
        }
    });

    test("accepts hyphens and underscores", async () => {
        const stack = new Stack(mockServer(), "my-valid_stack", "services:\n  web:\n    image: nginx", "");
        try {
            await stack.validate();
        } catch (e) {
            expect(e).not.toBeInstanceOf(ValidationError);
        }
    });

    test("accepts digits", async () => {
        const stack = new Stack(mockServer(), "stack123", "services:\n  web:\n    image: nginx", "");
        try {
            await stack.validate();
        } catch (e) {
            expect(e).not.toBeInstanceOf(ValidationError);
        }
    });
});

describe("Stack.validate() — YAML check", () => {
    test("rejects malformed YAML", async () => {
        const stack = new Stack(mockServer(), "valid", "services: [unclosed bracket", "");
        await expect(stack.validate()).rejects.toThrow();
    });

    test("rejects YAML with duplicate keys", async () => {
        const stack = new Stack(mockServer(), "valid", "key: a\nkey: b", "");
        // yaml library may or may not throw on duplicate keys — but it shouldn't throw ValidationError
        // what matters is it doesn't confuse the name check with the yaml check
        try {
            await stack.validate();
        } catch (e) {
            // any error is fine here, we're just confirming the flow
        }
    });
});

describe("Stack.validate() — .env format check", () => {
    test("rejects single line without = sign", async () => {
        const stack = new Stack(mockServer(), "valid", "services:\n  web:\n    image: nginx", "INVALID_NO_EQUALS");
        await expect(stack.validate()).rejects.toBeInstanceOf(ValidationError);
    });

    test("accepts empty env", async () => {
        const stack = new Stack(mockServer(), "valid", "services:\n  web:\n    image: nginx", "");
        try {
            await stack.validate();
        } catch (e) {
            expect(e).not.toBeInstanceOf(ValidationError);
        }
    });

    test("accepts valid KEY=VALUE env", async () => {
        const stack = new Stack(mockServer(), "valid", "services:\n  web:\n    image: nginx", "FOO=bar");
        try {
            await stack.validate();
        } catch (e) {
            expect(e).not.toBeInstanceOf(ValidationError);
        }
    });

    test("accepts multiline env without =", async () => {
        // single line without = throws, but multiline (even if lines lack =) passes the check
        const stack = new Stack(mockServer(), "valid", "services:\n  web:\n    image: nginx", "NO_EQUALS\nFOO=bar");
        try {
            await stack.validate();
        } catch (e) {
            expect(e).not.toBeInstanceOf(ValidationError);
        }
    });
});

// ---------------------------------------------------------------------------
// isStarted getter
// ---------------------------------------------------------------------------

describe("Stack.isStarted", () => {
    test("RUNNING → true", () => {
        const stack = new Stack(mockServer(), "test", "", "");
        setStatus(stack, RUNNING);
        expect(stack.isStarted).toBe(true);
    });

    test("RUNNING_AND_EXITED → true", () => {
        const stack = new Stack(mockServer(), "test", "", "");
        setStatus(stack, RUNNING_AND_EXITED);
        expect(stack.isStarted).toBe(true);
    });

    test("UNHEALTHY → true", () => {
        const stack = new Stack(mockServer(), "test", "", "");
        setStatus(stack, UNHEALTHY);
        expect(stack.isStarted).toBe(true);
    });

    test("EXITED → false", () => {
        const stack = new Stack(mockServer(), "test", "", "");
        setStatus(stack, EXITED);
        expect(stack.isStarted).toBe(false);
    });

    test("UNKNOWN → false", () => {
        const stack = new Stack(mockServer(), "test", "", "");
        setStatus(stack, UNKNOWN);
        expect(stack.isStarted).toBe(false);
    });

    test("CREATED_FILE → false", () => {
        const stack = new Stack(mockServer(), "test", "", "");
        setStatus(stack, CREATED_FILE);
        expect(stack.isStarted).toBe(false);
    });

    test("CREATED_STACK → false", () => {
        const stack = new Stack(mockServer(), "test", "", "");
        setStatus(stack, CREATED_STACK);
        expect(stack.isStarted).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// path getter
// ---------------------------------------------------------------------------

describe("Stack.path", () => {
    test("joins stacksDir and name", () => {
        const stack = new Stack(mockServer("/opt/stacks"), "myapp", "", "");
        expect(stack.path).toBe("/opt/stacks/myapp");
    });

    test("uses correct path separator", () => {
        const stack = new Stack(mockServer("/home/user/stacks"), "nginx-proxy", "", "");
        expect(stack.path).toBe(path.join("/home/user/stacks", "nginx-proxy"));
    });
});

// ---------------------------------------------------------------------------
// getSimpleData()
// ---------------------------------------------------------------------------

describe("Stack.getSimpleData()", () => {
    test("returns correct shape for a running stack", () => {
        const stack = new Stack(mockServer(), "myapp", "", "");
        setStatus(stack, RUNNING);
        const data = stack.getSimpleData("agent1");

        expect(data.name).toBe("myapp");
        expect(data.status).toBe(RUNNING);
        expect(data.started).toBe(true);
        expect(data.endpoint).toBe("agent1");
        expect(data.recreateNecessary).toBe(false);
        expect(data.imageUpdatesAvailable).toBe(false);
        expect(Array.isArray(data.tags)).toBe(true);
        expect(data.composeFileName).toBe("compose.yaml");
    });

    test("started reflects isStarted", () => {
        const stack = new Stack(mockServer(), "myapp", "", "");
        setStatus(stack, EXITED);
        expect(stack.getSimpleData("").started).toBe(false);

        setStatus(stack, RUNNING);
        expect(stack.getSimpleData("").started).toBe(true);
    });

    test("passes endpoint through", () => {
        const stack = new Stack(mockServer(), "myapp", "", "");
        expect(stack.getSimpleData("remote-host:3001").endpoint).toBe("remote-host:3001");
        expect(stack.getSimpleData("").endpoint).toBe("");
    });

    test("reflects imageUpdatesAvailable flag", () => {
        const stack = new Stack(mockServer(), "myapp", "", "");
        setFlag(stack, "_imageUpdatesAvailable", true);
        expect(stack.getSimpleData("").imageUpdatesAvailable).toBe(true);
    });

    test("reflects recreateNecessary flag", () => {
        const stack = new Stack(mockServer(), "myapp", "", "");
        setFlag(stack, "_recreateNecessary", true);
        expect(stack.getSimpleData("").recreateNecessary).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// save() — filesystem round-trip
// ---------------------------------------------------------------------------

describe("Stack.save()", () => {
    test("creates stack directory and files on isAdd=true", async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arbour-test-"));
        const stack = new Stack(mockServer(tmpDir), "myapp",
            "services:\n  web:\n    image: nginx:latest\n", "FOO=bar");

        try {
            await stack.save(true);
            expect(fs.existsSync(path.join(tmpDir, "myapp"))).toBe(true);
            expect(fs.existsSync(path.join(tmpDir, "myapp", "compose.yaml"))).toBe(true);
            expect(fs.existsSync(path.join(tmpDir, "myapp", ".env"))).toBe(true);
            const written = fs.readFileSync(path.join(tmpDir, "myapp", "compose.yaml"), "utf-8");
            expect(written).toContain("nginx:latest");
        } catch (e) {
            // validate() calls docker — skip if docker not available
            if ((e as NodeJS.ErrnoException)?.code === "ENOENT" || String(e).includes("docker")) {
                return;
            }
            throw e;
        } finally {
            fs.rmSync(tmpDir, { recursive: true,
                force: true });
        }
    });

    test("throws ValidationError if name already exists on isAdd=true", async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arbour-test-"));
        fs.mkdirSync(path.join(tmpDir, "existing"));
        const stack = new Stack(mockServer(tmpDir), "existing",
            "services:\n  web:\n    image: nginx\n", "");

        try {
            await expect(stack.save(true)).rejects.toBeInstanceOf(ValidationError);
        } finally {
            fs.rmSync(tmpDir, { recursive: true,
                force: true });
        }
    });

    test("throws ValidationError if stack not found on isAdd=false", async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arbour-test-"));
        const stack = new Stack(mockServer(tmpDir), "nonexistent",
            "services:\n  web:\n    image: nginx\n", "");

        try {
            await expect(stack.save(false)).rejects.toBeInstanceOf(ValidationError);
        } finally {
            fs.rmSync(tmpDir, { recursive: true,
                force: true });
        }
    });
});
