<script lang="ts">
import { t } from "svelte-i18n";
import { fly } from "svelte/transition";
import Terminal from "./Terminal.svelte";
import Icon from "./Icon.svelte";
import { PROGRESS_TERMINAL_ROWS } from "../../../../common/util-common";

const {
    name,
    endpoint,
    rows = PROGRESS_TERMINAL_ROWS,
    autoHideTimeout = 10000,
} : {
    name: string;
    endpoint: string;
    rows?: number;
    autoHideTimeout?: number;
} = $props();

interface TerminalInstance {
    clearTerminal: () => void;
    bind: (ep?: string, n?: string) => void;
    rebind: () => void;
    updateTerminalSize: () => void;
}

const easeInCustom = (t: number) => {
    const cy = 0.78;
    const cy2 = 0.97;
    const u = 1 - t;
    return 3 * u * u * t * cy + 3 * u * t * t * cy2 + t * t * t;
};

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
        class:open={showTerminal}
        onclick={() => (showTerminal = !showTerminal)}
    >
        <Icon name={showTerminal ? "chevron-down" : "chevron-right"} />
        {$t("terminal")}
    </button>

    {#if showTerminal}
        <div class="terminal-body" transition:fly={{ y: 50,
            duration: 200,
            easing: easeInCustom }}>
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
    justify-content: flex-start;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--arbour-bg-header);
    border: none;
    border-radius: var(--arbour-radius);
    color: var(--arbour-text-on-header);
    cursor: pointer;
    font-size: 1rem;
    font-family: inherit;
    text-align: left;
    transition: background 0.1s;
    white-space: nowrap;
}

/* When the terminal drops open directly beneath, square the bottom corners
   so the header merges flush with the body. */
.terminal-header.open {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}

.terminal-header:hover {
    background: var(--arbour-bg-header-active);
}

.terminal-body {
    background: #000;
}
</style>
