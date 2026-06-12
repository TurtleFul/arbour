import { io, type Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { Terminal } from "@xterm/xterm";
import { AgentSocket } from "../../../../common/agent-socket";
import type { AgentData, SimpleStackData } from "../../../../common/types";
import { StackFilter, StackStatusInfo, ALL_ENDPOINTS } from "../../../../common/util-common";
import type { SocketRes } from "$lib/types";
import { goto } from "$app/navigation";
import { get } from "svelte/store";
import { t } from "svelte-i18n";
import { toastStore } from "./toast.svelte";

let socket: Socket;
let agentSocket: AgentSocket;
const terminalMap = new SvelteMap<string, Terminal>();
const terminalTransformMap = new SvelteMap<string, (data: string) => string>();
let filterRebuildTimer: ReturnType<typeof setTimeout> | null = null;

function tr(key: string): string {
    try {
        return get(t)(key);
    } catch {
        return key;
    }
}

class SocketStore {
    socketIO = $state({
        token: null as string | null,
        firstConnect: true,
        connected: false,
        connectCount: 0,
        initedSocketIO: false,
        connectionErrorMsg: "Cannot connect to the socket server. Reconnecting...",
        showReverseProxyGuide: true,
        connecting: false,
    });

    info = $state<Record<string, unknown>>({});
    #remember = $state(typeof localStorage !== "undefined" ? localStorage.remember !== "0" : true);
    loggedIn = $state(false);

    get remember(): boolean {
        return this.#remember;
    }

    set remember(value: boolean) {
        this.#remember = value;
        if (typeof localStorage !== "undefined") {
            localStorage.remember = value ? "1" : "0";
        }
    }

    allowLoginDialog = $state(false);
    username = $state<string | null>(null);
    composeTemplate = $state("");
    envTemplate = $state("");
    isMobile = $state(false);

    stackList = $state<Record<string, SimpleStackData>>({});
    stackFilter = $state(new StackFilter());
    allAgentStackList = $state<Record<string, { stackList: Record<string, SimpleStackData> }>>({});
    agentStatusList = $state<Record<string, string>>({});
    agentList = $state<Record<string, AgentData>>({});

    agentCount = $derived(Object.keys(this.agentList).length);

    completeStackList = $derived.by(() => {
        const list: Record<string, SimpleStackData> = {};
        for (const stackName in this.stackList) {
            list[stackName + "_"] = this.stackList[stackName];
        }
        for (const endpoint in this.allAgentStackList) {
            const instance = this.allAgentStackList[endpoint];
            for (const stackName in instance.stackList) {
                list[stackName + "_" + endpoint] = instance.stackList[stackName];
            }
        }
        return list;
    });

    usernameFirstChar = $derived(
        typeof this.username === "string" && this.username.length >= 1
            ? this.username.charAt(0).toUpperCase()
            : "🐬"
    );

    isFrontendBackendVersionMatched = $derived(
        !this.info.version || this.info.version === FRONTEND_VERSION
    );

    storage(): Storage {
        return this.remember ? localStorage : sessionStorage;
    }

    getSocket(): Socket {
        return socket;
    }

    getAgentName(endpoint: string): string {
        const agent = this.agentList[endpoint] as AgentData;
        if (agent) {
            if (endpoint === "" && agent.name === "") {
                return "Master";
            }
            return agent.name ? agent.name : agent.endpoint;
        }
        return endpoint;
    }

    emitAgent(endpoint: string, eventName: string, ...args: unknown[]) {
        socket.emit("agent", endpoint, eventName, ...args);
    }

    getJWTPayload() {
        const jwtToken = this.storage().token;
        if (jwtToken && jwtToken !== "autoLogin") {
            return jwtDecode(jwtToken);
        }
        return undefined;
    }

    login(username: string, password: string, token: string, callback: (res: SocketRes) => void) {
        socket.emit("login", { username,
            password,
            token }, (res: SocketRes) => {
            if (res.tokenRequired) {
                callback(res);
            }
            if (res.ok) {
                this.storage().token = res.token as string;
                this.socketIO.token = res.token as string;
                this.loggedIn = true;
                this.username = (this.getJWTPayload() as { username?: string })?.username ?? null;
                this.#afterLogin();
                history.pushState({}, "");
            }
            callback(res);
        });
    }

    loginByToken(token: string) {
        socket.emit("loginByToken", token, (res: SocketRes) => {
            this.allowLoginDialog = true;
            if (!res.ok) {
                this.logout();
            } else {
                this.loggedIn = true;
                this.username = (this.getJWTPayload() as { username?: string })?.username ?? null;
                this.#afterLogin();
            }
        });
    }

    logout() {
        socket.emit("logout", () => {});
        this.storage().removeItem("token");
        this.socketIO.token = null;
        this.loggedIn = false;
        this.username = null;
    }

    toastRes(res: SocketRes) {
        let msg: string;
        if (res.msgi18n) {
            if (res.msg != null && typeof res.msg === "object") {
                msg = tr((res.msg as { key: string; values?: Record<string, unknown> }).key);
            } else {
                msg = tr(res.msg as string ?? "");
            }
        } else {
            msg = (res.msg as string) ?? "";
        }
        if (res.ok) {
            toastStore.success(msg);
        } else {
            toastStore.error(msg);
        }
    }

    toastSuccess(msg: string) {
        toastStore.success(tr(msg));
    }

    toastError(msg: string) {
        toastStore.error(tr(msg));
    }

    bindTerminal(endpoint: string, terminalName: string, terminal: Terminal) {
        this.emitAgent(endpoint, "terminalJoin", terminalName, (res: SocketRes) => {
            if (res.ok) {
                let buffer = res.buffer as string;
                const transform = terminalTransformMap.get(terminalName);
                if (transform && typeof buffer === "string") {
                    buffer = transform(buffer);
                }
                terminal.write(buffer);
                terminalMap.set(terminalName, terminal);
            } else {
                this.toastRes(res);
            }
        });
    }

    unbindTerminal(endpoint: string, terminalName: string) {
        this.emitAgent(endpoint, "terminalLeave", terminalName, (res: SocketRes) => {
            if (!res.ok) {
                this.toastRes(res);
            }
        });
        terminalMap.delete(terminalName);
    }

    setTerminalTransform(terminalName: string, transform: ((data: string) => string) | null) {
        if (transform) {
            terminalTransformMap.set(terminalName, transform);
        } else {
            terminalTransformMap.delete(terminalName);
        }
    }

    initSocketIO() {
        if (this.socketIO.initedSocketIO) {
            return;
        }
        this.socketIO.initedSocketIO = true;

        const env = import.meta.env.MODE;
        const url = (env === "development" || (typeof localStorage !== "undefined" && localStorage.dev === "dev"))
            ? location.protocol + "//" + location.hostname + ":5001"
            : location.protocol + "//" + location.host;

        const connectingMsgTimeout = setTimeout(() => {
            this.socketIO.connecting = true;
        }, 1500);

        socket = io(url);
        agentSocket = new AgentSocket();

        socket.on("agent", (eventName: unknown, ...args: unknown[]) => {
            agentSocket.call(eventName as string, ...args);
        });

        socket.on("connect", () => {
            console.log("Connected to the socket server");
            clearTimeout(connectingMsgTimeout);
            this.socketIO.connecting = false;
            this.socketIO.connectCount++;
            this.socketIO.connected = true;
            this.socketIO.showReverseProxyGuide = false;
            this.agentStatusList[""] = "online";

            const token = this.storage().token;
            if (token) {
                if (token !== "autoLogin") {
                    this.loginByToken(token);
                } else {
                    setTimeout(() => {
                        if (!this.loggedIn) {
                            this.allowLoginDialog = true;
                            this.storage().removeItem("token");
                        }
                    }, 5000);
                }
            } else {
                this.allowLoginDialog = true;
            }
            this.socketIO.firstConnect = false;
        });

        socket.on("disconnect", () => {
            console.log("disconnect");
            this.socketIO.connectionErrorMsg = tr("Lost connection to the socket server. Reconnecting...");
            this.socketIO.connected = false;
            this.agentStatusList[""] = "offline";
        });

        socket.on("connect_error", (err) => {
            console.error(`Socket.io connect_error: ${err.message}`);
            this.socketIO.connectionErrorMsg = `${tr("Cannot connect to the socket server.")} [${err}] ${tr("reconnecting...")}`;
            this.socketIO.showReverseProxyGuide = true;
            this.socketIO.connected = false;
            this.socketIO.firstConnect = false;
            this.socketIO.connecting = false;
        });

        socket.on("info", (info) => {
            const prevVersion = this.info.version;
            this.info = info;
            if (prevVersion && prevVersion !== info.version) {
                window.location.reload();
            }
        });

        socket.on("autoLogin", () => {
            this.loggedIn = true;
            this.storage().token = "autoLogin";
            this.socketIO.token = "autoLogin";
            this.allowLoginDialog = false;
            this.#afterLogin();
        });

        socket.on("setup", () => {
            goto("/setup");
        });

        agentSocket.on("terminalWrite", (...args) => {
            const terminalName = args[0] as string;
            let data = args[1] as string | Uint8Array;
            const terminal = terminalMap.get(terminalName);
            if (!terminal) {
                return;
            }
            if (typeof data === "string") {
                const transform = terminalTransformMap.get(terminalName);
                if (transform) {
                    data = transform(data);
                }
            }
            terminal.write(data);
        });

        agentSocket.on("stackList", (...args) => {
            const res = args[0] as SocketRes;
            if (!res.ok) {
                return;
            }
            if (!res.endpoint) {
                this.stackList = res.stackList as Record<string, SimpleStackData>;
            } else {
                const endpoint = res.endpoint as string;
                if (!this.allAgentStackList[endpoint]) {
                    this.allAgentStackList[endpoint] = { stackList: {} };
                }
                this.allAgentStackList[endpoint].stackList = res.stackList as Record<string, SimpleStackData>;
            }
            this.#scheduleFilterRebuild();
        });

        agentSocket.on("stackUpdate", (...args) => {
            const res = args[0] as SocketRes;
            if (!res.ok) {
                return;
            }
            if (!res.endpoint) {
                this.stackList[res.stackName as string] = res.stackData as SimpleStackData;
            } else {
                const endpoint = res.endpoint as string;
                if (!this.allAgentStackList[endpoint]) {
                    this.allAgentStackList[endpoint] = { stackList: {} };
                }
                this.allAgentStackList[endpoint].stackList[res.stackName as string] = res.stackData as SimpleStackData;
            }
            this.#scheduleFilterRebuild();
        });

        socket.on("agentStatus", (res: SocketRes) => {
            this.agentStatusList[res.endpoint as string] = res.status as string;
            if (res.msg) {
                this.toastError(res.msg as string);
            }
        });

        socket.on("agentList", (res: SocketRes) => {
            if (res.ok) {
                this.agentList = res.agentList as Record<string, AgentData>;
            }
        });

        socket.on("refresh", () => location.reload());
    }

    scanFolder() {
        this.emitAgent(ALL_ENDPOINTS, "requestStackList", (res: SocketRes) => {
            this.toastRes(res);
        });
    }

    checkScreenSize() {
        this.isMobile = window.innerWidth < 768;
    }

    #afterLogin() {
        // placeholder for post-login actions
    }

    #scheduleFilterRebuild() {
        if (filterRebuildTimer !== null) {
            clearTimeout(filterRebuildTimer);
        }
        filterRebuildTimer = setTimeout(() => {
            filterRebuildTimer = null;
            const agents = new SvelteSet<string>();
            const status = new SvelteSet<string>();

            for (const stackData of Object.values(this.completeStackList)) {
                agents.add(stackData.endpoint);
                status.add(StackStatusInfo.get(stackData.status).label);
            }

            this.stackFilter.agents.options = Object.fromEntries(
                [ ...agents ]
                    .map((a) => [ this.getAgentName(a), a ])
                    .sort((a1, a2) => a1[0].localeCompare(a2[0]))
            );

            this.stackFilter.status.options = Object.fromEntries(
                StackStatusInfo.ALL.filter((i) => status.has(i.label)).map((i) => [ i.label, i.label ])
            );

            this.stackFilter.attributes.options = { imageUpdatesAvailable: "imageUpdatesAvailable" };
        }, 500);
    }
}

export const socketStore = new SocketStore();
