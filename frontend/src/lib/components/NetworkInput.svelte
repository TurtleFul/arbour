<script lang="ts">
import { getContext, onMount } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { COMPOSE_CONTEXT, type ComposeContext } from "$lib/context";
import type { ComposeNetwork } from "../../../../common/compose-document";
import Icon from "./Icon.svelte";

const ctx = getContext<ComposeContext>(COMPOSE_CONTEXT);

type NetworkRow = { name: string; data: unknown };

let networkList = $state<NetworkRow[]>([]);
let externalList = $state<Record<string, Record<string, unknown>>>({});
let selectedExternalList = $state<Record<string, boolean>>({});
let externalNetworkList = $state<string[]>([]);

let prevNetworksData: unknown = null;

$effect(() => {
    const networksData = ctx.composeDocument.networks.composeData.data;
    if (ctx.editorFocus && networksData !== prevNetworksData) {
        prevNetworksData = networksData;
        loadNetworkList();
    }
});

$effect(() => {
    const _ = networkList.map(n => n.name); // track mutations
    applyToComposeDocument();
});

$effect(() => {
    const selected = { ...selectedExternalList }; // track
    for (const networkName in selected) {
        const enable = selected[networkName];
        if (enable) {
            if (!externalList[networkName]) externalList[networkName] = {};
            externalList[networkName].external = true;
        } else {
            const next = { ...externalList };
            delete next[networkName];
            externalList = next;
        }
    }
    applyToComposeDocument();
});

function loadNetworkList() {
    const rows: NetworkRow[] = [];
    const ext: Record<string, Record<string, unknown>> = {};

    for (const [name, network] of Object.entries(ctx.composeDocument.networks.getNetworks()) as [string, ComposeNetwork][]) {
        if (network.external) {
            ext[name] = Object.assign({}, network.composeData.data as Record<string, unknown>);
        } else {
            rows.push({ name, data: network.composeData.data });
        }
    }

    networkList = rows;
    externalList = ext;

    const sel: Record<string, boolean> = {};
    for (const name in ext) sel[name] = true;
    selectedExternalList = sel;
}

function loadExternalNetworkList() {
    socketStore.emitAgent(ctx.endpoint, "getDockerNetworkList", (res: { ok: boolean; dockerNetworkList?: string[]; msg?: string }) => {
        if (res.ok) {
            externalNetworkList = (res.dockerNetworkList ?? []).filter(n => {
                if (n.startsWith(ctx.stack.name + "_")) return false;
                if (n === "none" || n === "host" || n === "bridge") return false;
                return true;
            });
        } else {
            socketStore.toastRes(res as any);
        }
    });
}

function addField() {
    networkList = [...networkList, { name: "", data: {} }];
}

function remove(index: number) {
    networkList = networkList.filter((_, i) => i !== index);
}

function applyToComposeDocument() {
    if (ctx.editorFocus) return;

    const networks: Record<string, unknown> = {};
    for (const row of networkList) {
        networks[row.name] = row.data;
    }
    for (const name in externalList) {
        networks[name] = externalList[name];
    }
    ctx.composeDocument.networks.replace(networks);
}

onMount(() => {
    loadNetworkList();
    loadExternalNetworkList();
});
</script>

<div class="network-input">
    <h5>{$t("Internal Networks")}</h5>

    {#if networkList.length > 0}
        <ul class="network-list">
            {#each networkList as row, i (i)}
                <li class="network-item">
                    <input
                        type="text"
                        class="network-name-input"
                        bind:value={row.name}
                        placeholder={$t("Network name...")}
                    />
                    <button class="remove-btn" onclick={() => remove(i)}>
                        <Icon name="xmark" />
                    </button>
                </li>
            {/each}
        </ul>
    {/if}

    <button class="btn btn-sm btn-ghost" onclick={addField}>
        {$t("addInternalNetwork")}
    </button>

    <h5 class="mt">{$t("External Networks")}</h5>

    {#if externalNetworkList.length === 0}
        <p class="empty-text">{$t("No External Networks")}</p>
    {:else}
        <div class="external-list">
            {#each externalNetworkList as networkName, i (networkName)}
                <label class="external-item">
                    <input
                        id="ext-net-{i}"
                        type="checkbox"
                        checked={selectedExternalList[networkName] ?? false}
                        onchange={(e) => {
                            selectedExternalList = {
                                ...selectedExternalList,
                                [networkName]: (e.target as HTMLInputElement).checked
                            };
                        }}
                    />
                    <span>{networkName}</span>
                </label>
            {/each}
        </div>
    {/if}
</div>

<style>
.network-input { display: flex; flex-direction: column; gap: 0.5rem; }

h5 { margin: 0; font-size: 0.9rem; font-weight: 600; }
.mt { margin-top: 0.75rem; }

.network-list {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--arbour-bg-deep);
    border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}

.network-item {
    display: flex;
    align-items: center;
    padding: 0.4rem 0.5rem 0.4rem 0.75rem;
    border-bottom: 1px solid var(--arbour-border);
}
.network-item:last-child { border-bottom: none; }

.network-name-input {
    flex: 1;
    background: none;
    border: none;
    color: var(--arbour-text);
    outline: none;
    font-size: 0.9rem;
    min-width: 0;
}
.network-name-input::placeholder { color: var(--arbour-text-muted); }

.remove-btn {
    background: none;
    border: none;
    color: var(--arbour-danger);
    cursor: pointer;
    padding: 0.1rem 0.3rem;
    border-radius: var(--arbour-radius-sm);
    flex-shrink: 0;
}
.remove-btn:hover { background: color-mix(in srgb, var(--arbour-danger) 12%, transparent); }

.btn-ghost {
    background: none;
    border: 1px solid var(--arbour-border);
    color: var(--arbour-text-muted);
    cursor: pointer;
    padding: 0.25rem 0.6rem;
    border-radius: var(--arbour-radius-sm);
    font-size: 0.85rem;
    align-self: flex-start;
}
.btn-ghost:hover { background: var(--arbour-bg-deep); color: var(--arbour-text); }

.empty-text { color: var(--arbour-text-muted); font-size: 0.85rem; margin: 0; }

.external-list { display: flex; flex-direction: column; gap: 0.4rem; }

.external-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
}
.external-item input { width: auto; cursor: pointer; }
</style>
