import { ArbourSocket } from "./util-server";
import { io, Socket as SocketClient } from "socket.io-client";
import { log } from "./log";
import { Agent } from "./models/agent";
import { isDev, LooseObject } from "../common/util-common";
import semver from "semver";
import { getDb } from "./db/index";
import { agent as agentTable } from "./db/schema";
import { eq } from "drizzle-orm";
import { AgentData } from "../common/types";

/**
 * Arbour Instance Manager
 * One AgentManager per Socket connection
 */
export class AgentManager {

    protected socket : ArbourSocket;
    protected agentSocketList : Record<string, SocketClient> = {};
    protected agentLoggedInList : Record<string, boolean> = {};

    constructor(socket: ArbourSocket) {
        this.socket = socket;
    }

    test(url : string, username : string, password : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            if (url === "") {
                reject(new Error("Invalid Arbour URL"));
            }

            let obj = new URL(url);
            let endpoint = obj.host;

            if (!endpoint) {
                reject(new Error("Invalid Arbour URL"));
            }

            if (this.agentSocketList[endpoint]) {
                reject(new Error("The Arbour URL already exists"));
            }

            let client = io(url, {
                reconnection: false,
                extraHeaders: {
                    endpoint,
                }
            });

            client.on("connect", () => {
                client.emit("login", {
                    username: username,
                    password: password,
                }, (res : LooseObject) => {
                    if (res.ok) {
                        resolve();
                    } else {
                        reject(new Error(res.msg));
                    }
                    client.disconnect();
                });
            });

            client.on("connect_error", (err) => {
                if (err.message === "xhr poll error") {
                    reject(new Error("Unable to connect to the Arbour instance"));
                } else {
                    reject(err);
                }
                client.disconnect();
            });
        });
    }

    /**
     *
     * @param url
     * @param username
     * @param password
     * @param name
     */
    async add(url: string, username: string, password: string, name: string): Promise<Agent> {
        const row = getDb()
            .insert(agentTable)
            .values({ url,
                username,
                password,
                name })
            .returning()
            .get();
        return new Agent(row);
    }

    /**
     *
     * @param url
     */
    async remove(url : string) {
        const row = getDb()
            .select()
            .from(agentTable)
            .where(eq(agentTable.url, url))
            .get();

        if (row) {
            getDb().delete(agentTable).where(eq(agentTable.url, url)).run();
            const agent = new Agent(row);
            const endpoint = agent.endpoint;
            this.disconnect(endpoint);
            this.sendAgentList();
            delete this.agentSocketList[endpoint];
        } else {
            throw new Error("Agent not found");
        }
    }

    /**
     *
     * @param url
     * @param updatedName
     */
    async update(url: string, updatedName: string) {
        const db = getDb();
        const row = db.select().from(agentTable).where(eq(agentTable.url, url)).get();
        if (row) {
            db.update(agentTable).set({ name: updatedName }).where(eq(agentTable.url, url)).run();
        } else if (url === "") {
            // Master has not yet persisted
            db.insert(agentTable)
                .values({ url: "",
                    username: "",
                    password: "",
                    name: updatedName })
                .run();
        } else {
            throw new Error("Agent not found");
        }
    }

    connect(url : string, username : string, password : string) {
        let obj = new URL(url);
        let endpoint = obj.host;

        this.socket.emit("agentStatus", {
            endpoint: endpoint,
            status: "connecting",
        });

        if (!endpoint) {
            log.error("agent-manager", "Invalid endpoint: " + endpoint + " URL: " + url);
            return;
        }

        if (this.agentSocketList[endpoint]) {
            log.debug("agent-manager", "Already connected to the socket server: " + endpoint);
            return;
        }

        log.info("agent-manager", "Connecting to the socket server: " + endpoint);
        let client = io(url, {
            extraHeaders: {
                endpoint,
            }
        });

        client.on("connect", () => {
            log.info("agent-manager", "Connected to the socket server: " + endpoint);

            client.emit("login", {
                username: username,
                password: password,
            }, (res : LooseObject) => {
                if (res.ok) {
                    log.info("agent-manager", "Logged in to the socket server: " + endpoint);
                    this.agentLoggedInList[endpoint] = true;
                    this.socket.emit("agentStatus", {
                        endpoint: endpoint,
                        status: "online",
                    });
                } else {
                    log.error("agent-manager", "Failed to login to the socket server: " + endpoint);
                    this.agentLoggedInList[endpoint] = false;
                    this.socket.emit("agentStatus", {
                        endpoint: endpoint,
                        status: "offline",
                    });
                }
            });
        });

        client.on("connect_error", (err) => {
            log.error("agent-manager", "Error from the socket server: " + endpoint);
            this.socket.emit("agentStatus", {
                endpoint: endpoint,
                status: "offline",
            });
        });

        client.on("disconnect", () => {
            log.info("agent-manager", "Disconnected from the socket server: " + endpoint);
            this.socket.emit("agentStatus", {
                endpoint: endpoint,
                status: "offline",
            });
        });

        client.on("agent", (...args : unknown[]) => {
            this.socket.emit("agent", ...args);
        });

        client.on("info", (res) => {
            log.debug("agent-manager", res);

            // Reject agents below 0.2.0 (Arbour) or in the unsupported 1.0–1.3 range.
            // Skip check when version is undefined — sent before auth, real version arrives post-auth.
            const supported = res.version === undefined || semver.satisfies(res.version, ">=0.2.0 <1.0.0 || >=1.4.0");
            if (!isDev && !supported) {
                this.socket.emit("agentStatus", {
                    endpoint: endpoint,
                    status: "offline",
                    msg: `${endpoint}: Unsupported version: ` + res.version,
                });
                client.disconnect();
            }
        });

        this.agentSocketList[endpoint] = client;
    }

    disconnect(endpoint : string) {
        let client = this.agentSocketList[endpoint];
        client?.disconnect();
    }

    async connectAll() {
        if (this.socket.endpoint) {
            log.info("agent-manager", "This connection is connected as an agent, skip connectAll()");
            return;
        }

        let list : Record<string, Agent> = await Agent.getAgentList();

        if (Object.keys(list).length !== 0) {
            log.info("agent-manager", "Connecting to all instance socket server(s)...");
        }

        for (let url in list) {
            if (url !== "") {
                let agent = list[url];
                this.connect(agent.url, agent.username, agent.password);
            }
        }
    }

    disconnectAll() {
        for (let endpoint in this.agentSocketList) {
            this.disconnect(endpoint);
        }
    }

    async emitToEndpoint(endpoint: string, eventName: string, ...args : unknown[]) {
        log.debug("agent-manager", "Emitting event to endpoint: " + endpoint);
        let client = this.agentSocketList[endpoint];

        if (!client) {
            log.error("agent-manager", "Socket client not found for endpoint: " + endpoint);
            throw new Error("Socket client not found for endpoint: " + endpoint);
        }

        if (!client.connected || !this.agentLoggedInList[endpoint]) {
            log.debug("agent-manager", endpoint + ": not ready yet, waiting...");
            await this.waitForReady(endpoint, client);
        }

        client.emit("agent", endpoint, eventName, ...args);
    }

    private waitForReady(endpoint: string, client: SocketClient, timeoutMs = 10000): Promise<void> {
        if (client.connected && this.agentLoggedInList[endpoint]) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            let pollTimer: ReturnType<typeof setInterval>;

            const done = (err?: Error) => {
                clearTimeout(timeoutTimer);
                clearInterval(pollTimer);
                client.off("connect_error", onConnectError);
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            };

            const onConnectError = () => done(new Error(`Socket client not connected for endpoint: ${endpoint}`));
            const timeoutTimer = setTimeout(() => done(new Error(`Timeout waiting for agent: ${endpoint}`)), timeoutMs);

            client.once("connect_error", onConnectError);

            pollTimer = setInterval(() => {
                if (client.connected && this.agentLoggedInList[endpoint]) {
                    log.debug("agent-manager", `${endpoint}: Connected & Logged in`);
                    done();
                }
            }, 100);
        });
    }

    emitToAllEndpoints(eventName: string, ...args : unknown[]) {
        log.debug("agent-manager", "Emitting event to all endpoints");
        for (let endpoint in this.agentSocketList) {
            this.emitToEndpoint(endpoint, eventName, ...args).catch((e) => {
                log.warn("agent-manager", e.message);
            });
        }
    }

    async sendAgentList() {
        let list = await Agent.getAgentList();
        let result : Record<string, AgentData> = {};

        // Master
        result[""] = {
            url: "",
            username: "",
            password: "",
            endpoint: "",
            name: "",
        };

        for (let url in list) {
            let agent = list[url];
            result[agent.endpoint] = agent.toJSON();
        }

        this.socket.emit("agentList", {
            ok: true,
            agentList: result,
        });
    }
}
