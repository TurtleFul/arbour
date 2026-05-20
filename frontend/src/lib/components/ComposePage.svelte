<script lang="ts">
import { setContext, onMount, onDestroy } from "svelte";
import { goto } from "$app/navigation";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { COMPOSE_CONTEXT } from "$lib/context";
import {
    COMBINED_TERMINAL_COLS,
    COMBINED_TERMINAL_ROWS,
    getCombinedTerminalName,
    getComposeTerminalName,
    UNKNOWN,
} from "../../../../common/util-common";
import { ComposeDocument } from "../../../../common/compose-document";
import type { StackData, StackAutoUpdateSettings, AutoUpdateMode } from "../../../../common/types";
import Uptime from "./Uptime.svelte";
import Container from "./Container.svelte";
import NetworkInput from "./NetworkInput.svelte";
import ArrayInput from "./ArrayInput.svelte";
import CodeEditor from "./CodeEditor.svelte";
import Terminal from "./Terminal.svelte";
import ProgressTerminal from "./ProgressTerminal.svelte";
import Confirm from "./Confirm.svelte";
import Icon from "./Icon.svelte";

const {
    stackName: initialStackName = "",
    routeEndpoint = "",
    isAdd = false,
} = $props<{
    stackName?: string;
    routeEndpoint?: string;
    isAdd?: boolean;
}>();

const composeTemplate = `services:
  nginx:
    image: nginx:latest
    restart: unless-stopped
    ports:
      - "8080:80"
`;
const envDefault = "# VARIABLE=value #comment";
const LS_KEY = "logTimestampMode";

interface ProgressTerminalInstance { show(): void; hideWithTimeout(): void; }
interface TerminalInstance { rebind(): void; updateTerminalSize(): void; }

let stack = $state<StackData>({} as StackData);
let composeDocument = $state(new ComposeDocument());
let processing = $state(false);
let editorFocus = $state(false);
let isEditMode = $state(false);
let yamlError = $state("");
let showUpdateDialog = $state(false);
let showDeleteDialog = $state(false);
let showImportDialog = $state(false);
let showImportRelativePathWarning = $state(false);
let showMoreMenu = $state(false);
let importSourceDir = $state("");
let newContainerName = $state("");
let updateDialogData = $state({ pruneAfterUpdate: false, pruneAllAfterUpdate: false });
let autoUpdateMode = $state<AutoUpdateMode>("disabled");
let autoUpdateCustomSchedule = $state("");
let autoUpdateSaving = $state(false);
let serviceStats = $state<Record<string, unknown> | undefined>(undefined);
let yamlCopied = $state(false);
let logTimestampMode = $state<"full" | "short" | "none">((localStorage.getItem(LS_KEY) as "full" | "short" | "none") ?? "full");
let logExpanded = $state(false);
let containerListRef = $state<HTMLElement | undefined>(undefined);
let progressTerminalRef = $state<ProgressTerminalInstance | undefined>(undefined);
let combinedTerminalRef = $state<TerminalInstance | undefined>(undefined);
let modalTerminalRef = $state<TerminalInstance | undefined>(undefined);
let stopUpdateTimeouts = false;
let yamlErrorTimeout: ReturnType<typeof setTimeout> | undefined;
let updateStackDataTimeout: ReturnType<typeof setTimeout> | undefined;
let updateServiceStatsTimeout: ReturnType<typeof setTimeout> | undefined;

const timestampOptions = [
    { value: "full", label: "Full" },
    { value: "short", label: "Short" },
    { value: "none", label: "None" },
];

const endpoint = $derived(stack.endpoint || routeEndpoint);
const terminalName = $derived(stack.name ? getComposeTerminalName(endpoint, stack.name) : "");
const combinedTerminalName = $derived(stack.name ? getCombinedTerminalName(endpoint, stack.name) : "");
const agentName = $derived(socketStore.getAgentName(endpoint));

const hasExitedServices = $derived(Object.values(stack.services ?? {}).some(s => s.state === "exited"));
const hasRunningServices = $derived(Object.values(stack.services ?? {}).some(s => s.state === "running"));
const hasInactiveServices = $derived(() => {
    for (const name of composeDocument.services.names) {
        if (!stack.services?.[name]) return true;
    }
    return false;
});

const urls = $derived.by(() => {
    const result: { display: string; url: string }[] = [];
    for (const url of composeDocument.xArbour.urls.values) {
        let display: string;
        try {
            const obj = new URL(url);
            const pathname = obj.pathname === "/" ? "" : obj.pathname;
            display = obj.host + pathname + obj.search;
        } catch {
            display = url;
        }
        result.push({ display, url });
    }
    return result;
});

const stackUrl = $derived(
    stack.endpoint ? `/compose/${stack.name}/${stack.endpoint}` : `/compose/${stack.name}`
);

function startComposeAction() {
    processing = true;
    progressTerminalRef?.show();
}

function stopComposeAction() {
    processing = false;
    progressTerminalRef?.hideWithTimeout();
}

setContext(COMPOSE_CONTEXT, {
    get endpoint() { return endpoint; },
    get stack() { return stack; },
    get composeDocument() { return composeDocument; },
    get processing() { return processing; },
    get editorFocus() { return editorFocus; },
    startComposeAction,
    stopComposeAction,
    saveStack,
});

function yamlCodeChange() {
    try {
        composeDocument = new ComposeDocument(stack.composeYAML, stack.composeENV);
        clearTimeout(yamlErrorTimeout);
        yamlError = "";
    } catch (e) {
        clearTimeout(yamlErrorTimeout);
        const msg = e instanceof Error ? e.message : String(e);
        if (yamlError) {
            yamlError = msg;
        } else {
            yamlErrorTimeout = setTimeout(() => { yamlError = msg; }, 3000);
        }
    }
}

$effect(() => {
    if (editorFocus && stack.composeYAML !== undefined) {
        yamlCodeChange();
    }
});

$effect(() => {
    if (!editorFocus) {
        const yaml = composeDocument.toYAML();
        if (yaml !== stack.composeYAML) {
            stack = { ...stack, composeYAML: yaml };
        }
    }
});

$effect(() => {
    if (logExpanded) {
        setTimeout(() => modalTerminalRef?.updateTerminalSize(), 350);
    } else {
        setTimeout(() => combinedTerminalRef?.rebind(), 0);
    }
});

function startUpdateStackDataTimeout() {
    clearTimeout(updateStackDataTimeout);
    updateStackDataTimeout = setTimeout(() => { updateStackData(); }, 5000);
}

function updateStackData() {
    if (!isAdd && !isEditMode) {
        socketStore.emitAgent(endpoint, "updateStackData", stack.name, (res: { ok: boolean; stack?: StackData }) => {
            if (res.ok && res.stack) stack = res.stack;
        });
    }
    if (!stopUpdateTimeouts) startUpdateStackDataTimeout();
}

function startUpdateServiceStatsTimeout() {
    clearTimeout(updateServiceStatsTimeout);
    updateServiceStatsTimeout = setTimeout(() => { updateServiceStats(); }, 2000);
}

function updateServiceStats() {
    if (!isAdd && !isEditMode) {
        socketStore.emitAgent(endpoint, "updateServiceStats", stack.name, (res: { ok: boolean; serviceStats?: Record<string, unknown> }) => {
            if (res.ok) serviceStats = res.serviceStats;
        });
    }
    if (!stopUpdateTimeouts) startUpdateServiceStatsTimeout();
}

function loadStack() {
    socketStore.emitAgent(endpoint, "getStack", stack.name, (res: { ok: boolean; stack?: StackData; msg?: string }) => {
        if (res.ok && res.stack) {
            stack = res.stack;
            yamlCodeChange();
            processing = false;
            loadAutoUpdateSettings();
        } else {
            socketStore.toastRes(res as any);
        }
    });
}

function loadAutoUpdateSettings() {
    socketStore.emitAgent(endpoint, "getStackAutoUpdate", stack.name, (res: { ok: boolean; settings?: StackAutoUpdateSettings }) => {
        if (res.ok && res.settings) {
            autoUpdateMode = res.settings.mode;
            autoUpdateCustomSchedule = res.settings.schedule ?? "";
        }
    });
}

function deployStack() {
    if (composeDocument.services.isEmpty()) {
        socketStore.toastError("No services found in compose.yaml");
        return;
    }
    const serviceNames = composeDocument.services.names;
    if (!stack.name && serviceNames.length > 0) {
        const svc = composeDocument.services.getService(serviceNames[0]);
        stack = { ...stack, name: svc.get("container_name", serviceNames[0]) };
    }
    startComposeAction();
    socketStore.emitAgent(stack.endpoint, "deployStack", stack.name, stack.composeYAML, stack.composeENV, isAdd, (res: { ok: boolean; msg?: string }) => {
        stopComposeAction();
        socketStore.toastRes(res as any);
        if (res.ok) { isEditMode = false; goto(stackUrl); }
    });
}

function saveStack() {
    processing = true;
    socketStore.emitAgent(stack.endpoint, "saveStack", stack.name, stack.composeYAML, stack.composeENV, isAdd, (res: { ok: boolean; msg?: string }) => {
        processing = false;
        socketStore.toastRes(res as any);
        if (res.ok) { isEditMode = false; goto(stackUrl); }
    });
}

function startStack() {
    startComposeAction();
    socketStore.emitAgent(endpoint, "startStack", stack.name, (res: { ok: boolean; msg?: string }) => {
        stopComposeAction(); socketStore.toastRes(res as any); updateStackData();
    });
}

function stopStack() {
    startComposeAction();
    socketStore.emitAgent(endpoint, "stopStack", stack.name, (res: { ok: boolean; msg?: string }) => {
        stopComposeAction(); socketStore.toastRes(res as any); updateStackData();
    });
}

function downStack() {
    showMoreMenu = false;
    startComposeAction();
    socketStore.emitAgent(endpoint, "downStack", stack.name, (res: { ok: boolean; msg?: string }) => {
        stopComposeAction(); socketStore.toastRes(res as any); updateStackData();
    });
}

function restartStack() {
    startComposeAction();
    socketStore.emitAgent(endpoint, "restartStack", stack.name, (res: { ok: boolean; msg?: string }) => {
        stopComposeAction(); socketStore.toastRes(res as any); updateStackData();
    });
}

function updateStack() {
    showUpdateDialog = false;
    startComposeAction();
    socketStore.emitAgent(endpoint, "updateStack", stack.name, updateDialogData.pruneAfterUpdate, updateDialogData.pruneAllAfterUpdate, (res: { ok: boolean; msg?: string }) => {
        stopComposeAction(); socketStore.toastRes(res as any);
    });
}

function deleteStack() {
    socketStore.emitAgent(endpoint, "deleteStack", stack.name, (res: { ok: boolean; msg?: string }) => {
        socketStore.toastRes(res as any);
        if (res.ok) goto("/");
    });
}

function discardStack() {
    loadStack();
    isEditMode = false;
}

function addContainer() {
    if (!newContainerName) { socketStore.toastError("Container name cannot be empty"); return; }
    if (composeDocument.services.has(newContainerName)) { socketStore.toastError("Container name already exists"); return; }
    composeDocument.services.set(newContainerName, { restart: "unless-stopped" });
    newContainerName = "";
    setTimeout(() => {
        containerListRef?.lastElementChild?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
}

async function copyYAML() {
    await navigator.clipboard.writeText(stack.composeYAML ?? "");
    yamlCopied = true;
    setTimeout(() => { yamlCopied = false; }, 2000);
}

function stackNameToLowercase() {
    if (stack.name) stack = { ...stack, name: stack.name.toLowerCase() };
}

function importStack() {
    socketStore.emitAgent(endpoint, "importStack", stack.name, (res: { ok: boolean; sourceDir?: string; hasRelativePaths?: boolean; msg?: string }) => {
        if (res.ok) {
            importSourceDir = res.sourceDir ?? "";
            if (res.hasRelativePaths) showImportRelativePathWarning = true;
            loadStack();
        } else {
            socketStore.toastRes(res as any);
        }
    });
}

function saveAutoUpdateSettings() {
    const schedule = autoUpdateMode === "scheduled" ? autoUpdateCustomSchedule.trim() || null : null;
    if (autoUpdateMode === "scheduled" && !schedule) {
        socketStore.toastError("Please enter a cron schedule");
        return;
    }
    autoUpdateSaving = true;
    const settings: StackAutoUpdateSettings = { mode: autoUpdateMode, schedule };
    socketStore.emitAgent(endpoint, "setStackAutoUpdate", stack.name, settings, (res: { ok: boolean; msg?: string }) => {
        autoUpdateSaving = false;
        socketStore.toastRes(res as any);
    });
}

function exitIfNeeded() {
    if (isEditMode) {
        if (!confirm($t("confirmLeaveStack"))) return false;
    }
    stopUpdateTimeouts = true;
    clearTimeout(updateStackDataTimeout);
    return true;
}

function getServiceStats(serviceName: string) {
    const svc = stack.services?.[serviceName];
    return svc ? (serviceStats as any)?.[svc.containerName] : undefined;
}

onMount(() => {
    if (isAdd) {
        isEditMode = true;
        processing = false;
        stack = {
            name: "", status: UNKNOWN, started: false, recreateNecessary: false,
            imageUpdatesAvailable: false, tags: [],
            composeYAML: socketStore.composeTemplate || composeTemplate,
            composeENV: socketStore.envTemplate || envDefault,
            isManagedByArbour: true, composeFileName: "", endpoint: routeEndpoint, primaryHostname: "", services: {}
        };
        socketStore.composeTemplate = "";
        socketStore.envTemplate = "";
        yamlCodeChange();
    } else {
        stack = { ...stack, name: initialStackName };
        loadStack();
    }
    updateStackData();
    startUpdateServiceStatsTimeout();
});

onDestroy(() => {
    stopUpdateTimeouts = true;
    clearTimeout(updateStackDataTimeout);
    clearTimeout(updateServiceStatsTimeout);
    clearTimeout(yamlErrorTimeout);
});
</script>

<!-- Title -->
<div class="compose-title">
    {#if isAdd}
        <h1>{$t("compose")}</h1>
    {:else}
        <h1>
            <Uptime stack={stack} pill={true} />
            {stack.name}
            {#if socketStore.agentCount > 1 && endpoint !== ""}
                <span class="agent-name">({agentName})</span>
            {/if}
        </h1>
    {/if}
</div>

<!-- Action bar -->
{#if stack.isManagedByArbour}
    <div class="action-bar">
        {#if isEditMode}
            <button class="btn btn-primary" disabled={processing} onclick={deployStack}>
                <Icon name="rocket" /> {$t("deployStack")}
            </button>
            <button class="btn btn-ghost" disabled={processing} onclick={saveStack}>
                <Icon name="floppy-disk" /> {$t("saveStackDraft")}
            </button>
            {#if !isAdd}
                <button class="btn btn-ghost" disabled={processing} onclick={discardStack}>
                    {$t("discardStack")}
                </button>
            {/if}
        {:else}
            <button class="btn btn-ghost" disabled={processing} onclick={() => (isEditMode = true)}>
                <Icon name="pen" /> {$t("editStack")}
            </button>
            {#if hasExitedServices || hasInactiveServices() || !stack.started}
                <button class="btn btn-primary" disabled={processing} onclick={startStack}>
                    <Icon name="play" /> {$t("startStack")}
                </button>
            {/if}
            {#if hasRunningServices}
                <button class="btn btn-ghost" disabled={processing} onclick={restartStack}>
                    <Icon name="rotate" /> {$t("restartStack")}
                </button>
            {/if}
            <button class="btn btn-ghost" disabled={processing} onclick={() => (showUpdateDialog = true)}>
                <Icon name="cloud-arrow-down" /> {$t("updateStack")}
            </button>
            {#if hasRunningServices}
                <button class="btn btn-ghost btn-stop" disabled={processing} onclick={stopStack}>
                    <Icon name="stop" /> {$t("stopStack")}
                </button>
            {/if}
            <div class="more-menu-wrap">
                <button class="btn btn-ghost" onclick={() => (showMoreMenu = !showMoreMenu)}>
                    <Icon name="ellipsis-v" />
                </button>
                {#if showMoreMenu}
                    <div class="more-menu" role="menu" tabindex="-1"
                        onmouseleave={() => (showMoreMenu = false)}>
                        <button class="more-item" onclick={downStack}>
                            <Icon name="stop" /> {$t("downStack")}
                        </button>
                        <button class="more-item more-item-danger" onclick={() => { showMoreMenu = false; showDeleteDialog = true; }}>
                            <Icon name="trash" /> {$t("deleteStack")}
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- URLs -->
{#if urls.length > 0}
    <div class="urls">
        {#each urls as item (item.url)}
            <a href={item.url} target="_blank" class="url-badge">{item.display}</a>
        {/each}
    </div>
{/if}

<!-- Progress terminal -->
<div class="progress-terminal-wrap">
    <ProgressTerminal bind:this={progressTerminalRef} name={terminalName} {endpoint} />
</div>

{#if stack.isManagedByArbour}
    <div class="compose-grid">
        <!-- Left column -->
        <div class="col-left">
            {#if isAdd}
                <h4>{$t("general")}</h4>
                <div class="section-box">
                    <div class="form-group">
                        <label for="stack-name">{$t("stackName")}</label>
                        <input id="stack-name" type="text" class="form-control" bind:value={stack.name}
                            required onblur={stackNameToLowercase} />
                        <div class="form-hint">{$t("Lowercase only")}</div>
                    </div>
                    <div class="form-group mt">
                        <label for="stack-endpoint">{$t("arbourAgent")}</label>
                        <select id="stack-endpoint" class="form-select" bind:value={stack.endpoint}>
                            {#each Object.entries(socketStore.agentList) as [ep, agent] (ep)}
                                <option value={ep} disabled={socketStore.agentStatusList[ep] !== "online"}>
                                    {agent.name || agent.url || "Master"} ({socketStore.agentStatusList[ep]})
                                </option>
                            {/each}
                        </select>
                    </div>
                </div>
            {/if}

            <h4>{$t("container", { values: { n: 2 } })}</h4>

            {#if isEditMode}
                <div class="add-container">
                    <input class="form-control" bind:value={newContainerName}
                        placeholder={$t("New Container Name...")}
                        onkeyup={(e) => { if (e.key === "Enter") addContainer(); }} />
                    <button class="btn btn-primary btn-sm" onclick={addContainer}>
                        {$t("addContainer")}
                    </button>
                </div>
            {/if}

            <div bind:this={containerListRef}>
                {#each Object.entries(composeDocument.services.getServices()) as [name] (name)}
                    <Container
                        {name}
                        {isEditMode}
                        service={stack.services?.[name]}
                        stats={getServiceStats(name)}
                    />
                {/each}
            </div>

            {#if isEditMode}
                <h4>{$t("extra")}</h4>
                <div class="section-box">
                    <div class="form-group">
                        <label>{$t("url", { values: { n: 2 } })}</label>
                        <ArrayInput composeArray={composeDocument.xArbour.urls} displayName={$t("url")} placeholder="https://" />
                    </div>
                </div>
            {/if}

            {#if !isEditMode}
                <!-- Combined log terminal -->
                <div class="log-section">
                    <div class="log-header">
                        <h4>{$t("log")}</h4>
                        <div class="ts-controls">
                            {#each timestampOptions as opt (opt.value)}
                                <button class="btn btn-sm" class:btn-primary={logTimestampMode === opt.value}
                                    class:btn-ghost={logTimestampMode !== opt.value}
                                    onclick={() => { logTimestampMode = opt.value as "full" | "short" | "none"; localStorage.setItem(LS_KEY, opt.value); }}>
                                    {opt.label}
                                </button>
                            {/each}
                            <button class="btn btn-sm btn-ghost" onclick={() => (logExpanded = true)}>
                                <Icon name="expand" />
                            </button>
                        </div>
                    </div>
                    <div class="log-terminal" style="height: 315px;">
                        <Terminal bind:this={combinedTerminalRef} name={combinedTerminalName} {endpoint}
                            rows={COMBINED_TERMINAL_ROWS} cols={COMBINED_TERMINAL_COLS}
                            timestampMode={logTimestampMode} />
                    </div>
                </div>

                <!-- Auto update settings -->
                {#if !isAdd && stack.isManagedByArbour}
                    <h4>{$t("autoUpdate")}</h4>
                    <div class="section-box">
                        <div class="form-group">
                            <label>{$t("autoUpdateMode")}</label>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" bind:group={autoUpdateMode} value="disabled" />
                                    {$t("disabled")}
                                </label>
                                <label class="radio-label">
                                    <input type="radio" bind:group={autoUpdateMode} value="immediate" />
                                    {$t("autoUpdateImmediate")}
                                </label>
                                <label class="radio-label">
                                    <input type="radio" bind:group={autoUpdateMode} value="scheduled" />
                                    {$t("autoUpdateScheduled")}
                                </label>
                            </div>
                        </div>
                        {#if autoUpdateMode === "scheduled"}
                            <div class="form-group">
                                <label>{$t("autoUpdateSchedule")}</label>
                                <input class="form-control monospace" bind:value={autoUpdateCustomSchedule} placeholder="0 3 * * *" />
                                <div class="form-hint">{$t("autoUpdateCronHint")}</div>
                            </div>
                        {/if}
                        {#if autoUpdateMode === "immediate"}
                            <div class="form-hint">{$t("autoUpdateImmediateHint")}</div>
                        {/if}
                        <button class="btn btn-primary btn-sm" disabled={autoUpdateSaving} onclick={saveAutoUpdateSettings}>
                            <Icon name="floppy-disk" /> {$t("saveSettings")}
                        </button>
                    </div>
                {/if}
            {/if}
        </div>

        <!-- Right column (YAML/ENV editors + Networks) -->
        <div class="col-right">
            <h4>{stack.composeFileName || "compose.yaml"}</h4>
            <div class="editor-box" class:edit-mode={isEditMode}>
                {#if isEditMode}
                    <button class="editor-overlay-btn" onclick={() => (logExpanded = true)} title={$t("expand")}>
                        <Icon name="expand" />
                    </button>
                {:else}
                    <button class="editor-overlay-btn copy-btn" title={$t("copyYAML")} onclick={copyYAML}>
                        <Icon name={yamlCopied ? "check" : "copy"} />
                    </button>
                {/if}
                <CodeEditor bind:value={stack.composeYAML} lang="yaml" readonly={!isEditMode}
                    onfocus={() => (editorFocus = true)} onblur={() => (editorFocus = false)} />
            </div>
            {#if isEditMode && yamlError}
                <div class="yaml-error">{yamlError}</div>
            {/if}

            {#if isEditMode}
                <h4>.env</h4>
                <div class="editor-box edit-mode">
                    <CodeEditor bind:value={stack.composeENV} lang="env" readonly={false}
                        onfocus={() => (editorFocus = true)} onblur={() => (editorFocus = false)} />
                </div>

                <h4>{$t("network", { values: { n: 2 } })}</h4>
                <div class="section-box">
                    <NetworkInput />
                </div>
            {/if}
        </div>
    </div>
{:else if !processing}
    <div class="not-managed">
        <p>{$t("stackNotManagedByArbourMsg")}</p>
        <button class="btn btn-primary" onclick={() => (showImportDialog = true)}>
            <Icon name="file-import" /> {$t("importStack")}
        </button>
    </div>
{/if}

<!-- Log expanded modal -->
{#if logExpanded}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <dialog open class="log-modal" onclick={(e) => { if (e.target === e.currentTarget) logExpanded = false; }}
        onclose={() => (logExpanded = false)}>
        <div class="dialog-box">
            <header class="dialog-header">
                <h5>{$t("log")}</h5>
                <button class="close-btn" onclick={() => (logExpanded = false)}>×</button>
            </header>
            <div class="dialog-body log-modal-body">
                <Terminal bind:this={modalTerminalRef} name={combinedTerminalName} {endpoint}
                    timestampMode={logTimestampMode} />
            </div>
        </div>
    </dialog>
{/if}

<!-- Update stack dialog -->
<Confirm
    bind:open={showUpdateDialog}
    title={$t("updateStack")}
    yesText={$t("updateStack")}
    btnStyle="btn-primary"
    onyes={updateStack}
    onno={() => { updateDialogData = { pruneAfterUpdate: false, pruneAllAfterUpdate: false }; }}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t("updateStackMsg")}</p>
    <label class="toggle-label">
        <input type="checkbox" bind:checked={updateDialogData.pruneAfterUpdate} />
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html $t("pruneAfterUpdate")}
    </label>
    <div class="indent">
        <label class="toggle-label">
            <input type="checkbox"
                checked={updateDialogData.pruneAfterUpdate && updateDialogData.pruneAllAfterUpdate}
                disabled={!updateDialogData.pruneAfterUpdate}
                onchange={(e) => (updateDialogData.pruneAllAfterUpdate = (e.target as HTMLInputElement).checked)} />
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html $t("pruneAllAfterUpdate")}
        </label>
    </div>
</Confirm>

<!-- Delete dialog -->
<Confirm
    bind:open={showDeleteDialog}
    title={$t("deleteStack")}
    yesText={$t("deleteStack")}
    btnStyle="btn-danger"
    onyes={deleteStack}
>
    <p>{$t("deleteStackMsg")}</p>
</Confirm>

<!-- Import dialog -->
<Confirm
    bind:open={showImportDialog}
    title={$t("importStack")}
    yesText={$t("importStack")}
    btnStyle="btn-primary"
    onyes={importStack}
>
    <p>{$t("importStackMsg")}</p>
    <ul>
        <li>{$t("importStackPoint1")}</li>
        <li>{$t("importStackPoint2")}</li>
        <li>{$t("importStackPoint3")}</li>
    </ul>
</Confirm>

<!-- Import relative path warning -->
<Confirm
    bind:open={showImportRelativePathWarning}
    title={$t("importStackRelativePathTitle")}
    yesText={$t("ok")}
    btnStyle="btn-primary"
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t("importStackRelativePathMsg", { values: { dir: importSourceDir } })}</p>
</Confirm>

<style>
h1 { font-size: 1.4rem; margin: 0 0 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
h4 { font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem; }
h5 { font-size: 1rem; margin: 0; }

.agent-name { font-size: 13px; color: var(--arbour-text-muted); }

.compose-title { margin-bottom: 0.5rem; }

.action-bar { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; align-items: center; }

.btn {
    padding: 0.3rem 0.7rem; border-radius: var(--arbour-radius-sm);
    cursor: pointer; border: none; font-size: 0.9rem;
    display: inline-flex; align-items: center; gap: 0.35rem;
}
.btn-sm { padding: 0.2rem 0.5rem; font-size: 0.82rem; }
.btn-primary { background: var(--arbour-primary); color: var(--arbour-text-on-primary); }
.btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--arbour-primary) 85%, black); }
.btn-primary:disabled { opacity: 0.6; cursor: default; }
.btn-ghost { background: var(--arbour-bg-deep); border: 1px solid var(--arbour-border); color: var(--arbour-text-muted); }
.btn-ghost:hover:not(:disabled) { background: var(--arbour-bg-header-active); color: var(--arbour-text); }
.btn-ghost:disabled { opacity: 0.6; cursor: default; }
.btn-stop:hover:not(:disabled) { color: var(--arbour-danger); border-color: var(--arbour-danger); }

.more-menu-wrap { position: relative; }
.more-menu {
    position: absolute; top: calc(100% + 4px); right: 0; z-index: 50;
    background: var(--arbour-bg); border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius); box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    min-width: 140px; padding: 0.25rem 0;
}
.more-item {
    display: flex; align-items: center; gap: 0.5rem;
    width: 100%; background: none; border: none; cursor: pointer;
    padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--arbour-text); text-align: left;
}
.more-item:hover { background: var(--arbour-bg-header-active); }
.more-item-danger { color: var(--arbour-danger); }

.urls { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
.url-badge {
    background: var(--arbour-bg-header-active); color: var(--arbour-text-muted);
    border-radius: var(--arbour-radius-pill); padding: 0.2em 0.6em;
    font-size: 0.78rem; text-decoration: none; max-width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;
}
.url-badge:hover { color: var(--arbour-text); }

.progress-terminal-wrap { margin-bottom: 0.75rem; }

.compose-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}
@media (min-width: 1200px) {
    .compose-grid { grid-template-columns: 1fr 1fr; }
}

.col-left, .col-right { display: flex; flex-direction: column; gap: 0.75rem; }

.section-box {
    background: var(--arbour-bg);
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    padding: 1rem;
    margin-bottom: 0.5rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-group label { font-size: 0.85rem; font-weight: 500; color: var(--arbour-text-muted); }
.form-hint { font-size: 0.78rem; color: var(--arbour-text-muted); }
.mt { margin-top: 0.75rem; }

.form-control, .form-select {
    background: var(--arbour-bg-deep); border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius-sm); color: var(--arbour-text);
    padding: 0.4rem 0.6rem; font-size: 0.9rem; width: 100%; box-sizing: border-box;
}
.monospace { font-family: 'JetBrains Mono', monospace; }

.add-container { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.add-container .form-control { flex: 1; }

.editor-box {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    position: relative;
    min-height: 200px;
    background: var(--arbour-bg);
    border: 1px solid transparent;
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    overflow: hidden;
    margin-bottom: 0.5rem;
}
.editor-box.edit-mode { border-color: var(--arbour-primary); }

.editor-overlay-btn {
    all: unset; cursor: pointer;
    position: absolute; right: 12px; top: 10px; z-index: 10;
    color: var(--arbour-text-muted); width: 20px; height: 20px;
}
.editor-overlay-btn:hover { color: var(--arbour-text); }

.copy-btn { right: 10px; top: 10px; }

.yaml-error {
    background: color-mix(in srgb, var(--arbour-danger) 10%, transparent);
    border: 1px solid var(--arbour-danger);
    border-radius: var(--arbour-radius-sm);
    padding: 0.4rem 0.6rem; font-size: 0.82rem;
    color: var(--arbour-danger); margin-bottom: 0.5rem;
}

.log-section { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
.log-header { display: flex; align-items: center; justify-content: space-between; }
.ts-controls { display: flex; gap: 2px; }
.log-terminal { overflow: hidden; }

.radio-group { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.25rem; }
.radio-label { display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.9rem; }
.radio-label input { width: auto; }

.toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; margin-bottom: 0.25rem; }
.toggle-label input { width: auto; }
.indent { margin-left: 1.5rem; }

.not-managed { padding: 1rem 0; }

/* Dialogs */
dialog {
    border: none; border-radius: var(--arbour-radius-lg);
    background: var(--arbour-bg); color: var(--arbour-text);
    padding: 0; max-width: 600px; width: calc(100% - 2rem);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%); margin: 0;
}
.log-modal { max-width: 900px; }
.dialog-box { display: flex; flex-direction: column; max-height: 80vh; }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid var(--arbour-border); flex-shrink: 0; }
.close-btn { background: none; border: none; color: var(--arbour-text-muted); font-size: 1.4rem; cursor: pointer; padding: 0; line-height: 1; }
.close-btn:hover { color: var(--arbour-text); }
.dialog-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
.log-modal-body { padding: 0; height: 70vh; }
</style>
