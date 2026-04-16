/**
 * Arbour CI pipelines. Runs locally and in CI identically.
 *
 * Usage (from repo root):
 *   dagger call test             --source=.
 *   dagger call lint             --source=.
 *   dagger call check-ts         --source=.
 *   dagger call build-frontend   --source=. export --path=./frontend-dist
 *   dagger call build-image      --source=. as-tarball export --path=./arbour.tar
 *   dagger call ci               --source=.
 */
import { dag, Container, Directory, object, func } from "@dagger.io/dagger";

const SOURCE_EXCLUDES = [
    "node_modules",
    ".dagger/sdk",
    ".dagger/node_modules",
    "data",
    "stacks",
    "frontend-dist",
    ".git",
    "tmp",
    "private",
];

@object()
export class Arbour {
    /**
     * Base container: Bun + native toolchain + installed deps.
     */
    @func()
    base(source: Directory): Container {
        return dag
            .container()
            .from("oven/bun:1-debian")
            .withExec(["apt-get", "update"])
            .withExec([
                "apt-get", "install", "-y", "--no-install-recommends",
                "python3", "make", "g++", "ca-certificates",
                "nodejs", "npm",
            ])
            .withExec(["npm", "install", "-g", "node-gyp"])
            .withDirectory("/app", source, { exclude: SOURCE_EXCLUDES })
            .withWorkdir("/app")
            .withExec(["bun", "install", "--frozen-lockfile"]);
    }

    /** Run bun test. */
    @func()
    async test(source: Directory): Promise<string> {
        return this.base(source).withExec(["sh", "-c", "bun test 2>&1"]).stdout();
    }

    /** Run eslint. */
    @func()
    async lint(source: Directory): Promise<string> {
        return this.base(source).withExec(["sh", "-c", "bun run lint 2>&1"]).stdout();
    }

    /** Run tsc --noEmit. */
    @func()
    async checkTs(source: Directory): Promise<string> {
        return this.base(source).withExec(["sh", "-c", "bun run check-ts 2>&1"]).stdout();
    }

    /** Build the frontend bundle, return the frontend-dist directory. */
    @func()
    buildFrontend(source: Directory): Directory {
        return this.base(source)
            .withExec(["sh", "-c", "bun run build:frontend 2>&1"])
            .directory("/app/frontend-dist");
    }

    /** Build the release container image via docker/Dockerfile. */
    @func()
    buildImage(source: Directory): Container {
        return source.dockerBuild({
            dockerfile: "docker/Dockerfile",
            target: "release",
        });
    }

    /** Run test + lint + check-ts in parallel. */
    @func()
    async ci(source: Directory): Promise<string> {
        const [t, l, c] = await Promise.all([
            this.test(source),
            this.lint(source),
            this.checkTs(source),
        ]);
        return `=== test ===\n${t}\n\n=== lint ===\n${l}\n\n=== check-ts ===\n${c}`;
    }
}
