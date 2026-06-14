/**
 * Arbour CI pipelines. Runs locally and in CI identically.
 *
 * Usage (from repo root):
 *   dagger call test
 *   dagger call lint
 *   dagger call typecheck
 *   dagger call verify
 *   dagger call build-frontend export --path=./frontend-dist
 *   dagger call build-image as-tarball export --path=./arbour.tar
 *   dagger call ci
 *   dagger call github-ci        # full pipeline: ci + build-image
 */
import { dag, Container, Directory, object, func, argument } from "@dagger.io/dagger";

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
    base(@argument({ defaultPath: "." }) source: Directory): Container {
        return dag
            .container()
            .from("oven/bun:1.3.14-debian")
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
    async test(@argument({ defaultPath: "." }) source: Directory): Promise<string> {
        return this.base(source).withExec(["sh", "-c", "bun test 2>&1"]).stdout();
    }

    /** Run eslint. */
    @func()
    async lint(@argument({ defaultPath: "." }) source: Directory): Promise<string> {
        return this.base(source).withExec(["sh", "-c", "bun run lint 2>&1"]).stdout();
    }

    /** Run svelte-check. */
    @func()
    async typecheck(@argument({ defaultPath: "." }) source: Directory): Promise<string> {
        return this.base(source).withExec(["sh", "-c", "bun run typecheck 2>&1"]).stdout();
    }

    /** Run fmt + typecheck + test (bun run verify). */
    @func()
    async verify(@argument({ defaultPath: "." }) source: Directory): Promise<string> {
        return this.base(source).withExec(["sh", "-c", "bun run verify 2>&1"]).stdout();
    }

    /** Build the frontend bundle, return the frontend-dist directory. */
    @func()
    buildFrontend(@argument({ defaultPath: "." }) source: Directory): Directory {
        return this.base(source)
            .withExec(["sh", "-c", "bun run build:frontend 2>&1"])
            .directory("/app/frontend-dist");
    }

    /** Build the release container image via docker/Dockerfile. */
    @func()
    buildImage(@argument({ defaultPath: "." }) source: Directory): Container {
        const frontendDist = this.buildFrontend(source);
        const ctx = source.withDirectory("frontend-dist", frontendDist);
        return ctx.dockerBuild({
            dockerfile: "docker/Dockerfile",
            target: "release",
        });
    }

    /** Run verify (fmt + typecheck + test). */
    @func()
    async ci(@argument({ defaultPath: "." }) source: Directory): Promise<string> {
        return this.verify(source);
    }

    /** Full CI pipeline for GitHub Actions: verify, then build image. */
    @func()
    async githubCi(@argument({ defaultPath: "." }) source: Directory): Promise<string> {
        const output = await this.verify(source);
        await this.buildImage(source).sync();
        return `${output}\n\n=== build-image ===\nSuccess`;
    }
}
