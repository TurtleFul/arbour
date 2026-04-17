export async function exec(cmd: string, args: string[], options?: { cwd?: string }): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}> {
    const proc = Bun.spawn([ cmd, ...args ], {
        cwd: options?.cwd,
        stdout: "pipe",
        stderr: "pipe",
    });

    const [ stdout, stderr, exitCode ] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ]);

    return {
        stdout,
        stderr,
        exitCode: exitCode ?? 1
    };
}
