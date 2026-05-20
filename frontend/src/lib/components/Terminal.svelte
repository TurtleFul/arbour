<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { socketStore } from "$lib/stores/socket.svelte";
import { TERMINAL_COLS, TERMINAL_ROWS } from "../../../../common/util-common";

const {
    name,
    endpoint,
    stackName = undefined,
    serviceName = undefined,
    shell = "bash",
    rows = TERMINAL_ROWS,
    cols = TERMINAL_COLS,
    mode = "displayOnly",
    timestampMode = "full",
    onhasdata = undefined,
} = $props<{
    name: string;
    endpoint: string;
    stackName?: string;
    serviceName?: string;
    shell?: string;
    rows?: number;
    cols?: number;
    mode?: "displayOnly" | "mainTerminal" | "interactive";
    timestampMode?: "full" | "short" | "none";
    onhasdata?: () => void;
}>();

let terminalEl: HTMLDivElement;
let terminal: XTerm;
let fitAddon: FitAddon;
let terminalInputBuffer = "";
let cursorPosition = 0;
let mounted = false; // plain (non-reactive) flag, won't re-trigger $effect

function makeTimestampTransform(m: string): ((data: string) => string) | null {
    if (m === "full") return null;
    const iso = () => /\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g;
    const apache = () => /\[\d{2}\/\w+\/\d{4}:(\d{2}:\d{2}:\d{2}) [+-]\d{4}\]/g;
    const spaceDate = () => /\d{4}[-/]\d{2}[-/]\d{2} (\d{2}:\d{2}:\d{2})(?:\.\d+)?/g;
    if (m === "none") {
        return (data) => data.replace(iso(), "").replace(apache(), "").replace(spaceDate(), "");
    }
    return (data) => data
        .replace(iso(), (_, t: string) => t)
        .replace(apache(), (_, t: string) => t)
        .replace(spaceDate(), (_, t: string) => t);
}

function clearTerminal() {
    terminal.clear();
    terminalInputBuffer = "";
    cursorPosition = 0;
}

function removeInput() {
    const backspaceCount = terminalInputBuffer.length;
    terminal.write("\b \b".repeat(backspaceCount));
    cursorPosition = 0;
    terminalInputBuffer = "";
}

function bind(ep?: string, n?: string) {
    const resolvedEndpoint = ep ?? endpoint;
    const resolvedName = n ?? name;
    if (resolvedName) {
        socketStore.bindTerminal(resolvedEndpoint, resolvedName, terminal);
    }
}

function rebind() {
    socketStore.setTerminalTransform(name, makeTimestampTransform(timestampMode));
    clearTerminal();
    bind();
}

function updateTerminalSize() {
    if (!fitAddon) {
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        window.addEventListener("resize", onResizeEvent);
    }
    fitAddon.fit();
}

function onResizeEvent() {
    fitAddon.fit();
    socketStore.emitAgent(endpoint, "terminalResize", name, terminal.rows, terminal.cols);
}

function mainTerminalConfig() {
    terminal.onKey((e) => {
        const code = e.key.charCodeAt(0);

        if (e.key === "\r") {
            if (terminalInputBuffer.length === 0) return;
            const buffer = terminalInputBuffer;
            removeInput();
            socketStore.emitAgent(endpoint, "terminalInput", name, buffer + e.key, (err: { msg: string }) => {
                socketStore.toastError(err.msg);
            });
        } else if (code === 127) {
            if (cursorPosition > 0) {
                terminal.write("\b \b");
                cursorPosition--;
                terminalInputBuffer = terminalInputBuffer.slice(0, -1);
            }
        } else if (e.key === "[A" || e.key === "[B") {
            // UP/DOWN — no-op
        } else if (e.key === "") {
            socketStore.emitAgent(endpoint, "terminalInput", name, e.key);
            removeInput();
        } else {
            cursorPosition++;
            terminalInputBuffer += e.key;
            terminal.write(e.key);
        }
    });
}

function interactiveTerminalConfig() {
    terminal.onKey((e) => {
        socketStore.emitAgent(endpoint, "terminalInput", name, e.key, (res: { ok: boolean; msg: string }) => {
            if (!res.ok) socketStore.toastError(res.msg);
        });
    });
}

$effect(() => {
    const mode_ = timestampMode; // track reactively
    if (!mounted) return;        // skip initial run — onMount handles setup
    socketStore.setTerminalTransform(name, makeTimestampTransform(mode_));
    clearTerminal();
    bind();
});

onMount(() => {
    terminal = new XTerm({
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        cursorBlink: mode !== "displayOnly",
        cols,
        rows,
    });

    if (mode === "mainTerminal") mainTerminalConfig();
    else if (mode === "interactive") interactiveTerminalConfig();

    terminal.open(terminalEl);

    if (mode !== "displayOnly") terminal.focus();

    terminal.onCursorMove(() => onhasdata?.());

    socketStore.setTerminalTransform(name, makeTimestampTransform(timestampMode));
    bind();

    mounted = true;

    if (mode === "mainTerminal") {
        socketStore.emitAgent(endpoint, "mainTerminal", name, (res: { ok: boolean }) => {
            if (!res.ok) socketStore.toastRes(res as any);
        });
    }

    updateTerminalSize();
});

onDestroy(() => {
    window.removeEventListener("resize", onResizeEvent);
    socketStore.unbindTerminal(endpoint, name);
    socketStore.setTerminalTransform(name, null);
    terminal?.dispose();
});

export { clearTerminal, bind, rebind, updateTerminalSize };
</script>

<div class="terminal-wrap">
    <div bind:this={terminalEl} class="main-terminal"></div>
</div>

<style>
.terminal-wrap {
    background-color: #000;
    border-radius: var(--arbour-radius);
    overflow: hidden;
    height: 100%;
}

.main-terminal {
    height: 100%;
}

:global(.terminal-wrap .xterm) {
    height: 100%;
}
</style>
