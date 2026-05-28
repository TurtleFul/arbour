<script lang="ts">
import { onMount } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { getContainerLogName } from "../../../../common/util-common";
import Terminal from "./Terminal.svelte";
import Icon from "./Icon.svelte";

const { stackName, serviceName, endpoint = "" } : {
    stackName: string;
    serviceName: string;
    endpoint?: string;
} = $props();

const LS_KEY = "logTimestampMode";
const timestampOptions: { value: "full" | "short" | "none"; label: string }[] = [
    { value: "full",
        label: "Full" },
    { value: "short",
        label: "Short" },
    { value: "none",
        label: "None" },
];

let expanded = $state(false);
let timestampMode = $state<"full" | "short" | "none">((localStorage.getItem(LS_KEY) as "full" | "short" | "none") ?? "full");
let terminalRef = $state<{ updateTerminalSize(): void; rebind(): void } | undefined>(undefined);

const terminalName = $derived(getContainerLogName(endpoint, stackName, serviceName, 0));

function setTimestampMode(mode: "full" | "short" | "none") {
    timestampMode = mode;
    localStorage.setItem(LS_KEY, mode);
}

function expand() {
    expanded = true;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => terminalRef?.updateTerminalSize()));
}

function collapse() {
    expanded = false;
    document.body.style.overflow = "";
    requestAnimationFrame(() => requestAnimationFrame(() => terminalRef?.updateTerminalSize()));
}

onMount(() => {
    socketStore.emitAgent(endpoint, "joinContainerLog", stackName, serviceName, () => {});
});
</script>

{#if !expanded}
    <div class="log-header">
        <h1>{$t("log")} - {serviceName} ({stackName})</h1>
        <div class="ts-controls">
            <div class="btn-group">
                {#each timestampOptions as opt (opt.value)}
                    <button type="button" class="btn btn-sm" class:btn-primary={timestampMode === opt.value}
                        class:btn-ghost={timestampMode !== opt.value}
                        onclick={() => setTimestampMode(opt.value)}>
                        {opt.label}
                    </button>
                {/each}
                <button type="button" class="btn btn-sm btn-ghost" title={$t("expand")} onclick={expand}>
                    <Icon name="expand" />
                </button>
            </div>
        </div>
    </div>
{/if}

<div class="terminal-wrap" class:log-expanded={expanded}>
    {#if expanded}
        <div class="expanded-header">
            <span class="expanded-title">{$t("log")} - {serviceName}</span>
            <div class="expanded-controls">
                <div class="btn-group">
                    {#each timestampOptions as opt (opt.value)}
                        <button type="button" class="btn btn-sm" class:btn-primary={timestampMode === opt.value}
                            class:btn-ghost={timestampMode !== opt.value}
                            onclick={() => setTimestampMode(opt.value)}>
                            {opt.label}
                        </button>
                    {/each}
                </div>
                <button class="compress-btn" title={$t("Exit fullscreen")} onclick={collapse}>
                    <Icon name="compress" />
                </button>
            </div>
        </div>
    {/if}

    <div class="terminal-height" style={expanded ? "" : "height: 410px;"}>
        <Terminal
            bind:this={terminalRef}
            rows={20}
            mode="displayOnly"
            name={terminalName}
            {stackName}
            {serviceName}
            {endpoint}
            {timestampMode}
        />
    </div>
</div>

<style>
h1 { font-size: 1.4rem; margin: 0; }

.log-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.ts-controls { display: flex; align-items: center; }

.btn-group { display: flex; }
.btn { padding: 0.25rem 0.6rem; cursor: pointer; border: 1px solid var(--arbour-border); font-size: 0.82rem; }
.btn-sm { padding: 0.2rem 0.5rem; }
.btn-primary { background: var(--arbour-primary); color: var(--arbour-text-on-primary); border-color: var(--arbour-primary); }
.btn-ghost { background: var(--arbour-bg-deep); color: var(--arbour-text-muted); }
.btn-ghost:hover { background: var(--arbour-bg-header-active); color: var(--arbour-text); }

.terminal-wrap { position: relative; }

.terminal-wrap.log-expanded {
    position: fixed;
    inset: 0;
    z-index: 1050;
    padding: 1rem;
    background: var(--arbour-bg-body);
    display: flex;
    flex-direction: column;
}

.expanded-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-shrink: 0;
}

.expanded-title { font-size: 1.1rem; font-weight: 600; }

.expanded-controls { display: flex; align-items: center; gap: 0.75rem; }

.compress-btn {
    all: unset;
    cursor: pointer;
    color: var(--arbour-text-muted);
}
.compress-btn:hover { color: var(--arbour-text); }

.terminal-height { flex: 1; min-height: 0; }
</style>
