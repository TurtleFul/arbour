<script lang="ts">
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import Icon from "./Icon.svelte";
import type { NetworkInspectData } from "../../../../common/types";

let {
    open = $bindable(false),
    endpoint,
    networkId,
} = $props<{
    open?: boolean;
    endpoint: string;
    networkId: string;
}>();

let dialogEl: HTMLDialogElement;
let loading = $state(false);
let error = $state<string | null>(null);
let data = $state<NetworkInspectData | null>(null);

$effect(() => {
    if (!dialogEl) {
        return;
    }
    if (open) {
        dialogEl.showModal();
        fetchData();
    } else {
        dialogEl.close();
        data = null;
        error = null;
    }
});

function close() {
    open = false;
}

function fetchData() {
    loading = true;
    error = null;
    data = null;

    socketStore.emitAgent(endpoint, "getNetworkInspect", networkId, (res: { ok: boolean; data: NetworkInspectData; msg?: string }) => {
        loading = false;
        if (res.ok) {
            data = res.data;
        } else {
            error = res.msg ?? "Failed to load network details";
        }
    });
}
</script>

<dialog
    bind:this={dialogEl}
    onclose={() => (open = false)}
    onclick={(e) => {
        if (e.target === dialogEl) {
            close();
        }
    }}
>
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">{$t("networkInspect")}</h5>
            <button class="btn-close" onclick={close} aria-label="Close"></button>
        </div>

        <div class="modal-body">
            {#if loading}
                <div class="loading-state">
                    <Icon name="spinner" spin={true} />
                    <span>{$t("loading")}</span>
                </div>
            {:else if error}
                <div class="error-state">
                    <Icon name="exclamation-circle" />
                    {error}
                </div>
            {:else if data}
                <div class="network-panel">
                    <div class="net-header">
                        <div class="net-header-icon"><Icon name="link" /></div>
                        <div class="flex-grow-1">
                            <div class="net-name">{data.name}</div>
                            <div class="badge-row">
                                <span class="badge bg-info">{data.driver}</span>
                                <span class="badge bg-secondary">{data.scope}</span>
                                {#if data.internal}
                                    <span class="badge bg-warning">
                                        <Icon name="ban" /> {$t("networkInternal")}
                                    </span>
                                {/if}
                                {#if data.ipv6}
                                    <span class="badge bg-primary">IPv6</span>
                                {/if}
                            </div>
                        </div>
                    </div>

                    {#if data.subnets.length > 0}
                        <div class="section">
                            <div class="section-label">{$t("networkSubnets")}</div>
                            <div class="data-rows">
                                <div class="data-row-header subnet-row">
                                    <span>{$t("networkSubnet")}</span>
                                    <span>{$t("networkGateway")}</span>
                                </div>
                                {#each data.subnets as s, i (i)}
                                    <div class="data-row subnet-row">
                                        <span class="mono-chip">{s.subnet || "—"}</span>
                                        <span class="mono-chip">{s.gateway || "—"}</span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <div class="section">
                        <div class="section-label">
                            {$t("networkContainers")}
                            <span class="count-pip">{data.containers.length}</span>
                        </div>

                        {#if data.containers.length === 0}
                            <div class="empty-state">
                                <Icon name="unlink" class="empty-icon" />
                                <span>{$t("networkNoContainers")}</span>
                            </div>
                        {:else}
                            <div class="data-rows">
                                <div class="data-row-header container-row">
                                    <span>{$t("name")}</span>
                                    <span>IPv4</span>
                                    <span>IPv6</span>
                                    <span>MAC</span>
                                </div>
                                {#each data.containers as c, i (i)}
                                    <div class="data-row container-row">
                                        <span class="container-name">{c.name}</span>
                                        <span class="mono-chip">{c.ipv4 || "—"}</span>
                                        <span class="mono-chip">{c.ipv6 || "—"}</span>
                                        <span class="mono-chip mono-chip-muted">{c.mac || "—"}</span>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>

        <div class="modal-footer">
            <button class="btn btn-secondary" onclick={close}>{$t("close")}</button>
        </div>
    </div>
</dialog>

<style>
dialog { max-width: 660px; width: calc(100% - 2rem); }

.modal-body { max-height: 70vh; overflow-y: auto; }

.loading-state, .error-state {
    padding: 1.5rem; text-align: center;
    font-size: 0.9rem;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
}
.error-state { color: var(--arbour-danger); }

.net-header {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 1rem; margin-bottom: 1.25rem;
    background: var(--arbour-bg-deep);
    border: 1px solid var(--arbour-border);
    border-left: 3px solid var(--arbour-primary);
    border-radius: var(--arbour-radius);
}
.net-header-icon {
    flex-shrink: 0; width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--arbour-primary) 12%, transparent);
    color: var(--arbour-primary);
    border-radius: var(--arbour-radius-sm); font-size: 15px;
}
.net-name { font-size: 1rem; font-weight: 600; word-break: break-all; }
.badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }

.section { margin-bottom: 1.25rem; }

.section-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--arbour-text-muted); margin-bottom: 10px;
}
.section-label::before {
    content: ''; display: block; width: 3px; height: 13px;
    background: var(--arbour-primary); border-radius: 2px; flex-shrink: 0;
}
.count-pip {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px;
    background: var(--arbour-bg-header-active); color: var(--arbour-text-subtle);
    border-radius: var(--arbour-radius-pill); font-size: 10px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
}

.data-rows { border: 1px solid var(--arbour-border); border-radius: var(--arbour-radius); overflow: hidden; }
.data-row-header {
    display: grid; grid-template-columns: 1fr 1fr;
    padding: 8px 16px; background: var(--arbour-bg-header);
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--arbour-text-muted);
}
.data-row-header.container-row,
.data-row.container-row { grid-template-columns: 2fr 1.2fr 1.2fr 1.6fr; }
.subnet-row { grid-template-columns: 1fr 1fr; }

.data-row {
    display: grid; grid-template-columns: 1fr 1fr;
    padding: 13px 16px; align-items: center; gap: 8px;
    border-top: 1px solid var(--arbour-border);
    background: var(--arbour-bg-deep);
    transition: background 0.12s;
}
.data-row:hover { background: var(--arbour-bg-header); }

.container-name { font-size: 13px; font-weight: 500; word-break: break-all; }

.mono-chip {
    display: inline-block;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: var(--arbour-info);
    background: color-mix(in srgb, var(--arbour-info) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--arbour-info) 20%, transparent);
    border-radius: var(--arbour-radius-sm); padding: 2px 7px;
}
.mono-chip-muted {
    color: var(--arbour-text-muted);
    background: color-mix(in srgb, var(--arbour-text) 5%, transparent);
    border-color: var(--arbour-border);
}

.network-panel { display: flex; flex-direction: column; gap: 0; }

.empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 28px; border: 1px dashed var(--arbour-border);
    border-radius: var(--arbour-radius); color: var(--arbour-text-muted);
    font-size: 13px; font-style: italic;
}
</style>
