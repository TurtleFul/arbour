<script lang="ts">
import { getContext } from "svelte";
import { t } from "svelte-i18n";
import { tn } from "$lib/stores/lang.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { COMPOSE_CONTEXT, type ComposeContext } from "$lib/context";
import { parseDockerPort } from "../../../../common/util-common";
import { LABEL_STATUS_IGNORE, LABEL_IMAGEUPDATES_CHECK, LABEL_IMAGEUPDATES_IGNORE, LABEL_IMAGEUPDATES_CHANGELOG } from "../../../../common/compose-labels";
import type { ServiceData, StatsData, ServiceEventEntry } from "../../../../common/types";
import Icon from "./Icon.svelte";
import DockerStats from "./DockerStats.svelte";
import ArrayInput from "./ArrayInput.svelte";
import ArraySelect from "./ArraySelect.svelte";

const {
    name,
    isEditMode = false,
    service = {} as ServiceData,
    stats = undefined,
} : {
    name: string;
    isEditMode?: boolean;
    service?: ServiceData;
    stats?: StatsData;
} = $props();

const ctx = getContext<ComposeContext>(COMPOSE_CONTEXT);

let showConfig = $state(false);
let expandedStats = $state(false);
let updateDialogData = $state({ pruneAfterUpdate: false,
    pruneAllAfterUpdate: false });
let eventLogEntries = $state<ServiceEventEntry[]>([]);
let eventLogLoading = $state(false);
let showUpdateDialog = $state(false);
let showEventLogDialog = $state(false);
let updateDialogEl = $state<HTMLDialogElement | undefined>(undefined);
let eventLogDialogEl = $state<HTMLDialogElement | undefined>(undefined);

$effect(() => {
    if (!updateDialogEl) {
        return;
    }
    if (showUpdateDialog) {
        updateDialogEl.showModal();
    } else {
        updateDialogEl.close();
    }
});
$effect(() => {
    if (!eventLogDialogEl) {
        return;
    }
    if (showEventLogDialog) {
        eventLogDialogEl.showModal();
    } else {
        eventLogDialogEl.close();
    }
});

const inactive = $derived(Object.keys(service).length === 0);

const status = $derived(() => {
    const healthStatus = (service as ServiceData).health;
    return healthStatus ? healthStatus : (inactive ? "inactive" : (service as ServiceData).state);
});

const bgStyle = $derived(() => {
    const s = status();
    if (s === "running" || s === "healthy") {
        return "badge-running";
    }
    if (s === "unhealthy") {
        return "bg-danger";
    }
    if (s === "inactive") {
        return "badge-inactive";
    }
    return "bg-secondary";
});

const started = $derived(() => {
    const s = status();
    return s === "starting" || s === "running" || s === "healthy" || s === "unhealthy" || s === "stopping";
});

const composeService = $derived(ctx.composeDocument.services.getService(name));

const ignoreStatus = $derived(composeService.labels.isTrue(LABEL_STATUS_IGNORE));
const checkImageUpdates = $derived(!composeService.labels.isFalse(LABEL_IMAGEUPDATES_CHECK));
const changelogLink = $derived(composeService.labels.get(LABEL_IMAGEUPDATES_CHANGELOG, ""));

const lastRestart = $derived(eventLogEntries.find(e => e.eventType === "restart" || e.eventType === "start") ?? null);
const lastUpdate = $derived(eventLogEntries.find(e => e.eventType === "update") ?? null);

function logLink() {
    return ctx.endpoint
        ? `/log/${ctx.stack.name}/${name}/${ctx.endpoint}`
        : `/log/${ctx.stack.name}/${name}`;
}

function inspectLink() {
    const containerName = (service as ServiceData).containerName;
    return ctx.endpoint
        ? `/inspect/${containerName}/${ctx.endpoint}`
        : `/inspect/${containerName}`;
}

function terminalLink() {
    return ctx.endpoint
        ? `/terminal/${ctx.stack.name}/${name}/bash/${ctx.endpoint}`
        : `/terminal/${ctx.stack.name}/${name}/bash`;
}

function parsePort(port: string) {
    if (ctx.stack.endpoint) {
        return parseDockerPort(port, ctx.stack.primaryHostname);
    }
    const hostname = socketStore.info.primaryHostname as string || location.hostname;
    return parseDockerPort(port, hostname);
}

function fetchEventLog() {
    eventLogLoading = true;
    socketStore.emitAgent(ctx.endpoint, "getServiceEventLog", ctx.stack.name, name, (res: { ok: boolean; events?: ServiceEventEntry[] }) => {
        eventLogLoading = false;
        if (res.ok) {
            eventLogEntries = res.events ?? [];
        }
    });
}

function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) {
        return `${seconds}s ago`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    return `${Math.floor(hours / 24)}d ago`;
}

function formatAbsoluteTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
}

function eventTypeBadge(eventType: string): string {
    const map: Record<string, string> = {
        update: "ev-primary",
        deploy: "ev-success",
        restart: "ev-warning",
        recreate: "ev-info",
        start: "ev-success",
        stop: "ev-secondary",
        down: "ev-dark",
    };
    return map[eventType] ?? "ev-secondary";
}

function triggerBadge(trigger: string): string {
    const map: Record<string, string> = {
        manual: "ev-secondary",
        scheduled: "ev-info",
        immediate: "ev-warning",
    };
    return map[trigger] ?? "ev-secondary";
}

function stopService() {
    ctx.startComposeAction();
    socketStore.emitAgent(ctx.endpoint, "stopService", ctx.stack.name, name, (res: SocketRes) => {
        ctx.stopComposeAction();
        socketStore.toastRes(res);
    });
}

function startService() {
    ctx.startComposeAction();
    socketStore.emitAgent(ctx.endpoint, "startService", ctx.stack.name, name, (res: SocketRes) => {
        ctx.stopComposeAction();
        socketStore.toastRes(res);
    });
}

function restartService() {
    ctx.startComposeAction();
    socketStore.emitAgent(ctx.endpoint, "restartService", ctx.stack.name, name, (res: SocketRes) => {
        ctx.stopComposeAction();
        socketStore.toastRes(res);
    });
}

function recreateService() {
    ctx.startComposeAction();
    socketStore.emitAgent(ctx.endpoint, "recreateService", ctx.stack.name, name, (res: SocketRes) => {
        ctx.stopComposeAction();
        socketStore.toastRes(res);
    });
}

function updateService() {
    showUpdateDialog = false;
    ctx.startComposeAction();
    socketStore.emitAgent(ctx.endpoint, "updateService", ctx.stack.name, name,
        updateDialogData.pruneAfterUpdate, updateDialogData.pruneAllAfterUpdate,
        (res: SocketRes) => {
            ctx.stopComposeAction();
            socketStore.toastRes(res);
        });
}

function skipCurrentUpdate() {
    showUpdateDialog = false;
    composeService.labels.set(LABEL_IMAGEUPDATES_IGNORE, (service as ServiceData).remoteImageDigest);
    ctx.saveStack();
}

function remove() {
    ctx.composeDocument.services.delete(name);
}

function updateIgnoreStatus(checked: boolean) {
    if (checked) {
        composeService.labels.set(LABEL_STATUS_IGNORE, true);
    } else {
        composeService.labels.delete(LABEL_STATUS_IGNORE);
        composeService.labels.removeIfEmpty();
    }
}

function updateCheckImageUpdates(checked: boolean) {
    if (checked) {
        composeService.labels.delete(LABEL_IMAGEUPDATES_CHECK);
        composeService.labels.removeIfEmpty();
    } else {
        composeService.labels.set(LABEL_IMAGEUPDATES_CHECK, false);
    }
}

function updateChangelogLink(link: string) {
    if (link) {
        composeService.labels.set(LABEL_IMAGEUPDATES_CHANGELOG, link);
    } else {
        composeService.labels.delete(LABEL_IMAGEUPDATES_CHANGELOG);
        composeService.labels.removeIfEmpty();
    }
}
</script>

<div class="shadow-box big-padding mb-3 container">
    <div class="service-header">
        <h4 class="service-title">{name}</h4>
        <div class="service-actions">
            {#if !isEditMode && (service as ServiceData).recreateNecessary}
                <button class="btn btn-sm btn-info" title={$t("tooltipServiceRecreate")}
                    disabled={ctx.processing} onclick={recreateService}>
                    <Icon name="rocket" />
                </button>
            {/if}

            {#if !isEditMode && (service as ServiceData).imageUpdateAvailable}
                <button class="btn btn-sm btn-info" title={$t("tooltipServiceUpdate")}
                    disabled={ctx.processing} onclick={() => (showUpdateDialog = true)}>
                    <Icon name="arrow-up" />
                </button>
            {/if}

            {#if !isEditMode}
                <div class="btn-group">
                    <button class="btn btn-sm btn-normal" title={$t("serviceEventLog")}
                        onclick={() => {
                            fetchEventLog(); showEventLogDialog = true;
                        }}>
                        <Icon name="heartbeat" />
                    </button>
                    {#if started()}
                        <a class="btn btn-sm btn-normal" title={$t("tooltipServiceLog")} href={logLink()}>
                            <Icon name="file-lines" />
                        </a>
                        <a class="btn btn-sm btn-normal" title={$t("tooltipServiceInspect")} href={inspectLink()}>
                            <Icon name="circle-info" />
                        </a>
                        <a class="btn btn-sm btn-normal" title={$t("tooltipServiceTerminal")} href={terminalLink()}>
                            <Icon name="terminal" />
                        </a>
                    {/if}
                </div>
            {/if}

            {#if !isEditMode}
                <div class="btn-group">
                    {#if !started() && !inactive}
                        <button type="button" class="btn btn-sm btn-success" title={$t("tooltipServiceStart")}
                            disabled={ctx.processing} onclick={startService}>
                            <Icon name="play" />
                        </button>
                    {/if}
                    {#if started()}
                        <button type="button" class="btn btn-sm btn-danger" title={$t("tooltipServiceStop")}
                            disabled={ctx.processing} onclick={stopService}>
                            <Icon name="stop" />
                        </button>
                        <button type="button" class="btn btn-sm btn-warning" title={$t("tooltipServiceRestart")}
                            disabled={ctx.processing} onclick={restartService}>
                            <Icon name="rotate" />
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>

    {#if !isEditMode}
        {#if (service as ServiceData).recreateNecessary}
            <div class="notification">{$t("recreateNecessary")}</div>
        {/if}
        <div class="service-meta">
            <div class="image-label">
                <span>{composeService.imageName}:</span><span class="tag">{composeService.imageTag}</span>
            </div>
            {#if started()}
                <div class="status-text">{(service as ServiceData).status}</div>
            {/if}
        </div>
        <div class="badges">
            <span class="badge {bgStyle()}">{status()}</span>
            {#if started()}
                {#each composeService.get("ports", [], true) as port (port)}
                    <a href={parsePort(port).url} target="_blank" class="port-link">
                        <span class="badge bg-secondary">{parsePort(port).display}</span>
                    </a>
                {/each}
            {/if}
        </div>

        {#if stats}
            <div class="stats-row">
                <button class="stats-toggle" onclick={() => (expandedStats = !expandedStats)}>
                    <Icon name={expandedStats ? "chevron-down" : "chevron-right"} />
                </button>
                {#if !expandedStats}
                    <span class="stat">{$t("CPU")}: {stats.cpuPerc}</span>
                    <span class="stat">{$t("memoryAbbreviated")}: {stats.memUsage}</span>
                {:else}
                    <DockerStats {stats} />
                {/if}
            </div>
        {/if}
    {/if}

    {#if isEditMode}
        <div class="edit-actions">
            <button class="btn btn-sm btn-normal" onclick={() => (showConfig = !showConfig)}>
                <Icon name="pen-to-square" /> {$t("Edit")}
            </button>
            <button class="btn btn-sm btn-danger" onclick={remove}>
                <Icon name="trash" /> {$t("deleteContainer")}
            </button>
        </div>

        {#if showConfig}
            <div class="config">
                <div class="config-section">
                    <h5>{$t("dockerImage")}</h5>
                    <input class="form-control" bind:value={composeService.image} list="image-datalist-{name}" />
                    <datalist id="image-datalist-{name}">
                        <option value="louislam/uptime-kuma:1"></option>
                    </datalist>
                </div>

                <div class="config-section">
                    <h5>{$tn("port", 2)}</h5>
                    <ArrayInput composeArray={composeService.ports} displayName={$t("port")} placeholder="HOST:CONTAINER" />
                </div>

                <div class="config-section">
                    <h5>{$tn("volume", 2)}</h5>
                    <ArrayInput composeArray={composeService.volumes} displayName={$t("volume")} placeholder="HOST:CONTAINER" />
                </div>

                <div class="config-section">
                    <h5>{$t("restartPolicy")}</h5>
                    <select class="form-select" bind:value={composeService.restart}>
                        <option value="always">{$t("restartPolicyAlways")}</option>
                        <option value="unless-stopped">{$t("restartPolicyUnlessStopped")}</option>
                        <option value="on-failure">{$t("restartPolicyOnFailure")}</option>
                        <option value="no">{$t("restartPolicyNo")}</option>
                    </select>
                </div>

                <div class="config-section">
                    <h5>{$tn("environmentVariable", 2)}</h5>
                    <ArrayInput composeArray={composeService.environment} displayName={$t("environmentVariable")} placeholder="KEY=VALUE" />
                </div>

                <div class="config-section">
                    <h5>{$tn("network", 2)}</h5>
                    {#if ctx.composeDocument.networks.isEmpty() && !composeService.networks.isEmpty()}
                        <p class="warn">{$t("NoNetworksAvailable")}</p>
                    {/if}
                    <ArraySelect composeArray={composeService.networks} displayName={$t("network")} options={ctx.composeDocument.networks.names} />
                </div>

                <div class="config-section">
                    <h5>{$t("dependsOn")}</h5>
                    <ArrayInput composeArray={composeService.dependsOn} displayName={$t("dependsOn")} placeholder={$t("containerName")} />
                </div>

                <div class="config-section">
                    <h5>Arbour</h5>
                    <div class="form-check form-switch">
                        <input id="ignore-status-{name}" class="form-check-input" type="checkbox" checked={ignoreStatus}
                            onchange={(e) => updateIgnoreStatus((e.target as HTMLInputElement).checked)} />
                        <label class="form-check-label" for="ignore-status-{name}">{$t("ignoreStatus")}</label>
                    </div>
                    <div class="form-check form-switch">
                        <input id="check-img-{name}" class="form-check-input" type="checkbox" checked={checkImageUpdates}
                            onchange={(e) => updateCheckImageUpdates((e.target as HTMLInputElement).checked)} />
                        <label class="form-check-label" for="check-img-{name}">{$t("checkImageUpdates")}</label>
                    </div>
                    <input class="form-control" value={changelogLink}
                        oninput={(e) => updateChangelogLink((e.target as HTMLInputElement).value)} />
                    <div class="form-text">{$t("changelogLink")}</div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<!-- Image update dialog -->
<dialog bind:this={updateDialogEl} class="update-dialog" onclose={() => (showUpdateDialog = false)}
    onclick={(e) => {
        if (e.target === e.currentTarget) {
            showUpdateDialog = false;
        }
    }}>
    <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">{$tn("imageUpdate", 1)}</h5>
                <button class="btn-close" aria-label="Close" onclick={() => (showUpdateDialog = false)}></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <h6>{$t("image")}</h6>
                    <span>{composeService.image}</span>
                </div>
                {#if changelogLink}
                    <div class="mb-3">
                        <h6>{$t("changelog")}</h6>
                        <a href={changelogLink} target="_blank">{changelogLink}</a>
                    </div>
                {/if}
                <div class="form-check">
                    <input id="prune-after-{name}" class="form-check-input" type="checkbox" bind:checked={updateDialogData.pruneAfterUpdate} />
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    <label class="form-check-label" for="prune-after-{name}">{@html $t("pruneAfterUpdate")}</label>
                </div>
                <div class="ms-3">
                    <div class="form-check">
                        <input id="prune-all-{name}" class="form-check-input" type="checkbox"
                            checked={updateDialogData.pruneAfterUpdate && updateDialogData.pruneAllAfterUpdate}
                            disabled={!updateDialogData.pruneAfterUpdate}
                            onchange={(e) => (updateDialogData.pruneAllAfterUpdate = (e.target as HTMLInputElement).checked)} />
                        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                        <label class="form-check-label" for="prune-all-{name}">{@html $t("pruneAllAfterUpdate")}</label>
                    </div>
                </div>
            </div>
        <div class="modal-footer">
            <button class="btn btn-normal" title={$t("tooltipServiceUpdateIgnore")} onclick={skipCurrentUpdate}>
                <Icon name="ban" /> {$t("ignoreUpdate")}
            </button>
            <button class="btn btn-primary" title={$t("tooltipDoServiceUpdate")} onclick={updateService}>
                <Icon name="cloud-arrow-down" /> {$t("updateStack")}
            </button>
        </div>
    </div>
</dialog>

<!-- Event log dialog -->
<dialog bind:this={eventLogDialogEl} class="event-log-dialog" onclose={() => (showEventLogDialog = false)}
    onclick={(e) => {
        if (e.target === e.currentTarget) {
            showEventLogDialog = false;
        }
    }}>
    <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">{$t("serviceEventLog")}</h5>
                <button class="btn-close" aria-label="Close" onclick={() => (showEventLogDialog = false)}></button>
            </div>
            <div class="modal-body">
                {#if eventLogLoading}
                    <!-- intentionally empty while loading; avoids spinner flash -->
                {:else if eventLogEntries.length === 0}
                    <div class="empty-state">{$t("noEventsYet")}</div>
                {:else}
                    <div class="event-summary">
                        {#if lastRestart}
                            <div>
                                <div class="summary-label">{$t("lastRestart")}</div>
                                <div class="summary-val">{formatRelativeTime(lastRestart.timestamp)}</div>
                            </div>
                        {/if}
                        {#if lastUpdate}
                            <div>
                                <div class="summary-label">{$t("lastUpdate")}</div>
                                <div class="summary-val">{formatRelativeTime(lastUpdate.timestamp)}</div>
                            </div>
                        {/if}
                        {#if (service as ServiceData).lastImageCheck}
                            <div>
                                <div class="summary-label">{$t("lastImageCheck")}</div>
                                <div class="summary-val">{formatRelativeTime((service as ServiceData).lastImageCheck!)}</div>
                            </div>
                        {/if}
                    </div>
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr>
                                <th>{$t("time")}</th>
                                <th>{$t("service")}</th>
                                <th>{$t("event")}</th>
                                <th>{$t("trigger")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each eventLogEntries as entry (entry.id)}
                                <tr>
                                    <td class="text-nowrap" title={formatAbsoluteTime(entry.timestamp)}>
                                        {formatRelativeTime(entry.timestamp)}
                                    </td>
                                    <td class="text-muted small">{entry.serviceName || $t("wholeStack")}</td>
                                    <td><span class="ev-badge {eventTypeBadge(entry.eventType)}">{entry.eventType}</span></td>
                                    <td><span class="ev-badge {triggerBadge(entry.trigger)}">{entry.trigger}</span></td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick={() => (showEventLogDialog = false)}>{$t("close")}</button>
        </div>
    </div>
</dialog>

<style>
.container { max-width: 100%; }

.service-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 12px;
    row-gap: 6px;
    margin-bottom: 12px;
}

.service-title {
    margin: 0;
    margin-right: auto;
    font-size: 1.5rem;
    font-weight: 500;
}

.service-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.notification { font-size: 1rem; color: var(--arbour-danger); margin-bottom: 0.5rem; }

.service-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    font-size: 0.85rem;
    color: var(--arbour-text-subtle);
    margin-bottom: 8px;
    gap: 4px;
}
.image-label .tag { color: var(--arbour-text-subtle); }

.badges { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
.port-link { display: inline-flex; align-items: center; text-decoration: none; }

.badge-running { background: var(--arbour-primary); color: var(--arbour-text-on-primary); }
.badge-inactive { background: var(--arbour-bg-header-active); color: var(--arbour-text-muted); }

.stats-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
    font-size: 0.8rem;
}
.stats-toggle {
    background: none; border: none; color: var(--arbour-text-muted);
    cursor: pointer; padding: 0; font-size: 0.9rem;
}
.stat { color: var(--arbour-text-muted); }

.edit-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }

.config { margin-top: 1rem; display: flex; flex-direction: column; gap: 1.25rem; }
.config-section { display: flex; flex-direction: column; gap: 0.5rem; }
.config-section h5 { margin: 0; font-size: 0.9rem; font-weight: 600; }

.warn { color: var(--arbour-warning); font-size: 0.85rem; margin: 0; }

.status-text { font-size: 0.78rem; color: var(--arbour-text-muted); font-family: 'JetBrains Mono', monospace; }

.update-dialog { max-width: 480px; width: calc(100% - 2rem); }
.event-log-dialog { max-width: 800px; width: calc(100% - 2rem); }
.event-log-dialog .modal-content { padding: 0; }
.event-log-dialog .modal-header { padding: 1rem 1.25rem; }
.event-log-dialog .modal-body { padding: 1rem 1.25rem; max-height: 65vh; overflow-y: auto; }
.event-log-dialog .modal-footer { padding: 0.75rem 1.25rem; }

.empty-state {
    padding: 1.5rem; text-align: center; color: var(--arbour-text-muted);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
}

.event-summary {
    display: flex; gap: 1.5rem; margin-bottom: 1rem;
}
.summary-label { font-size: 0.75rem; color: var(--arbour-text-muted); }
.summary-val { font-size: 0.8rem; color: var(--arbour-text-muted); }

.small { font-size: 0.8rem; }

.ev-badge {
    display: inline-block; padding: 0.15em 0.4em;
    border-radius: var(--arbour-radius-pill); font-size: 0.72rem; font-weight: 600;
}
.ev-primary { background: var(--arbour-primary); color: var(--arbour-text-on-primary); }
.ev-success { background: var(--arbour-success); color: var(--arbour-text-on-primary); }
.ev-warning { background: var(--arbour-warning); color: var(--arbour-text-on-warning); }
.ev-info { background: var(--arbour-info); color: var(--arbour-text-on-primary); }
.ev-secondary { background: var(--arbour-bg-header-active); color: var(--arbour-text-muted); }
.ev-dark { background: var(--arbour-bg-deep); color: var(--arbour-text-muted); }
</style>
