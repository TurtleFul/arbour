<script lang="ts">
import { t } from "svelte-i18n";
import Terminal from "./Terminal.svelte";
import Icon from "./Icon.svelte";
import { PROGRESS_TERMINAL_ROWS } from "../../../../common/util-common";

const {
    name,
    endpoint,
    rows = PROGRESS_TERMINAL_ROWS,
    autoHideTimeout = 10000,
} = $props<{
    name: string;
    endpoint: string;
    rows?: number;
    autoHideTimeout?: number;
}>();

interface TerminalInstance {
    clearTerminal: () => void;
    bind: (ep?: string, n?: string) => void;
    rebind: () => void;
    updateTerminalSize: () => void;
}

let showTerminal = $state(false);
let terminalRef = $state<TerminalInstance | undefined>(undefined);
let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function show() {
    terminalRef?.bind(endpoint, name);
    terminalRef?.clearTerminal();
    showTerminal = true;
    clearTimeout(hideTimer);
}

export function hideWithTimeout() {
    if (autoHideTimeout > 0) {
        hideTimer = setTimeout(() => {
            showTerminal = false;
        }, autoHideTimeout);
    }
}
</script>

<div class="progress-terminal">
    <button
        type="button"
        class="terminal-header"
        onclick={() => (showTerminal = !showTerminal)}
    >
        <Icon name={showTerminal ? "chevron-down" : "chevron-right"} />
        {$t("terminal")}
    </button>

    {#if showTerminal}
        <div class="terminal-body">
            <Terminal
                bind:this={terminalRef}
                {name}
                {endpoint}
                {rows}
                mode="displayOnly"
            />
        </div>
    {/if}
</div>

<style>
.progress-terminal {
    background: var(--arbour-bg);
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}

.terminal-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.6rem 1rem;
    background: var(--arbour-bg-header);
    border: none;
    color: var(--arbour-text);
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
    text-align: left;
    transition: background 0.1s;
}

.terminal-header:hover {
    background: var(--arbour-bg-header-active);
}

.terminal-body {
    padding: 0.5rem;
    background: #000;
}
</style>
