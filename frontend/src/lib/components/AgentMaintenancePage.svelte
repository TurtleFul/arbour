<script lang="ts">
import { setContext } from "svelte";
import { t } from "svelte-i18n";
import { tn } from "$lib/stores/lang.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { AGENT_CONTEXT } from "$lib/context";
import { getAgentMaintenanceTerminalName } from "../../../../common/util-common";
import { DockerArtefactInfos } from "../../../../common/types";
import DockerArtefact from "./DockerArtefact.svelte";
import ProgressTerminal from "./ProgressTerminal.svelte";
import Confirm from "./Confirm.svelte";
import Icon from "./Icon.svelte";

const { endpoint = "" } : { endpoint?: string } = $props();

interface ProgressTerminalInstance {
    show(): void;
    hideWithTimeout(): void;
}

let processing = $state(false);
let showSystemPruneDialog = $state(false);
let systemPruneData = $state({ all: false,
    volumes: false });
let activeTab = $state(Object.values(DockerArtefactInfos)[0].name);
let progressTerminalRef = $state<ProgressTerminalInstance | undefined>(undefined);

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
    systemPruneData = { all: false,
        volumes: false };
}

function systemPrune() {
    startAction();
    socketStore.emitAgent(endpoint, "dockerSystemPrune", systemPruneData.all, systemPruneData.volumes, (res: SocketRes) => {
        stopAction();
        socketStore.toastRes(res);
        reloadArtefacts();
    });
}

function reloadArtefacts() {
    for (const ref of Object.values(artefactRefs)) {
        ref?.loadData();
    }
}

setContext(AGENT_CONTEXT, {
    get processing() {
        return processing;
    },
    startAction,
    stopAction,
});
</script>

<h1 class="mb-3">{name}</h1>

<button class="btn btn-primary mb-3" title={$t("tooltipOpenPruneDialog")} disabled={processing} onclick={() => (showSystemPruneDialog = true)}>
    <Icon name="wrench" /> <span>{$t("systemPrune")}</span>
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
    <p class="mb-3">{@html $t("systemPruneMsg")}</p>

    <div class="form-check form-switch">
        <input id="systemPruneAll" class="form-check-input" type="checkbox" bind:checked={systemPruneData.all} />
        <label class="form-check-label" for="systemPruneAll">{$t("systemPruneAll")}</label>
    </div>

    <div class="form-check form-switch mt-3">
        <input id="systemPruneVolumes" class="form-check-input" type="checkbox" bind:checked={systemPruneData.volumes} />
        <label class="form-check-label" for="systemPruneVolumes">{$t("systemPruneVolumes")}</label>
    </div>
</Confirm>

<div class="mt-3">
    <ProgressTerminal bind:this={progressTerminalRef} name={terminalName} {endpoint} />
</div>

<div class="shadow-box big-padding mt-3">
    <div class="tabs">
        {#each Object.values(DockerArtefactInfos) as info (info.name)}
            <button class="tab artefact-tab me-2" class:active-artefact-tab={activeTab === info.name}
                onclick={() => (activeTab = info.name)}>
                {$tn(info.name, 2)}
            </button>
        {/each}
    </div>

    <div class="tab-content mt-4">
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
.tabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--arbour-border);
    margin-bottom: 0;
}

.tab.artefact-tab {
    background: none;
    border: none;
    border-bottom: 4px solid transparent;
    margin-bottom: -1px;
    padding: 0.5rem 1rem;
    border-radius: var(--arbour-radius) var(--arbour-radius) 0 0;
    cursor: pointer;
    color: var(--arbour-text-muted);
    white-space: nowrap;
    transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.tab.artefact-tab:hover {
    background: var(--arbour-bg-header-active);
    color: var(--arbour-text-on-header);
}

.tab.active-artefact-tab {
    background: var(--arbour-bg-header-active);
    color: var(--arbour-text-on-header);
    border-bottom-color: var(--arbour-primary);
}
</style>
