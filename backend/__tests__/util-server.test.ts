import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { callbackError, callbackResult, checkLogin, ValidationError, fileExists, doubleCheckPassword } from "../util-server";
import { initDb, closeDb } from "../db/index";
import { user as userTable } from "../db/schema";
import { generatePasswordHash } from "../password-hash";
import { runMigrations } from "./helpers";
import os from "os";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

describe("ValidationError", () => {
    test("is instanceof Error", () => {
        expect(new ValidationError("bad input")).toBeInstanceOf(Error);
    });

    test("preserves message", () => {
        expect(new ValidationError("bad input").message).toBe("bad input");
    });
});

// ---------------------------------------------------------------------------
// checkLogin
// ---------------------------------------------------------------------------

describe("checkLogin", () => {
    test("throws when userID is 0", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => checkLogin({ userID: 0 } as any)).toThrow("You are not logged in.");
    });

    test("throws when userID is undefined", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => checkLogin({} as any)).toThrow("You are not logged in.");
    });

    test("does not throw when userID is set", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => checkLogin({ userID: 1 } as any)).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// callbackError
// ---------------------------------------------------------------------------

describe("callbackError", () => {
    test("calls callback with ok:false for Error", () => {
        let result: Record<string, unknown> = {};
        callbackError(new Error("boom"), (r: unknown) => {
            result = r as Record<string, unknown>;
        });
        expect(result).toMatchObject({ ok: false,
            msg: "boom" });
    });

    test("calls callback with ok:false and type for ValidationError", () => {
        let result: Record<string, unknown> = {};
        callbackError(new ValidationError("invalid name"), (r: unknown) => {
            result = r as Record<string, unknown>;
        });
        expect(result.ok).toBe(false);
        expect(result.msg).toBe("invalid name");
        expect(result.type).toBeDefined();
    });

    test("does not throw when callback is not a function", () => {
        expect(() => callbackError(new Error("x"), null)).not.toThrow();
        expect(() => callbackError(new Error("x"), undefined)).not.toThrow();
        expect(() => callbackError(new Error("x"), "not-a-fn")).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// callbackResult
// ---------------------------------------------------------------------------

describe("callbackResult", () => {
    test("calls callback with result", () => {
        let received: unknown;
        callbackResult({ ok: true,
            data: 42 }, (r: unknown) => {
            received = r;
        });
        expect(received).toEqual({ ok: true,
            data: 42 });
    });

    test("does not throw when callback is not a function", () => {
        expect(() => callbackResult({ ok: true }, null)).not.toThrow();
        expect(() => callbackResult({ ok: true }, "oops")).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// fileExists
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// doubleCheckPassword
// ---------------------------------------------------------------------------

describe("doubleCheckPassword", () => {
    beforeEach(() => {
        const db = initDb(":memory:");
        runMigrations(db.$client);
    });
    afterEach(closeDb);

    async function insertUser(active: boolean, password: string): Promise<number> {
        const db = (await import("../db/index")).getDb();
        const hash = generatePasswordHash(password);
        const result = db.insert(userTable).values({
            username: "testuser",
            password: hash,
            active,
        }).returning({ id: userTable.id }).get();
        return result.id;
    }

    test("throws when currentPassword is not a string", async () => {
        const socket = { userID: 1 } as never;
        await expect(doubleCheckPassword(socket, 123)).rejects.toThrow("Wrong data type?");
        await expect(doubleCheckPassword(socket, null)).rejects.toThrow("Wrong data type?");
        await expect(doubleCheckPassword(socket, undefined)).rejects.toThrow("Wrong data type?");
    });

    test("returns User when password is correct", async () => {
        const id = await insertUser(true, "correct-pass");
        const socket = { userID: id } as never;
        const user = await doubleCheckPassword(socket, "correct-pass");
        expect(user).toBeDefined();
    });

    test("throws when password is wrong", async () => {
        const id = await insertUser(true, "correct-pass");
        const socket = { userID: id } as never;
        await expect(doubleCheckPassword(socket, "wrong-pass")).rejects.toThrow("Incorrect current password");
    });

    test("throws when user is inactive", async () => {
        const id = await insertUser(false, "correct-pass");
        const socket = { userID: id } as never;
        await expect(doubleCheckPassword(socket, "correct-pass")).rejects.toThrow("Incorrect current password");
    });

    test("throws when userID does not exist", async () => {
        const socket = { userID: 9999 } as never;
        await expect(doubleCheckPassword(socket, "any-pass")).rejects.toThrow("Incorrect current password");
    });
});

describe("fileExists", () => {
    test("returns true for a file that exists", async () => {
        const tmp = path.join(os.tmpdir(), `arbour-test-${Date.now()}`);
        await fs.promises.writeFile(tmp, "");
        try {
            expect(await fileExists(tmp)).toBe(true);
        } finally {
            await fs.promises.unlink(tmp);
        }
    });

    test("returns false for a file that does not exist", async () => {
        expect(await fileExists("/tmp/arbour-nonexistent-xyz-99999")).toBe(false);
    });

    test("returns true for a directory", async () => {
        expect(await fileExists(os.tmpdir())).toBe(true);
    });
});
