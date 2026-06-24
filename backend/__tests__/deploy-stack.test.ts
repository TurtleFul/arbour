import { describe, expect, test } from "bun:test";
import { deployStackWithRollback } from "../deploy-stack";

describe("deployStackWithRollback", () => {
    test("does not roll back when the deploy succeeds", async () => {
        let deployed = 0;
        let rolledBack = 0;
        await deployStackWithRollback({
            isAdd: true,
            deploy: async () => {
                deployed++;
            },
            rollback: async () => {
                rolledBack++;
            },
        });
        expect(deployed).toBe(1);
        expect(rolledBack).toBe(0);
    });

    test("rolls back a new stack when the deploy fails, and rethrows the deploy error", async () => {
        let rolledBack = 0;
        const deployError = new Error("port is already allocated");
        const run = deployStackWithRollback({
            isAdd: true,
            deploy: async () => {
                throw deployError;
            },
            rollback: async () => {
                rolledBack++;
            },
        });
        await expect(run).rejects.toBe(deployError);
        expect(rolledBack).toBe(1);
    });

    test("does NOT roll back an existing stack when its redeploy fails", async () => {
        let rolledBack = 0;
        const deployError = new Error("port is already allocated");
        const run = deployStackWithRollback({
            isAdd: false,
            deploy: async () => {
                throw deployError;
            },
            rollback: async () => {
                rolledBack++;
            },
        });
        await expect(run).rejects.toBe(deployError);
        expect(rolledBack).toBe(0);
    });

    test("a failing rollback does not mask the original deploy error", async () => {
        const deployError = new Error("port is already allocated");
        const run = deployStackWithRollback({
            isAdd: true,
            deploy: async () => {
                throw deployError;
            },
            rollback: async () => {
                throw new Error("cleanup blew up");
            },
        });
        await expect(run).rejects.toBe(deployError);
    });

    test("runs deploy before rollback (rollback only after failure)", async () => {
        const order: string[] = [];
        const run = deployStackWithRollback({
            isAdd: true,
            deploy: async () => {
                order.push("deploy"); throw new Error("fail");
            },
            rollback: async () => {
                order.push("rollback");
            },
        });
        await expect(run).rejects.toThrow("fail");
        expect(order).toEqual([ "deploy", "rollback" ]);
    });
});
