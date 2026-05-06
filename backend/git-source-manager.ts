import path from "path";
import { promises as fsAsync } from "fs";
import { exec } from "./spawn";
import { fileExists } from "./util-server";
import { log } from "./log";

type GitCredentialRow = {
    id: number;
    name: string;
    username: string;
    token: string;
};

const COMPOSE_FILENAMES = [ "compose.yaml", "compose.yml", "docker-compose.yaml", "docker-compose.yml" ];

export class GitSourceManager {
    private reposDir: string;

    constructor(dataDir: string) {
        this.reposDir = path.join(dataDir, "git-repos");
    }

    private buildUrl(repoUrl: string, credential?: GitCredentialRow): string {
        if (!credential) {
            return repoUrl;
        }
        try {
            const u = new URL(repoUrl);
            const token = encodeURIComponent(credential.token);
            const username = credential.username ? encodeURIComponent(credential.username) : "oauth2";
            u.username = username;
            u.password = token;
            return u.toString();
        } catch {
            throw new Error("Invalid repository URL");
        }
    }

    private redactUrl(url: string): string {
        try {
            const u = new URL(url);
            if (u.password) {
                u.password = "***";
                u.username = u.username ? u.username : "";
            }
            return u.toString();
        } catch {
            return url;
        }
    }

    private repoPath(stackName: string): string {
        return path.join(this.reposDir, stackName);
    }

    private async ensureReposDir(): Promise<void> {
        await fsAsync.mkdir(this.reposDir, { recursive: true });
    }

    async syncRepo(
        stackName: string,
        repoUrl: string,
        branch: string,
        credential?: GitCredentialRow
    ): Promise<string> {
        await this.ensureReposDir();

        const authUrl = this.buildUrl(repoUrl, credential);
        const repoDir = this.repoPath(stackName);
        const exists = await fileExists(path.join(repoDir, ".git"));

        if (!exists) {
            log.info("git", `Cloning ${this.redactUrl(repoUrl)} → ${repoDir}`);
            const result = await exec("git", [
                "clone",
                "--branch", branch,
                "--single-branch",
                "--depth", "1",
                authUrl,
                repoDir,
            ]);
            if (result.exitCode !== 0) {
                throw new Error(`git clone failed: ${this.redactError(result.stderr, authUrl)}`);
            }
        } else {
            log.info("git", `Pulling ${this.redactUrl(repoUrl)} (${branch})`);

            // Update remote URL in case credential changed
            await exec("git", [ "remote", "set-url", "origin", authUrl ], { cwd: repoDir });

            const fetchResult = await exec("git", [ "fetch", "--depth", "1", "origin", branch ], { cwd: repoDir });
            if (fetchResult.exitCode !== 0) {
                throw new Error(`git fetch failed: ${this.redactError(fetchResult.stderr, authUrl)}`);
            }

            const resetResult = await exec("git", [ "reset", "--hard", `origin/${branch}` ], { cwd: repoDir });
            if (resetResult.exitCode !== 0) {
                throw new Error(`git reset failed: ${resetResult.stderr.trim()}`);
            }
        }

        const shaResult = await exec("git", [ "rev-parse", "HEAD" ], { cwd: repoDir });
        return shaResult.stdout.trim();
    }

    private redactError(stderr: string, authUrl: string): string {
        try {
            const u = new URL(authUrl);
            if (u.password) {
                return stderr.replace(new RegExp(u.password.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "***");
            }
        } catch {
            // ignore
        }
        return stderr.trim();
    }

    async copyFilesToStack(
        stackName: string,
        subdir: string,
        stackPath: string
    ): Promise<{ composeFile: string; hasEnv: boolean }> {
        const repoDir = this.repoPath(stackName);
        const sourceDir = subdir ? path.join(repoDir, subdir) : repoDir;

        let composeFile: string | null = null;
        for (const name of COMPOSE_FILENAMES) {
            const candidate = path.join(sourceDir, name);
            if (await fileExists(candidate)) {
                composeFile = candidate;
                break;
            }
        }

        if (!composeFile) {
            throw new Error(`No compose file found in ${subdir || "repo root"}. Expected one of: ${COMPOSE_FILENAMES.join(", ")}`);
        }

        await fsAsync.mkdir(stackPath, { recursive: true });
        const destCompose = path.join(stackPath, path.basename(composeFile));
        await fsAsync.copyFile(composeFile, destCompose);

        let hasEnv = false;
        const envSrc = path.join(sourceDir, ".env");
        if (await fileExists(envSrc)) {
            await fsAsync.copyFile(envSrc, path.join(stackPath, ".env"));
            hasEnv = true;
        }

        return { composeFile: path.basename(composeFile),
            hasEnv };
    }

    async readComposeFromRepo(stackName: string, subdir: string): Promise<{ yaml: string; env: string }> {
        const repoDir = this.repoPath(stackName);
        const sourceDir = subdir ? path.join(repoDir, subdir) : repoDir;

        let composeFile: string | null = null;
        for (const name of COMPOSE_FILENAMES) {
            const candidate = path.join(sourceDir, name);
            if (await fileExists(candidate)) {
                composeFile = candidate;
                break;
            }
        }

        if (!composeFile) {
            throw new Error(`No compose file found in ${subdir || "repo root"}`);
        }

        const yaml = await fsAsync.readFile(composeFile, "utf-8");

        let env = "";
        const envPath = path.join(sourceDir, ".env");
        if (await fileExists(envPath)) {
            env = await fsAsync.readFile(envPath, "utf-8");
        }

        return { yaml,
            env };
    }

    async deleteCachedRepo(stackName: string): Promise<void> {
        const repoDir = this.repoPath(stackName);
        if (await fileExists(repoDir)) {
            await fsAsync.rm(repoDir, { recursive: true,
                force: true });
        }
    }
}
