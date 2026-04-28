import { AgentSocketHandler } from "../agent-socket-handler";
import { ArbourServer } from "../arbour-server";
import { callbackError, callbackResult, checkLogin, ArbourSocket, ValidationError } from "../util-server";
import { Stack } from "../stack";
import { AgentSocket } from "../../common/agent-socket";
import { promises as fsAsync } from "fs";
import path from "path";
import { logServiceEvent, getServiceEvents } from "../service-event-logger";

export class DockerSocketHandler extends AgentSocketHandler {
    create(socket : ArbourSocket, server : ArbourServer, agentSocket : AgentSocket) {
        // Do not call super.create()

        this.importStack(server, agentSocket, socket);

        agentSocket.on("deployStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                const stack = await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                await stack.deploy(socket);
                logServiceEvent(stack.name, "", "deploy", "manual", true);
                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Deployed",
                    msgi18n: true,
                }, callback);
                stack.joinCombinedTerminal(socket);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("saveStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                callbackResult({
                    ok: true,
                    msg: "Saved",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("deleteStack", async (name : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof(name) !== "string") {
                    throw new ValidationError("Name must be a string");
                }
                const stack = await Stack.getStack(server, name);

                try {
                    await stack.delete(socket);
                } catch (e) {
                    server.sendStackList();
                    throw e;
                }

                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Deleted",
                    msgi18n: true,
                }, callback);

            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("getStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);

                if (stack.isManagedByArbour) {
                    stack.joinCombinedTerminal(socket);
                }

                callbackResult({
                    ok: true,
                    stack: await stack.getData(socket.endpoint),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // requestStackList
        agentSocket.on("requestStackList", async (callback) => {
            try {
                checkLogin(socket);
                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Updated",
                    msgi18n: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // startStack
        agentSocket.on("startStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.start(socket);
                logServiceEvent(stackName, "", "start", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Started",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);

                stack.joinCombinedTerminal(socket);

            } catch (e) {
                callbackError(e, callback);
            }
        });

        // stopStack
        agentSocket.on("stopStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.stop(socket);
                logServiceEvent(stackName, "", "stop", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Stopped",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // restartStack
        agentSocket.on("restartStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.restart(socket);
                logServiceEvent(stackName, "", "restart", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Restarted",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // updateStack
        agentSocket.on("updateStack", async (stackName: unknown, pruneAfterUpdate: unknown, pruneAllAfterUpdate: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(pruneAfterUpdate) !== "boolean") {
                    throw new ValidationError("pruneAfterUpdate must be a boolean");
                }

                if (typeof(pruneAllAfterUpdate) !== "boolean") {
                    throw new ValidationError("pruneAllAfterUpdate must be a boolean");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.update(socket, pruneAfterUpdate, pruneAllAfterUpdate);
                logServiceEvent(stackName, "", "update", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Updated",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // down stack
        agentSocket.on("downStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.down(socket);
                logServiceEvent(stackName, "", "down", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Downed",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // stop service
        agentSocket.on("stopService", async (stackName : unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.stopService(socket, serviceName);
                logServiceEvent(stackName, serviceName, "stop", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Stopped",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // start service
        agentSocket.on("startService", async (stackName : unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.startService(socket, serviceName);
                logServiceEvent(stackName, serviceName, "start", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Started",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // restart service
        agentSocket.on("restartService", async (stackName : unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.restartService(socket, serviceName);
                logServiceEvent(stackName, serviceName, "restart", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Restarted",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // recreate service
        agentSocket.on("recreateService", async (stackName : unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.recreateService(socket, serviceName);
                logServiceEvent(stackName, serviceName, "recreate", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Recreated",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // restart service
        agentSocket.on("updateService", async (stackName : unknown, serviceName: unknown, pruneAfterUpdate: unknown, pruneAllAfterUpdate: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                if (typeof(pruneAfterUpdate) !== "boolean") {
                    throw new ValidationError("pruneAfterUpdate must be a boolean");
                }

                if (typeof(pruneAllAfterUpdate) !== "boolean") {
                    throw new ValidationError("pruneAllAfterUpdate must be a boolean");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.updateService(socket, serviceName, pruneAfterUpdate, pruneAllAfterUpdate);
                logServiceEvent(stackName, serviceName, "update", "manual", true);
                callbackResult({
                    ok: true,
                    msg: "Updated",
                    msgi18n: true,
                }, callback);
                server.sendStack(stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Interactive Terminal for containers
        agentSocket.on("joinContainerTerminal", async (stackName : unknown, serviceName : unknown, shell : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string.");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string.");
                }

                if (typeof(shell) !== "string") {
                    throw new ValidationError("Shell must be a string.");
                }

                const stack = await Stack.getStack(server, stackName);
                stack.joinContainerTerminal(socket, serviceName, shell);

                callbackResult({
                    ok: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Container log
        agentSocket.on("joinContainerLog", async (stackName : unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.joinContainerLog(socket, serviceName);

                callbackResult({
                    ok: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Container inspect
        agentSocket.on("containerInspect", async (containerName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(containerName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                const inspectData = await server.getContainerInspectData(containerName);

                callbackResult({
                    ok: true,
                    inspectData
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Service event log
        agentSocket.on("getServiceEventLog", async (stackName: unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (typeof(serviceName) !== "string") {
                    throw new ValidationError("Service name must be a string");
                }

                const events = getServiceEvents(stackName, serviceName);
                callbackResult({
                    ok: true,
                    events,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Services status
        agentSocket.on("updateStackData", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.updateData();
                callbackResult({
                    ok: true,
                    stack: await stack.getData(socket.endpoint)
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Service stats
        agentSocket.on("updateServiceStats", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                callbackResult({
                    ok: true,
                    serviceStats: Object.fromEntries(await stack.getServiceStats())
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // getExternalNetworkList
        agentSocket.on("getDockerNetworkList", async (callback) => {
            try {
                checkLogin(socket);
                const dockerNetworkList = await server.getDockerNetworkList();
                callbackResult({
                    ok: true,
                    dockerNetworkList,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    async importStack(server: ArbourServer, agentSocket: AgentSocket, socket: ArbourSocket) {
        agentSocket.on("importStack", async (stackName: unknown, callback: unknown) => {
            try {
                checkLogin(socket);

                if (typeof stackName !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName, false);

                if (stack.isManagedByArbour) {
                    throw new ValidationError("Stack is already managed by Arbour");
                }

                const configFilePath = stack.configFilePath;
                if (!configFilePath) {
                    throw new Error("Cannot determine compose file path for this stack");
                }

                const sourceDir = path.dirname(configFilePath);
                const composeFileName = path.basename(configFilePath);

                const composeYAML = await fsAsync.readFile(configFilePath, "utf-8");

                let composeENV = "";
                const envPath = path.join(sourceDir, ".env");
                try {
                    composeENV = await fsAsync.readFile(envPath, "utf-8");
                } catch {
                    // no .env — that's fine
                }

                // Detect relative paths (volumes, build contexts) that will resolve differently after import
                const hasRelativePaths = /^\s+[-\s]*\.{1,2}\//m.test(composeYAML) ||
                    /(?:context|build):\s*\.{1,2}\//m.test(composeYAML);

                const destDir = path.join(server.stacksDir, stackName);
                await fsAsync.mkdir(destDir, { recursive: true });
                await fsAsync.writeFile(path.join(destDir, composeFileName), composeYAML);
                if (composeENV.trim()) {
                    await fsAsync.writeFile(path.join(destDir, ".env"), composeENV);
                }

                server.sendStackList();

                callbackResult({
                    ok: true,
                    hasRelativePaths,
                    sourceDir,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    async saveStack(server : ArbourServer, name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown) : Promise<Stack> {
        // Check types
        if (typeof(name) !== "string") {
            throw new ValidationError("Name must be a string");
        }
        if (typeof(composeYAML) !== "string") {
            throw new ValidationError("Compose YAML must be a string");
        }
        if (typeof(composeENV) !== "string") {
            throw new ValidationError("Compose ENV must be a string");
        }
        if (typeof(isAdd) !== "boolean") {
            throw new ValidationError("isAdd must be a boolean");
        }

        const stack = new Stack(server, name, composeYAML, composeENV);
        await stack.save(isAdd);
        return stack;
    }

}

