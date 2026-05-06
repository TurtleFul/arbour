import { describe, expect, test } from "bun:test";
import { exec } from "../spawn";

// ---------------------------------------------------------------------------
// exec()
// ---------------------------------------------------------------------------

describe("exec", () => {
    test("captures stdout", async () => {
        const { stdout, exitCode } = await exec("echo", [ "hello world" ]);
        expect(stdout.trim()).toBe("hello world");
        expect(exitCode).toBe(0);
    });

    test("captures stderr", async () => {
        const { stderr, exitCode } = await exec("sh", [ "-c", "echo errout >&2" ]);
        expect(stderr.trim()).toBe("errout");
        expect(exitCode).toBe(0);
    });

    test("returns nonzero exit code", async () => {
        const { exitCode } = await exec("sh", [ "-c", "exit 42" ]);
        expect(exitCode).toBe(42);
    });

    test("stdout and stderr are empty strings on no output", async () => {
        const { stdout, stderr } = await exec("true", []);
        expect(stdout).toBe("");
        expect(stderr).toBe("");
    });

    test("respects cwd option", async () => {
        const { stdout } = await exec("pwd", [], { cwd: "/tmp" });
        expect(stdout.trim()).toMatch(/tmp/);
    });

    test("captures multi-line stdout", async () => {
        const { stdout } = await exec("sh", [ "-c", "echo line1; echo line2" ]);
        const lines = stdout.trim().split("\n");
        expect(lines).toContain("line1");
        expect(lines).toContain("line2");
    });
});
