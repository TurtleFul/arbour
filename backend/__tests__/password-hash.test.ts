import { describe, expect, test } from "bun:test";
import { generatePasswordHash, verifyPassword, needRehashPassword, shake256 } from "../password-hash";

describe("generatePasswordHash / verifyPassword", () => {
    test("correct password verifies", () => {
        const hash = generatePasswordHash("hunter2");
        expect(verifyPassword("hunter2", hash)).toBe(true);
    });

    test("wrong password does not verify", () => {
        const hash = generatePasswordHash("hunter2");
        expect(verifyPassword("wrong", hash)).toBe(false);
    });

    test("empty password round-trips", () => {
        const hash = generatePasswordHash("");
        expect(verifyPassword("", hash)).toBe(true);
        expect(verifyPassword("notempty", hash)).toBe(false);
    });

    test("two hashes of the same password differ (salt)", () => {
        const h1 = generatePasswordHash("samepassword");
        const h2 = generatePasswordHash("samepassword");
        expect(h1).not.toBe(h2);
    });

    test("hash starts with bcrypt prefix", () => {
        const hash = generatePasswordHash("test");
        expect(hash.startsWith("$2")).toBe(true);
    });
});

describe("needRehashPassword", () => {
    test("always returns false (no rehash policy implemented)", () => {
        expect(needRehashPassword("$2b$10$anything")).toBe(false);
    });
});

describe("shake256", () => {
    test("returns hex string of correct length", () => {
        const result = shake256("hello", 16);
        expect(result).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    test("is deterministic", () => {
        expect(shake256("hello", 16)).toBe(shake256("hello", 16));
    });

    test("different inputs produce different output", () => {
        expect(shake256("hello", 16)).not.toBe(shake256("world", 16));
    });

    test("returns empty string for empty input", () => {
        expect(shake256("", 16)).toBe("");
    });

    test("respects output length parameter", () => {
        const short = shake256("data", 8);
        const long = shake256("data", 32);
        expect(short).toHaveLength(16);  // 8 bytes = 16 hex chars
        expect(long).toHaveLength(64);   // 32 bytes = 64 hex chars
    });
});
