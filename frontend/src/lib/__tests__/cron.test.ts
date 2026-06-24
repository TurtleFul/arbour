import { describe, expect, test } from "bun:test";
import { normalizeCron } from "../cron";

describe("normalizeCron", () => {
    test("empty / whitespace-only input returns empty string", () => {
        expect(normalizeCron("")).toBe("");
        expect(normalizeCron("   ")).toBe("");
    });

    test("splits a run-together expression into fields", () => {
        expect(normalizeCron("03***")).toBe("0 3 * * *");
    });

    test("leaves a correctly spaced expression untouched", () => {
        expect(normalizeCron("0 3 * * *")).toBe("0 3 * * *");
    });

    test("collapses stray and duplicate whitespace", () => {
        expect(normalizeCron("0  3 *  * *")).toBe("0 3 * * *");
        expect(normalizeCron("  0 3 * * *  ")).toBe("0 3 * * *");
        expect(normalizeCron("0\t3 * * *")).toBe("0 3 * * *");
    });

    test("keeps step operators intact when run together", () => {
        expect(normalizeCron("*/5****")).toBe("*/5 * * * *");
    });

    test("keeps range operators intact when run together", () => {
        expect(normalizeCron("1-5***")).toBe("1-5 * * *");
    });

    test("preserves multi-digit fields when spaces are present", () => {
        expect(normalizeCron("*/15 * * * *")).toBe("*/15 * * * *");
        expect(normalizeCron("0,30 4 * * *")).toBe("0,30 4 * * *");
        expect(normalizeCron("30 4 1 * *")).toBe("30 4 1 * *");
    });

    test("handles all-stars", () => {
        expect(normalizeCron("*****")).toBe("* * * * *");
    });
});
