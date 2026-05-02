import type { Socket } from "socket.io-client";

export type SocketRes = {
    ok: boolean;
    msg?: string | { key: string; values?: Record<string, unknown> };
    msgi18n?: boolean;
    [key: string]: unknown;
};
import type { Terminal } from "@xterm/xterm";
import type { SimpleStackData, AgentData } from "../../common/types";
import type { StackFilter } from "../../common/util-common";

/**
 * Shape of the root app instance (socket mixin + main.ts methods).
 * Used to type this.$root in child components.
 */
interface ArbourRootInstance {
    // socket mixin data
    socketIO: {
        token: string | null;
        firstConnect: boolean;
        connected: boolean;
        connectCount: number;
        initedSocketIO: boolean;
        connectionErrorMsg: string;
        showReverseProxyGuide: boolean;
        connecting: boolean;
    };
    info: Record<string, unknown>;
    remember: boolean;
    loggedIn: boolean;
    allowLoginDialog: boolean;
    username: string | null;
    composeTemplate: string;
    envTemplate: string;
    stackList: Record<string, SimpleStackData>;
    allAgentStackList: Record<string, { stackList: Record<string, SimpleStackData> }>;
    agentStatusList: Record<string, string>;
    agentList: Record<string, AgentData>;
    stackFilter: StackFilter;
    // main.ts data
    isMobile: boolean;
    // theme mixin
    colorTheme: string;
    // lang mixin
    language: string;
    // settings (lazily set on $root)
    userTimezone: string;
    // computed
    agentCount: number;
    completeStackList: Record<string, SimpleStackData>;
    usernameFirstChar: string;
    frontendVersion: string;
    isFrontendBackendVersionMatched: boolean;
    theme: string;
    isDark: boolean;
    // methods
    getSocket(): Socket;
    emitAgent(endpoint: string, eventName: string, ...args: unknown[]): void;
    getAgentName(endpoint: string): string;
    toastRes(res: { ok: boolean; msg?: unknown; msgi18n?: boolean }): void;
    toastSuccess(msg: string): void;
    toastError(msg: string): void;
    login(username: string, password: string, token: string, callback: (res: unknown) => void): void;
    logout(): void;
    storage(): Storage;
    bindTerminal(endpoint: string, terminalName: string, terminal: Terminal): void;
    unbindTerminal(endpoint: string, terminalName: string): void;
    changeLang(lang: string): Promise<void>;
    applyColorTheme(theme: string): void;
}

declare module "vue" {
    interface ComponentCustomProperties {
        // vue-i18n (using non-standard import path, so types won't auto-augment)
        $t(key: string, ...args: unknown[]): string;
        $tc(key: string, count?: number, ...args: unknown[]): string;
        $te(key: string): boolean;
        $i18n: {
            locale: string;
            setLocaleMessage(locale: string, messages: Record<string, unknown>): void;
        };
        // typed $root
        $root: ArbourRootInstance;
    }
}

export {};
