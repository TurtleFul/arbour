const backend = Bun.spawn([ "bun", "--watch", "./backend/index.ts" ], {
    stdio: [ "inherit", "inherit", "inherit" ],
    env: {
        ...process.env,
        NODE_ENV: "development"
    },
});

const frontend = Bun.spawn([ "bunx", "vite", "--host", "--strictPort", "--config", "./frontend/vite.config.ts" ], {
    stdio: [ "inherit", "inherit", "inherit" ],
    env: {
        ...process.env,
        NODE_ENV: "development"
    },
});

let cleaningUp = false;

async function cleanup(exitCode = 0) {
    if (cleaningUp) {
        return;
    }
    cleaningUp = true;
    backend.kill();
    frontend.kill();
    await Promise.all([ backend.exited, frontend.exited ]);
    process.exit(exitCode);
}

process.on("SIGINT", () => void cleanup());
process.on("SIGTERM", () => void cleanup());

const exitCode = await Promise.race([ backend.exited, frontend.exited ]);
await cleanup(exitCode);
