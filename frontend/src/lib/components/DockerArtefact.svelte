<script lang="ts">
import { onMount, getContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { t } from "svelte-i18n";
import { tn } from "$lib/stores/lang.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { AGENT_CONTEXT } from "$lib/context";
import type { AgentContext } from "$lib/context";
import Icon from "./Icon.svelte";
import Confirm from "./Confirm.svelte";
import NetworkInspectModal from "./NetworkInspectModal.svelte";
import { DockerArtefactAction } from "../../../../common/types";
import type { DockerArtefactData, DockerArtefactInfo, DockerArtefactItem } from "../../../../common/types";

const { endpoint, artefact } : {
    endpoint: string;
    artefact: DockerArtefactInfo;
} = $props();

const ctx = getContext<AgentContext>(AGENT_CONTEXT);

type SortDir = "UP" | "DOWN";

let fetchingData = $state(true);
let items = $state<DockerArtefactItem[]>([]);
let dataMap = new SvelteMap<string, DockerArtefactItem>();
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

const dataHeader = $derived(items.length > 0 ? Object.keys(items[0].values) : []);

function getValue(value: string | [string, string] | [string, number], sortValue = false): string | number {
    return Array.isArray(value) ? (sortValue ? value[1] : value[0]) : value;
}

function sortData() {
    if (!sortCol) {
        return;
    }
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
    socketStore.emitAgent(endpoint, "getDockerArtefactData", artefact.name, (res: SocketRes & { data: DockerArtefactData }) => {
        fetchingData = false;
        items = res.data.data;
        dataMap.clear();
        for (const item of items) {
            dataMap.set(item.id, item);
        }
        if (!sortCol) {
            sortCol = dataHeader[0] ?? "";
        }
        sortData();
        selectedItems = [];
    });
}

const allSelected = $derived(tableData.length > 0 && selectedItems.length === tableData.length);
const someSelected = $derived(selectedItems.length > 0 && !allSelected);

function toggleSelectAll(checked: boolean) {
    selectedItems = checked ? tableData.map(item => item.id) : [];
}

function toggleSort(col: string) {
    if (sortCol !== col) {
        sortCol = col; sortDir = "UP";
    } else {
        sortDir = sortDir === "UP" ? "DOWN" : "UP";
    }
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
    socketStore.emitAgent(endpoint, "executeDockerArtefactAction", artefact.name, action, selectedItems.map(id => dataMap.get(id)?.actionIds[action] ?? id), (res: SocketRes) => {
        ctx?.stopAction();
        socketStore.toastRes(res);
        loadData();
    });
}

onMount(loadData);
</script>

<div class="artefact-wrap">
    <!-- Action buttons -->
    <div class="btn-group mb-3 action-bar" role="group">
        {#if artefact.actions.includes(DockerArtefactAction.Prune)}
            <button class="btn btn-primary btn-sm me-1" disabled={ctx?.processing} onclick={() => (showPruneDialog = true)}>
                <Icon name="wrench" /> {$t("prune")}
            </button>
        {/if}
        {#if artefact.actions.includes(DockerArtefactAction.Pull)}
            <button class="btn btn-secondary btn-sm me-1" disabled={ctx?.processing || selectedItems.length === 0} onclick={checkOpenPullDialog}>
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
        <div class="table-responsive">
            <table class="table table-sm table-striped table-hover">
                <thead>
                    <tr>
                        <th class="check-col">
                            <input
                                type="checkbox"
                                class="form-check-input row-check"
                                checked={allSelected}
                                indeterminate={someSelected}
                                disabled={tableData.length === 0}
                                aria-label={$t("selectAll")}
                                title={$t("selectAll")}
                                onchange={(e) => toggleSelectAll((e.target as HTMLInputElement).checked)}
                            />
                        </th>
                        {#each dataHeader as title (title)}
                            <th class="sortable" onclick={() => toggleSort(title)}>
                                {title}
                                <span class="sort-sym">{sortCol === title ? (sortDir === "UP" ? "▲" : "▼") : ""}</span>
                            </th>
                        {/each}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {#if tableData.length === 0}
                        <tr>
                            <td class="empty-msg" colspan={dataHeader.length + 2}>{$t("nothingFoundMsg")}</td>
                        </tr>
                    {/if}
                    {#each tableData as item (item.id)}
                        <tr>
                            <td class="check-col">
                                <input
                                    type="checkbox"
                                    class="form-check-input row-check"
                                    checked={selectedItems.includes(item.id)}
                                    onchange={(e) => {
                                        if ((e.target as HTMLInputElement).checked) {
                                            selectedItems = [ ...selectedItems, item.id ];
                                        } else {
                                            selectedItems = selectedItems.filter(i => i !== item.id);
                                        }
                                    }}
                                />
                            </td>
                            {#each Object.entries(item.values) as [ key, value ] (key)}
                                <td class="artefact-cell">{getValue(value)}</td>
                            {/each}
                            <td class="action-cell text-nowrap">
                                <!-- Button first, badge after: the button keeps the
                                     same position in every row instead of being
                                     pushed aside when a badge is present. -->
                                {#if artefact.name === "network"}
                                    <button class="btn btn-sm btn-normal" title={$t("networkInspect")} onclick={() => openNetworkInspect(item.id)}>
                                        <Icon name="circle-info" />
                                    </button>
                                {/if}
                                {#if item.dangling}
                                    <span class="badge bg-info ms-2">{item.danglingLabel}</span>
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
    title="{$t("prune")} {$tn(artefact.name, 2)}"
    yesText={$t("prune")}
    btnStyle="btn-danger"
    onyes={() => executeAction(pruneAll ? DockerArtefactAction.PruneAll : DockerArtefactAction.Prune)}
    onno={() => (pruneAll = false)}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t(artefact.name + "PruneMsg")}</p>
    {#if artefact.actions.includes(DockerArtefactAction.PruneAll)}
        <div class="form-check form-switch">
            <input id="prune-all-{artefact.name}" class="form-check-input" type="checkbox" bind:checked={pruneAll} />
            <label class="form-check-label" for="prune-all-{artefact.name}">{$t(artefact.name + "PruneAll")}</label>
        </div>
    {/if}
</Confirm>

<!-- Pull dialog -->
<Confirm
    bind:open={showPullDialog}
    title="{$t("pull")} {$tn(artefact.name, 2)}"
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
    title="{$t("delete")} {$tn(artefact.name, 2)}"
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
.artefact-wrap { display: flex; flex-direction: column; }

.action-bar { width: fit-content; }
.action-bar :global(.btn) { flex: 0 0 auto; }

.loading { padding: 1rem; color: var(--arbour-text-muted); }

.sortable { cursor: pointer; user-select: none; }

/* Reserved width so headers don't shift when the arrow appears or moves
   between columns. */
.sort-sym {
    display: inline-block;
    width: 1em;
    font-family: monospace;
    margin-left: 4px;
    color: var(--arbour-primary);
}

.check-col {
    width: 2.25rem;
    text-align: center;
}

/* The global .form-check-input is styled for label rows (top-aligned with an
   offset); inside table cells the box centers on the row instead. */
.check-col .row-check {
    vertical-align: middle;
    margin-top: 0;
    width: 1.05em;
    height: 1.05em;
}

.empty-msg {
    padding: 1rem;
    text-align: center;
    color: var(--arbour-text-muted);
}

.artefact-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.row-check { width: 1em; height: 1em; margin: 0; cursor: pointer; }

</style>
