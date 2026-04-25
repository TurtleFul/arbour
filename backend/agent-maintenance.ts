import { ArbourServer } from "./arbour-server";
import { DockerArtefactAction, DockerArtefactData, DockerArtefactInfos, NetworkInspectData } from "../common/types";
import { getAgentMaintenanceTerminalName } from "../common/util-common";
import { ArbourSocket } from "./util-server";
import { Terminal } from "./terminal";
import { log } from "./log";
import { exec } from "./spawn";

export class AgentMaintenance {

    constructor(protected server: ArbourServer) {
    }

    async getContainerData(): Promise<DockerArtefactData> {
        const containerData: DockerArtefactData = {
            info: DockerArtefactInfos.Container,
            data: []
        };

        try {
            const res = await exec("docker", [ "ps", "--all", "--format", "json" ]);

            if (!res.stdout) {
                return containerData;
            }

            const lines = res.stdout.split("\n");

            for (let line of lines) {
                if (line != "") {
                    const containerInfo = JSON.parse(line);

                    containerData.data.push({
                        id: containerInfo.ID,
                        actionIds: {},
                        values: {
                            Names: containerInfo.Names,
                            Image: containerInfo.Image,
                            Created: containerInfo.CreatedAt,
                            Status: containerInfo.Status
                        },
                        dangling: containerInfo.Status.startsWith("Exited"),
                        danglingLabel: "stopped",
                        excludedActions: []
                    });
                }
            }
        } catch (e) {
            log.error("getContainerData", e);
        }

        return containerData;
    }

    async getImageData(): Promise<DockerArtefactData> {
        const imageData: DockerArtefactData = {
            info: DockerArtefactInfos.Image,
            data: []
        };

        try {
            const res = await exec("docker", [ "image", "ls", "--format", "json" ]);

            if (!res.stdout) {
                return imageData;
            }

            const lines = res.stdout.split("\n");

            for (let line of lines) {
                if (line != "") {
                    const imageInfo = JSON.parse(line);

                    const noneTag = imageInfo.Tag === "<none>";
                    const nameWithTag = imageInfo.Repository + (noneTag ? "" : `:${imageInfo.Tag}`);

                    imageData.data.push({
                        id: imageInfo.ID,
                        actionIds: { pull: nameWithTag },
                        values: {
                            Name: nameWithTag,
                            Created: [ imageInfo.CreatedSince, imageInfo.CreatedAt ],
                            Size: [ imageInfo.Size, this.getByteSize(imageInfo.Size) ]
                        },
                        dangling: imageInfo.Containers === "0",
                        danglingLabel: noneTag ? "dangling" : "unused",
                        excludedActions: noneTag ? [ DockerArtefactAction.Pull ] : []
                    });
                }
            }
        } catch (e) {
            log.error("getImageData", e);
        }

        return imageData;
    }

    async getNetworkData(): Promise<DockerArtefactData> {
        const networkData: DockerArtefactData = {
            info: DockerArtefactInfos.Network,
            data: []
        };

        const defaultNetworks = new Set([ "bridge", "host", "none" ]);

        try {
            const res = await exec("docker", [ "network", "ls", "--format", "json" ]);

            if (!res.stdout) {
                return networkData;
            }

            const lines = res.stdout.split("\n");

            for (let line of lines) {
                if (line != "") {
                    const networkInfo = JSON.parse(line);

                    let inspectData = {
                        Containers: {
                            nodata: true
                        }
                    };

                    if (!defaultNetworks.has(networkInfo.Name)) {
                        const inspectRes = await exec("docker", [ "network", "inspect", "--format", "json", networkInfo.ID ]);

                        if (inspectRes.stdout) {
                            inspectData = JSON.parse(inspectRes.stdout)[0];
                        }
                    }

                    networkData.data.push({
                        id: networkInfo.ID,
                        actionIds: {},
                        values: {
                            Name: networkInfo.Name,
                            Created: networkInfo.CreatedAt,
                            Driver: networkInfo.Driver,
                            Scope: networkInfo.Scope
                        },
                        dangling: Object.keys(inspectData.Containers).length === 0,
                        danglingLabel: "dangling",
                        excludedActions: []
                    });
                }
            }
        } catch (e) {
            log.error("getNetworkData", e);
        }

        return networkData;
    }

    async getVolumeData(): Promise<DockerArtefactData> {
        const volumeData: DockerArtefactData = {
            info: DockerArtefactInfos.Volume,
            data: []
        };

        try {
            const danglingRes = await exec("docker", [ "volume", "ls", "--format", "json", "-f", "dangling=true" ]);

            const danglingVolumes = new Set();
            if (danglingRes.stdout) {
                const lines = danglingRes.stdout.split("\n");
                for (let line of lines) {
                    if (line != "") {
                        const danglingVolume = JSON.parse(line);
                        danglingVolumes.add(danglingVolume.Name);
                    }
                }
            }

            const res = await exec("docker", [ "volume", "ls", "--format", "json" ]);

            if (!res.stdout) {
                return volumeData;
            }

            const lines = res.stdout.split("\n");

            for (let line of lines) {
                if (line != "") {
                    const volumeInfo = JSON.parse(line);

                    const inspectRes = await exec("docker", [ "volume", "inspect", "--format", "json", volumeInfo.Name ]);

                    let inspectData = {
                        CreatedAt: ""
                    };
                    if (inspectRes.stdout) {
                        inspectData = JSON.parse(inspectRes.stdout)[0];
                    }

                    volumeData.data.push({
                        id: volumeInfo.Name,
                        actionIds: {},
                        values: {
                            Name: volumeInfo.Name,
                            Created: inspectData.CreatedAt,
                            Driver: volumeInfo.Driver,
                            Scope: volumeInfo.Scope,
                            Size: [ volumeInfo.Size, this.getByteSize(volumeInfo.Size) ]
                        },
                        dangling: danglingVolumes.has(volumeInfo.Name),
                        danglingLabel: "dangling",
                        excludedActions: []
                    });
                }
            }
        } catch (e) {
            log.error("getVolumeData", e);
        }

        return volumeData;
    }

    async getNetworkInspect(networkId: string): Promise<NetworkInspectData> {
        const res = await exec("docker", [ "network", "inspect", "--format", "json", networkId ]);

        if (!res.stdout) {
            throw new Error(`No inspect data for network ${networkId}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any = JSON.parse(res.stdout)[0];

        const subnets = (raw.IPAM?.Config ?? []).map((c: { Subnet?: string; Gateway?: string }) => ({
            subnet: c.Subnet ?? "",
            gateway: c.Gateway ?? "",
        }));

        const containers = Object.values(raw.Containers ?? {}).map((c: unknown) => {
            const container = c as { Name: string; IPv4Address: string; IPv6Address: string; MacAddress: string };
            return {
                name: container.Name,
                ipv4: container.IPv4Address,
                ipv6: container.IPv6Address,
                mac: container.MacAddress,
            };
        });

        return {
            id: raw.Id,
            name: raw.Name,
            driver: raw.Driver,
            scope: raw.Scope,
            internal: raw.Internal ?? false,
            ipv6: raw.EnableIPv6 ?? false,
            subnets,
            containers,
        };
    }

    async prune(socket: ArbourSocket, artefact: string, all: boolean) {
        const terminalName = getAgentMaintenanceTerminalName(socket.endpoint);

        const dockerParams = [ artefact, "prune", "-f" ];
        if (all) {
            dockerParams.push("-a");
        }

        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", dockerParams, "");

        if (exitCode !== 0) {
            throw new Error("Failed to prune, please check the terminal output for more information.");
        }

        return exitCode;
    }

    async remove(socket: ArbourSocket, artefact: string, ids: string[]) {
        const terminalName = getAgentMaintenanceTerminalName(socket.endpoint);

        const dockerParams = [ artefact, "rm" ];
        for (const id of ids) {
            dockerParams.push(id);
        }

        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", dockerParams, "");

        if (exitCode !== 0) {
            throw new Error("Failed to delete, please check the terminal output for more information.");
        }

        return exitCode;
    }

    async pullImages(socket: ArbourSocket, ids: string[]) {
        const terminalName = getAgentMaintenanceTerminalName(socket.endpoint);

        let overallExitCode = 0;
        for (const id of ids) {
            let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", [ "image", "pull", id ], "");

            if (exitCode !== 0) {
                overallExitCode = exitCode;
            }
        }

        if (overallExitCode !== 0) {
            throw new Error("Failed to update image(s), please check the terminal output for more information.");
        }

        return overallExitCode;
    }

    async systemPrune(socket: ArbourSocket, all: boolean, volumes: boolean) {
        const terminalName = getAgentMaintenanceTerminalName(socket.endpoint);

        const dockerParams = [ "system", "prune", "-f" ];
        if (all) {
            dockerParams.push("-a");
        }
        if (volumes) {
            dockerParams.push("--volumes");
        }

        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", dockerParams, "");

        if (exitCode !== 0) {
            throw new Error("Failed to prune, please check the terminal output for more information.");
        }

        return exitCode;
    }

    private getByteSize(sizeStr: string): number {
        let byteSize = parseFloat(sizeStr);

        if (byteSize) {
            if (sizeStr.endsWith("KB")) {
                byteSize = byteSize * 1024;
            } else if (sizeStr.endsWith("MB")) {
                byteSize = byteSize * 1024 * 1024;
            } else if (sizeStr.endsWith("GB")) {
                byteSize = byteSize * 1024 * 1024 * 1024;
            }
        } else {
            byteSize = 0;
        }

        return byteSize;
    }
}
