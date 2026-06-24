/**
 * Orchestrates a stack deploy with rollback for newly-created stacks.
 *
 * A failed deploy (e.g. a port already in use) is only detectable at
 * `docker compose up` — it cannot be caught by config validation. When a brand
 * new stack fails to come up we must not leave it behind, so its files and any
 * partially-started containers are rolled back. An existing stack that fails to
 * redeploy is left untouched.
 *
 * `deploy` and `rollback` carry the actual I/O; this function only owns the
 * control flow so it can be unit-tested without Docker. `rollback` is expected
 * to handle (and log) its own failures — if it throws anyway, the original
 * deploy error is still the one propagated.
 */
export interface DeployStackOptions {
    isAdd: boolean;
    deploy: () => Promise<unknown>;
    rollback: () => Promise<unknown>;
}

export async function deployStackWithRollback(options: DeployStackOptions): Promise<void> {
    try {
        await options.deploy();
    } catch (deployError) {
        if (options.isAdd) {
            try {
                await options.rollback();
            } catch {
                // Rollback failures are reported by the caller's rollback itself;
                // never let one mask the original deploy error.
            }
        }
        throw deployError;
    }
}
