import { describe, expect, test } from "bun:test";
import { KumaRateLimiter } from "../rate-limiter";

function makeLimiter(tokens: number) {
    return new KumaRateLimiter({
        tokensPerInterval: tokens,
        interval: "minute",
        fireImmediately: true,
        errorMessage: "rate limited",
    });
}

// ---------------------------------------------------------------------------
// KumaRateLimiter
// ---------------------------------------------------------------------------

describe("KumaRateLimiter — pass()", () => {
    test("returns true when tokens are available", async () => {
        const limiter = makeLimiter(10);
        const result = await limiter.pass(() => {});
        expect(result).toBe(true);
    });

    test("returns false and calls callback when exhausted", async () => {
        const limiter = makeLimiter(1);
        await limiter.pass(() => {});

        let callbackPayload: Record<string, unknown> = {};
        const result = await limiter.pass((payload: unknown) => {
            callbackPayload = payload as Record<string, unknown>;
        });

        expect(result).toBe(false);
        expect(callbackPayload).toMatchObject({ ok: false,
            msg: "rate limited" });
    });

    test("does not call callback when request is allowed", async () => {
        const limiter = makeLimiter(10);
        let called = false;
        await limiter.pass(() => {
            called = true;
        });
        expect(called).toBe(false);
    });
});

describe("KumaRateLimiter — removeTokens()", () => {
    test("returns a number", async () => {
        const limiter = makeLimiter(10);
        const remaining = await limiter.removeTokens(1);
        expect(typeof remaining).toBe("number");
    });

    test("remaining decreases with each call", async () => {
        const limiter = makeLimiter(10);
        const first = await limiter.removeTokens(1);
        const second = await limiter.removeTokens(1);
        expect(second).toBeLessThan(first);
    });

    test("goes negative when over limit", async () => {
        const limiter = makeLimiter(2);
        await limiter.removeTokens(2);
        const remaining = await limiter.removeTokens(1);
        expect(remaining).toBeLessThan(0);
    });
});
