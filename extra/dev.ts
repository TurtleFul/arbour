import { $ } from "bun";

const BACKEND_PORT = 5001;
const FRONTEND_PORT = 5000;

async function killPort(port: number) {
    try {
        const result = await $`lsof -ti :${port}`.text();
        const pids = result.trim().split("\n").filter(Boolean);
        for (const pid of pids) {
            process.kill(Number(pid), "SIGTERM");
        }
    } catch {
        // no process on port
    }
}

await killPort(BACKEND_PORT);
await killPort(FRONTEND_PORT);

const backend = Bun.spawn(["bun", "--watch", "./backend/index.ts"], {
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, NODE_ENV: "development" },
});

const frontend = Bun.spawn(["bunx", "vite", "--host", "--strictPort", "--config", "./frontend/vite.config.ts"], {
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, NODE_ENV: "development" },
});

function cleanup() {
    backend.kill();
    frontend.kill();
    process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

await Promise.race([backend.exited, frontend.exited]);
cleanup();
