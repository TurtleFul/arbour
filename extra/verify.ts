// Runs the full verify suite (lint --fix, typecheck, tests), then prints a
// summary of each step's result. Unlike `a && b && c`, every step runs even if
// an earlier one fails, so the summary always reflects the whole picture.

type Step = {
    name: string;
    cmd: string[];
    env?: Record<string, string>;
};

const steps: Step[] = [
    { name: "lint (fmt)",
        cmd: [ "eslint", "**/*.{ts,svelte}", "--fix" ] },
    { name: "typecheck",
        cmd: [ "bun", "run", "typecheck" ] },
    {
        name: "test",
        cmd: [ "bun", "test" ],
        env: { ARBOUR_HIDE_LOG: "error_console,error_autoupdate" },
    },
];

type Result = { name: string; ok: boolean; ms: number };

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

function fmtDuration(ms: number): string {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

const results: Result[] = [];

for (const step of steps) {
    console.log(`\n${bold(`▶ ${step.name}`)} ${dim(step.cmd.join(" "))}`);
    const start = performance.now();
    const proc = Bun.spawn(step.cmd, {
        stdio: [ "inherit", "inherit", "inherit" ],
        env: { ...process.env,
            ...step.env },
    });
    const exitCode = await proc.exited;
    const ms = Math.round(performance.now() - start);
    results.push({ name: step.name,
        ok: exitCode === 0,
        ms });
}

const nameWidth = Math.max(...results.map((r) => r.name.length));
const allOk = results.every((r) => r.ok);

console.log(`\n${bold("─".repeat(nameWidth + 18))}`);
console.log(bold("  verify summary"));
console.log(bold("─".repeat(nameWidth + 18)));
for (const r of results) {
    const mark = r.ok ? green("✓ pass") : red("✗ fail");
    console.log(`  ${r.name.padEnd(nameWidth)}  ${mark}  ${dim(fmtDuration(r.ms).padStart(6))}`);
}
console.log(bold("─".repeat(nameWidth + 18)));
const total = fmtDuration(results.reduce((sum, r) => sum + r.ms, 0));
console.log(`  ${allOk ? green(bold("ALL PASSED")) : red(bold("FAILED"))}  ${dim(`(${total} total)`)}\n`);

process.exit(allOk ? 0 : 1);
