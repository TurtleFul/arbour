import fs from "fs";
import path from "path";
import yaml from "yaml";
import { exec } from "./spawn";
import { Settings } from "./settings";
import { ArbourServer } from "./arbour-server";

export const SELF_MANAGE_STACK_NAME = "arbour";
const SELF_MANAGE_SETTING_KEY = "selfManage";

export async function isRunningInDocker(): Promise<boolean> {
    return fs.existsSync("/.dockerenv");
}

export async function isSelfManageEnabled(): Promise<boolean> {
    return !!(await Settings.get(SELF_MANAGE_SETTING_KEY));
}

export async function enableSelfManage(server: ArbourServer): Promise<void> {
    if (!await isRunningInDocker()) {
        throw new Error("Arbour is not running in Docker — self-management is only available in Docker.");
    }

    const hostname = process.env.HOSTNAME ?? "";
    if (!hostname) {
        throw new Error("Could not determine container ID (HOSTNAME env not set).");
    }

    const { stdout, stderr, exitCode } = await exec("docker", [ "inspect", hostname ]);
    if (exitCode !== 0) {
        throw new Error(`docker inspect failed: ${stderr}`);
    }

    const inspectData = JSON.parse(stdout);
    const container = inspectData?.[0];
    if (!container) {
        throw new Error("No container data returned from docker inspect.");
    }

    const image: string = container.Config.Image;
    const binds: string[] = container.HostConfig.Binds ?? [];
    const portBindings: Record<string, Array<{ HostPort: string; HostIp: string }>> =
        container.HostConfig.PortBindings ?? {};
    const restartPolicy: string = container.HostConfig.RestartPolicy?.Name ?? "unless-stopped";
    const allEnv: string[] = container.Config.Env ?? [];

    const relevantEnv = allEnv.filter(
        (e: string) => e.startsWith("TZ=") || e.startsWith("ARBOUR_")
    );

    const ports: string[] = [];
    for (const [ containerPortProto, hostBindings ] of Object.entries(portBindings)) {
        const containerPort = containerPortProto.split("/")[0];
        for (const binding of hostBindings ?? []) {
            const { HostPort: hostPort, HostIp: hostIp } = binding;
            if (hostIp && hostIp !== "" && hostIp !== "0.0.0.0") {
                ports.push(`${hostIp}:${hostPort}:${containerPort}`);
            } else {
                ports.push(`${hostPort}:${containerPort}`);
            }
        }
    }

    const composeObj = {
        services: {
            arbour: {
                image,
                restart: restartPolicy,
                ...(ports.length > 0 && { ports }),
                ...(binds.length > 0 && { volumes: binds }),
                ...(relevantEnv.length > 0 && { environment: relevantEnv }),
                labels: {
                    "arbour.self-managed": "true",
                },
            },
        },
    };

    const stackDir = path.join(server.stacksDir, SELF_MANAGE_STACK_NAME);
    fs.mkdirSync(stackDir, { recursive: true });
    fs.writeFileSync(path.join(stackDir, "compose.yaml"), yaml.stringify(composeObj));

    await Settings.set(SELF_MANAGE_SETTING_KEY, true);
}

export async function disableSelfManage(server: ArbourServer): Promise<void> {
    const stackDir = path.join(server.stacksDir, SELF_MANAGE_STACK_NAME);
    if (fs.existsSync(stackDir)) {
        fs.rmSync(stackDir, { recursive: true, force: true });
    }
    await Settings.set(SELF_MANAGE_SETTING_KEY, false);
}
