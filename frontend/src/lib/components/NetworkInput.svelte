<script lang="ts">
import { getContext, onMount } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { COMPOSE_CONTEXT, type ComposeContext } from "$lib/context";
import type { ComposeNetwork } from "../../../../common/compose-document";
import Icon from "./Icon.svelte";

const ctx = getContext<ComposeContext>(COMPOSE_CONTEXT);

type NetworkRow = { name: string; data: unknown };

let networkList = $state<NetworkRow[]>([]);
let externalList = $state<Record<string, Record<string, unknown>>>({});
let externalNetworkList = $state<string[]>([]);

let prevNetworksData: unknown = null;

// External → internal: when the YAML editor owns the state and its network data
// actually changed, refresh the form from the document.
$effect(() => {
    const networksData = ctx.composeDocument.networks.composeData.data;
    if (ctx.editorFocus && networksData !== prevNetworksData) {
        prevNetworksData = networksData;
        loadNetworkList();
    }
});

// Internal → external: push the form's networks back into the document. Driven
// by explicit user actions (not an effect) to avoid an effect that both reads
// composeDocument via the networks getter and writes it via replace().
function commit() {
    if (ctx.editorFocus) {
        return;
    }
    const networks: Record<string, unknown> = {};
    for (const row of networkList) {
        networks[row.name] = row.data;
    }
    for (const name in externalList) {
        networks[name] = externalList[name];
    }
    ctx.composeDocument.networks.replace(networks);
    ctx.notifyDocChanged();
}

function loadNetworkList() {
    const rows: NetworkRow[] = [];
    const ext: Record<string, Record<string, unknown>> = {};

    for (const [ name, network ] of Object.entries(ctx.composeDocument.networks.getNetworks()) as [string, ComposeNetwork][]) {
        if (network.external) {
            ext[name] = Object.assign({}, network.composeData.data as Record<string, unknown>);
        } else {
            rows.push({ name,
                data: network.composeData.data });
        }
    }

    networkList = rows;
    externalList = ext;
}

function loadExternalNetworkList() {
    socketStore.emitAgent(ctx.endpoint, "getDockerNetworkList", (res: SocketRes & { dockerNetworkList?: string[] }) => {
        if (res.ok) {
            externalNetworkList = (res.dockerNetworkList ?? []).filter(n => {
                if (n.startsWith(ctx.stack.name + "_")) {
                    return false;
                }
                if (n === "none" || n === "host" || n === "bridge") {
                    return false;
                }
                return true;
            });
        } else {
            socketStore.toastRes(res);
        }
    });
}

function addField() {
    networkList = [ ...networkList, { name: "",
        data: {} }];
    commit();
}

function remove(index: number) {
    networkList = networkList.filter((_, i) => i !== index);
    commit();
}

function toggleExternal(name: string, enabled: boolean) {
    if (enabled) {
        externalList = { ...externalList,
            [name]: { ...(externalList[name] ?? {}),
                external: true } };
    } else {
        const next = { ...externalList };
        delete next[name];
        externalList = next;
    }
    commit();
}

onMount(() => {
    loadNetworkList();
    loadExternalNetworkList();
});
</script>

<div class="network-input">
    <h5>{$t("Internal Networks")}</h5>

    {#if networkList.length > 0}
        <ul class="list-group mb-2">
            {#each networkList as row, i (i)}
                <li class="list-group-item network-item">
                    <input
                        type="text"
                        class="form-control no-bg network-name-input"
                        bind:value={row.name}
                        oninput={commit}
                        placeholder={$t("Network name...")}
                    />
                    <button class="btn btn-sm btn-hover-danger remove-btn" onclick={() => remove(i)}>
                        <Icon name="xmark" />
                    </button>
                </li>
            {/each}
        </ul>
    {/if}

    <button class="btn btn-sm btn-normal" onclick={addField}>
        {$t("addInternalNetwork")}
    </button>

    <h5 class="mt-3">{$t("External Networks")}</h5>

    {#if externalNetworkList.length === 0}
        <p class="text-muted">{$t("No External Networks")}</p>
    {:else}
        <div class="external-list">
            {#each externalNetworkList as networkName, i (networkName)}
                <div class="form-check form-switch">
                    <input
                        id="ext-net-{i}"
                        class="form-check-input"
                        type="checkbox"
                        checked={networkName in externalList}
                        onchange={(e) => toggleExternal(networkName, (e.target as HTMLInputElement).checked)}
                    />
                    <label class="form-check-label" for="ext-net-{i}">{networkName}</label>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
.network-input { display: flex; flex-direction: column; }

h5 { margin: 0 0 0.5rem; font-size: 0.9rem; font-weight: 600; }

.network-item {
    display: flex;
    align-items: center;
    padding: 0.4rem 0.5rem 0.4rem 0.75rem;
}

.network-name-input {
    flex: 1;
    background: none;
    border: none;
    padding: 0;
    color: var(--arbour-text);
    outline: none;
    font-size: 0.9rem;
    min-width: 0;
}

.remove-btn { flex-shrink: 0; }

.external-list { display: flex; flex-direction: column; }
</style>
