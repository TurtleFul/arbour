<script lang="ts">
import { setContext } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { AGENT_CONTEXT } from "$lib/context";
import { getAgentMaintenanceTerminalName } from "../../../../common/util-common";
import { DockerArtefactInfos } from "../../../../common/types";
import DockerArtefact from "./DockerArtefact.svelte";
import ProgressTerminal from "./ProgressTerminal.svelte";
import Confirm from "./Confirm.svelte";
import Icon from "./Icon.svelte";

const { endpoint = "" } = $props<{ endpoint?: string }>();

interface ProgressTerminalInstance {
    show(): void;
    hideWithTimeout(): void;
}

let processing = $state(false);
let showSystemPruneDialog = $state(false);
let systemPruneData = $state({ all: false, volumes: false });
let activeTab = $state(Object.keys(DockerArtefactInfos)[0]);
let progressTerminalRef = $state<ProgressTerminalInstance | undefined>(undefined);

// Expose loadData on each DockerArtefact
let artefactRefs = $state<Record<string, { loadData(): void } | undefined>>({});

const name = $derived(socketStore.getAgentName(endpoint));
const terminalName = $derived(getAgentMaintenanceTerminalName(endpoint));

function startAction() {
    processing = true;
    progressTerminalRef?.show();
}

function stopAction() {
    processing = false;
    progressTerminalRef?.hideWithTimeout();
}

function resetSystemPrune() {
    systemPruneData = { all: false, volumes: false };
}

function systemPrune() {
    startAction();
    socketStore.emitAgent(endpoint, "dockerSystemPrune", systemPruneData.all, systemPruneData.volumes, (res: { ok: boolean; msg?: string }) => {
        stopAction();
        socketStore.toastRes(res as any);
        reloadArtefacts();
    });
}

function reloadArtefacts() {
    for (const ref of Object.values(artefactRefs)) {
        ref?.loadData();
    }
}

setContext(AGENT_CONTEXT, {
    get processing() { return processing; },
    startAction,
    stopAction,
});
</script>

<h1>{name}</h1>

<button class="btn btn-primary" disabled={processing} onclick={() => (showSystemPruneDialog = true)}>
    <Icon name="wrench" /> {$t("systemPrune")}
</button>

<Confirm
    bind:open={showSystemPruneDialog}
    title={$t("systemPrune")}
    yesText={$t("prune")}
    btnStyle="btn-danger"
    onyes={systemPrune}
    onno={resetSystemPrune}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t("systemPruneMsg")}</p>
    <label class="toggle-label">
        <input type="checkbox" bind:checked={systemPruneData.all} />
        {$t("systemPruneAll")}
    </label>
    <label class="toggle-label mt">
        <input type="checkbox" bind:checked={systemPruneData.volumes} />
        {$t("systemPruneVolumes")}
    </label>
</Confirm>

<div class="terminal-wrap">
    <ProgressTerminal bind:this={progressTerminalRef} name={terminalName} {endpoint} />
</div>

<div class="artefact-panel">
    <div class="tabs">
        {#each Object.values(DockerArtefactInfos) as info (info.name)}
            <button class="tab" class:active={activeTab === info.name}
                onclick={() => (activeTab = info.name)}>
                {$t(info.name, { values: { n: 2 } })}
            </button>
        {/each}
    </div>

    <div class="tab-content">
        {#each Object.values(DockerArtefactInfos) as info (info.name)}
            {#if activeTab === info.name}
                <DockerArtefact
                    bind:this={artefactRefs[info.name]}
                    {endpoint}
                    artefact={info}
                />
            {/if}
        {/each}
    </div>
</div>

<style>
h1 { font-size: 2rem; margin: 0 0 1rem; }

.btn { padding: 0.35rem 0.8rem; border-radius: var(--arbour-radius-sm); cursor: pointer; border: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem; }
.btn-primary { background: var(--arbour-primary); color: var(--arbour-text-on-primary); }
.btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--arbour-primary) 85%, black); }
.btn-primary:disabled { opacity: 0.6; cursor: default; }

.toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; margin-top: 0.5rem; }
.toggle-label input { width: auto; }
.mt { margin-top: 0.5rem; }

.terminal-wrap { margin-top: 1rem; }

.artefact-panel {
    margin-top: 1rem;
    background: var(--arbour-bg);
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}

.tabs {
    display: flex;
    background: var(--arbour-bg-header);
    border-bottom: 1px solid var(--arbour-border);
    overflow-x: auto;
}

.tab {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    padding: 0.6rem 1rem;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--arbour-text-muted);
    white-space: nowrap;
    transition: color 0.15s, background 0.15s;
}
.tab:hover { background: var(--arbour-bg-header-active); color: var(--arbour-text); }
.tab.active {
    color: var(--arbour-text);
    border-bottom-color: var(--arbour-primary);
    background: var(--arbour-bg-header-active);
}

.tab-content { padding: 1rem; }
</style>
