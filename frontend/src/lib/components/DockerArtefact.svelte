<script lang="ts">
import { onMount, getContext } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { AGENT_CONTEXT, type AgentContext } from "$lib/context";
import Icon from "./Icon.svelte";
import Confirm from "./Confirm.svelte";
import NetworkInspectModal from "./NetworkInspectModal.svelte";
import { DockerArtefactAction, type DockerArtefactData, type DockerArtefactInfo, type DockerArtefactItem } from "../../../../common/types";

const { endpoint, artefact } = $props<{
    endpoint: string;
    artefact: DockerArtefactInfo;
}>();

const ctx = getContext<AgentContext>(AGENT_CONTEXT);

type SortDir = "UP" | "DOWN";

let fetchingData = $state(true);
let data = $state<DockerArtefactData>({ info: artefact, data: [] });
let dataMap = new Map<string, DockerArtefactItem>();
let tableData = $state<DockerArtefactItem[]>([]);
let sortCol = $state("");
let sortDir = $state<SortDir>("UP");
let selectedItems = $state<string[]>([]);

let showPruneDialog = $state(false);
let pruneAll = $state(false);
let showPullDialog = $state(false);
let pullDanglingList = $state("");
let showDeleteDialog = $state(false);

let inspectNetworkId = $state("");
let showNetworkInspect = $state(false);

const dataHeader = $derived(data.data.length > 0 ? Object.keys(data.data[0].values) : []);

function getValue(value: string | [string, string] | [string, number], sortValue = false): string | number {
    return Array.isArray(value) ? (sortValue ? value[1] : value[0]) : value;
}

function sortData() {
    if (!sortCol) return;
    tableData = Array.from(dataMap.values()).sort((i1, i2) => {
        const v1 = getValue(i1.values[sortCol], true);
        const v2 = getValue(i2.values[sortCol], true);
        const up = sortDir === "UP";
        if (typeof v1 === "string") {
            return (up ? v1 : v2 as string).localeCompare(up ? v2 as string : v1);
        }
        return (up ? v1 : v2 as number) - (up ? v2 as number : v1);
    });
}

export function loadData() {
    fetchingData = true;
    socketStore.emitAgent(endpoint, "getDockerArtefactData", artefact.name, (res: { ok: boolean; data: DockerArtefactData }) => {
        fetchingData = false;
        data = res.data;
        dataMap.clear();
        for (const item of data.data) dataMap.set(item.id, item);
        if (!sortCol) sortCol = dataHeader[0] ?? "";
        sortData();
        selectedItems = [];
    });
}

function toggleSort(col: string) {
    if (sortCol !== col) { sortCol = col; sortDir = "UP"; }
    else { sortDir = sortDir === "UP" ? "DOWN" : "UP"; }
    sortData();
}

function openNetworkInspect(networkId: string) {
    inspectNetworkId = networkId;
    showNetworkInspect = true;
}

function checkOpenPullDialog() {
    const dangling = selectedItems.filter(id => dataMap.get(id)!.excludedActions.includes(DockerArtefactAction.Pull));
    if (dangling.length > 0) {
        const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        pullDanglingList = "<ul>" + dangling.map(id => `<li>${escape(dataMap.get(id)!.actionIds[DockerArtefactAction.Pull])}</li>`).join("") + "</ul>";
        selectedItems = selectedItems.filter(id => !dangling.includes(id));
        showPullDialog = true;
    } else {
        executeAction(DockerArtefactAction.Pull);
    }
}

function executeAction(action: DockerArtefactAction) {
    ctx?.startAction();
    socketStore.emitAgent(endpoint, "executeDockerArtefactAction", artefact.name, action, selectedItems.map(id => dataMap.get(id)?.actionIds[action] ?? id), (res: { ok: boolean; msg?: string }) => {
        ctx?.stopAction();
        socketStore.toastRes(res as any);
        loadData();
    });
}

onMount(loadData);
</script>

<div class="artefact-wrap">
    <!-- Action buttons -->
    <div class="action-bar">
        {#if artefact.actions.includes(DockerArtefactAction.Prune)}
            <button class="btn btn-primary btn-sm" disabled={ctx?.processing} onclick={() => (showPruneDialog = true)}>
                <Icon name="wrench" /> {$t("prune")}
            </button>
        {/if}
        {#if artefact.actions.includes(DockerArtefactAction.Pull)}
            <button class="btn btn-sm btn-secondary-action" disabled={ctx?.processing || selectedItems.length === 0} onclick={checkOpenPullDialog}>
                <Icon name="cloud-arrow-down" /> {$t("pull")}
            </button>
        {/if}
        {#if artefact.actions.includes(DockerArtefactAction.Remove)}
            <button class="btn btn-danger btn-sm" disabled={ctx?.processing || selectedItems.length === 0} onclick={() => (showDeleteDialog = true)}>
                <Icon name="trash" /> {$t("delete")}
            </button>
        {/if}
    </div>

    {#if fetchingData}
        <div class="loading">{$t("fetchingData")}</div>
    {:else}
        <div class="table-wrap">
            <table class="artefact-table">
                <thead>
                    <tr>
                        <th></th>
                        {#each dataHeader as title}
                            <th class="sortable" onclick={() => toggleSort(title)}>
                                {title}
                                <span class="sort-sym">{sortCol === title ? (sortDir === "UP" ? "▲" : "▼") : ""}</span>
                            </th>
                        {/each}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {#each tableData as item (item.id)}
                        <tr>
                            <td>
                                <input
                                    type="checkbox"
                                    class="row-check"
                                    checked={selectedItems.includes(item.id)}
                                    onchange={(e) => {
                                        if ((e.target as HTMLInputElement).checked) {
                                            selectedItems = [...selectedItems, item.id];
                                        } else {
                                            selectedItems = selectedItems.filter(i => i !== item.id);
                                        }
                                    }}
                                />
                            </td>
                            {#each Object.values(item.values) as value}
                                <td class="artefact-cell">{getValue(value)}</td>
                            {/each}
                            <td class="action-cell">
                                {#if item.dangling}
                                    <span class="badge badge-info">{item.danglingLabel}</span>
                                {/if}
                                {#if artefact.name === "network"}
                                    <button class="btn btn-sm btn-ghost" title={$t("networkInspect")} onclick={() => openNetworkInspect(item.id)}>
                                        <Icon name="circle-info" />
                                    </button>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<!-- Prune dialog -->
<Confirm
    bind:open={showPruneDialog}
    title="{$t('prune')} {$t(artefact.name, { values: { n: 2 } })}"
    yesText={$t("prune")}
    btnStyle="btn-danger"
    onyes={() => executeAction(pruneAll ? DockerArtefactAction.PruneAll : DockerArtefactAction.Prune)}
    onno={() => (pruneAll = false)}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t(artefact.name + "PruneMsg")}</p>
    {#if artefact.actions.includes(DockerArtefactAction.PruneAll)}
        <label class="toggle-label">
            <input type="checkbox" bind:checked={pruneAll} />
            {$t(artefact.name + "PruneAll")}
        </label>
    {/if}
</Confirm>

<!-- Pull dialog -->
<Confirm
    bind:open={showPullDialog}
    title="{$t('pull')} {$t(artefact.name, { values: { n: 2 } })}"
    yesText={$t("pull")}
    btnStyle="btn-primary"
    onyes={() => executeAction(DockerArtefactAction.Pull)}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t("imagePullInfoMsg")}</p>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html pullDanglingList}</p>
</Confirm>

<!-- Delete dialog -->
<Confirm
    bind:open={showDeleteDialog}
    title="{$t('delete')} {$t(artefact.name, { values: { n: 2 } })}"
    yesText={$t("delete")}
    btnStyle="btn-danger"
    onyes={() => executeAction(DockerArtefactAction.Remove)}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t(artefact.name + "DeleteMsg")}</p>
</Confirm>

{#if artefact.name === "network"}
    <NetworkInspectModal bind:open={showNetworkInspect} {endpoint} networkId={inspectNetworkId} />
{/if}

<style>
.artefact-wrap { display: flex; flex-direction: column; gap: 1rem; }

.action-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.loading { padding: 1rem; color: var(--arbour-text-muted); }

.table-wrap { overflow-x: auto; }

.artefact-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.artefact-table th,
.artefact-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--arbour-border);
    text-align: left;
}

.artefact-table thead th {
    background: var(--arbour-bg-header);
    font-weight: 600;
    font-size: 0.82rem;
    color: var(--arbour-text-muted);
}

.artefact-table tbody tr:hover { background: var(--arbour-bg-deep); }

.sortable { cursor: pointer; user-select: none; }
.sort-sym { font-family: monospace; margin-left: 4px; color: var(--arbour-primary); }

.artefact-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.action-cell { white-space: nowrap; }

.row-check { width: auto; cursor: pointer; }

.badge { display: inline-block; padding: 0.2em 0.5em; border-radius: var(--arbour-radius-pill); font-size: 0.75rem; font-weight: 600; }
.badge-info { background: var(--arbour-info); color: var(--arbour-text-on-primary); }

.btn-ghost {
    background: none; border: 1px solid var(--arbour-border);
    color: var(--arbour-text-muted); padding: 0.15rem 0.4rem;
}
.btn-ghost:hover { background: var(--arbour-bg-deep); color: var(--arbour-text); }

.btn-secondary-action {
    background: var(--arbour-bg-deep); border: 1px solid var(--arbour-border);
    color: var(--arbour-text);
}
.btn-secondary-action:hover { background: var(--arbour-bg-header-active); }

.toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.toggle-label input { width: auto; }
</style>
