<script lang="ts">
import { setContext, onMount, onDestroy } from "svelte";
import { goto } from "$app/navigation";
import { t } from "svelte-i18n";
import { tn } from "$lib/stores/lang.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { COMPOSE_CONTEXT } from "$lib/context";
import { clickOutside } from "$lib/actions/clickOutside";
import {
    COMBINED_TERMINAL_COLS,
    COMBINED_TERMINAL_ROWS,
    getCombinedTerminalName,
    getComposeTerminalName,
    UNKNOWN,
} from "../../../../common/util-common";
import { ComposeDocument } from "../../../../common/compose-document";
import type { StackData, StackAutoUpdateSettings, AutoUpdateMode, StatsData } from "../../../../common/types";
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
} : {
    stackName?: string;
    routeEndpoint?: string;
    isAdd?: boolean;
} = $props();

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
let docVersion = $state(0);
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
let updateDialogData = $state({ pruneAfterUpdate: false,
    pruneAllAfterUpdate: false });
let autoUpdateMode = $state<AutoUpdateMode>("disabled");
let autoUpdateCustomSchedule = $state("");
let autoUpdateSaving = $state(false);
let serviceStats = $state<Record<string, unknown> | undefined>(undefined);
let yamlCopied = $state(false);
let logTimestampMode = $state<"full" | "short" | "none">((localStorage.getItem(LS_KEY) as "full" | "short" | "none") ?? "full");
let logExpanded = $state(false);
let logModalEl = $state<HTMLDialogElement | undefined>(undefined);
let composeEditorOpen = $state(false);
let composeEditorDialogEl = $state<HTMLDialogElement | undefined>(undefined);

$effect(() => {
    if (!logModalEl) {
        return;
    }
    if (logExpanded) {
        logModalEl.showModal();
    } else {
        logModalEl.close();
    }
});
$effect(() => {
    if (!composeEditorDialogEl) {
        return;
    }
    if (composeEditorOpen) {
        composeEditorDialogEl.showModal();
    } else {
        composeEditorDialogEl.close();
    }
});
let containerListRef = $state<HTMLElement | undefined>(undefined);
let progressTerminalRef = $state<ProgressTerminalInstance | undefined>(undefined);
let combinedTerminalRef = $state<TerminalInstance | undefined>(undefined);
let modalTerminalRef = $state<TerminalInstance | undefined>(undefined);
let stopUpdateTimeouts = false;
let yamlErrorTimeout: ReturnType<typeof setTimeout> | undefined;
let updateStackDataTimeout: ReturnType<typeof setTimeout> | undefined;
let updateServiceStatsTimeout: ReturnType<typeof setTimeout> | undefined;

const timestampOptions = [
    { value: "full",
        label: "Full" },
    { value: "short",
        label: "Short" },
    { value: "none",
        label: "None" },
];

const endpoint = $derived(stack.endpoint || routeEndpoint);
const terminalName = $derived(stack.name ? getComposeTerminalName(endpoint, stack.name) : "");
const combinedTerminalName = $derived(stack.name ? getCombinedTerminalName(endpoint, stack.name) : "");
const agentName = $derived(socketStore.getAgentName(endpoint));

const hasExitedServices = $derived(Object.values(stack.services ?? {}).some(s => s.state === "exited"));
const hasRunningServices = $derived(Object.values(stack.services ?? {}).some(s => s.state === "running"));
const hasInactiveServices = $derived(() => {
    for (const name of composeDocument.services.names) {
        if (!stack.services?.[name]) {
            return true;
        }
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
        result.push({ display,
            url });
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
    get endpoint() {
        return endpoint;
    },
    get stack() {
        return stack;
    },
    get composeDocument() {
        return composeDocument;
    },
    get processing() {
        return processing;
    },
    get editorFocus() {
        return editorFocus;
    },
    startComposeAction,
    stopComposeAction,
    saveStack,
    notifyDocChanged() {
        docVersion++;
    },
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
            yamlErrorTimeout = setTimeout(() => {
                yamlError = msg;
            }, 3000);
        }
    }
}

$effect(() => {
    if (editorFocus && stack.composeYAML !== undefined) {
        yamlCodeChange();
    }
});

$effect(() => {
    void docVersion; // re-serialize when a GUI editor signals an in-place mutation
    if (!editorFocus) {
        const yaml = composeDocument.toYAML();
        if (yaml !== stack.composeYAML) {
            stack = { ...stack,
                composeYAML: yaml };
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
    updateStackDataTimeout = setTimeout(() => {
        updateStackData();
    }, 5000);
}

function updateStackData() {
    if (!isAdd && !isEditMode) {
        socketStore.emitAgent(endpoint, "updateStackData", stack.name, (res: SocketRes & { stack?: StackData }) => {
            if (res.ok && res.stack) {
                stack = res.stack;
            }
        });
    }
    if (!stopUpdateTimeouts) {
        startUpdateStackDataTimeout();
    }
}

function startUpdateServiceStatsTimeout() {
    clearTimeout(updateServiceStatsTimeout);
    updateServiceStatsTimeout = setTimeout(() => {
        updateServiceStats();
    }, 2000);
}

function updateServiceStats() {
    if (!isAdd && !isEditMode) {
        socketStore.emitAgent(endpoint, "updateServiceStats", stack.name, (res: SocketRes & { serviceStats?: Record<string, unknown> }) => {
            if (res.ok) {
                serviceStats = res.serviceStats;
            }
        });
    }
    if (!stopUpdateTimeouts) {
        startUpdateServiceStatsTimeout();
    }
}

function loadStack() {
    socketStore.emitAgent(endpoint, "getStack", stack.name, (res: SocketRes & { stack?: StackData }) => {
        if (res.ok && res.stack) {
            stack = res.stack;
            yamlCodeChange();
            processing = false;
            loadAutoUpdateSettings();
        } else {
            socketStore.toastRes(res);
        }
    });
}

function loadAutoUpdateSettings() {
    socketStore.emitAgent(endpoint, "getStackAutoUpdate", stack.name, (res: SocketRes & { settings?: StackAutoUpdateSettings }) => {
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
        stack = { ...stack,
            name: svc.get("container_name", serviceNames[0]) };
    }
    startComposeAction();
    socketStore.emitAgent(stack.endpoint, "deployStack", stack.name, stack.composeYAML, stack.composeENV, isAdd, (res: SocketRes) => {
        stopComposeAction();
        socketStore.toastRes(res);
        if (res.ok) {
            isEditMode = false;
            goto(stackUrl);
        }
    });
}

function saveStack() {
    processing = true;
    socketStore.emitAgent(stack.endpoint, "saveStack", stack.name, stack.composeYAML, stack.composeENV, isAdd, (res: SocketRes) => {
        processing = false;
        socketStore.toastRes(res);
        if (res.ok) {
            isEditMode = false;
            goto(stackUrl);
        }
    });
}

function startStack() {
    startComposeAction();
    socketStore.emitAgent(endpoint, "startStack", stack.name, (res: SocketRes) => {
        stopComposeAction();
        socketStore.toastRes(res);
        updateStackData();
    });
}

function stopStack() {
    startComposeAction();
    socketStore.emitAgent(endpoint, "stopStack", stack.name, (res: SocketRes) => {
        stopComposeAction();
        socketStore.toastRes(res);
        updateStackData();
    });
}

function downStack() {
    showMoreMenu = false;
    startComposeAction();
    socketStore.emitAgent(endpoint, "downStack", stack.name, (res: SocketRes) => {
        stopComposeAction();
        socketStore.toastRes(res);
        updateStackData();
    });
}

function restartStack() {
    startComposeAction();
    socketStore.emitAgent(endpoint, "restartStack", stack.name, (res: SocketRes) => {
        stopComposeAction();
        socketStore.toastRes(res);
        updateStackData();
    });
}

function updateStack() {
    showUpdateDialog = false;
    startComposeAction();
    socketStore.emitAgent(endpoint, "updateStack", stack.name, updateDialogData.pruneAfterUpdate, updateDialogData.pruneAllAfterUpdate, (res: SocketRes) => {
        stopComposeAction();
        socketStore.toastRes(res);
    });
}

function deleteStack() {
    socketStore.emitAgent(endpoint, "deleteStack", stack.name, (res: SocketRes) => {
        socketStore.toastRes(res);
        if (res.ok) {
            goto("/");
        }
    });
}

function discardStack() {
    loadStack();
    isEditMode = false;
}

function addContainer() {
    if (!newContainerName) {
        socketStore.toastError("Container name cannot be empty"); return;
    }
    if (composeDocument.services.has(newContainerName)) {
        socketStore.toastError("Container name already exists"); return;
    }
    composeDocument.services.set(newContainerName, { restart: "unless-stopped" });
    newContainerName = "";
    setTimeout(() => {
        containerListRef?.lastElementChild?.scrollIntoView({ block: "start",
            behavior: "smooth" });
    }, 0);
}

async function copyYAML() {
    await navigator.clipboard.writeText(stack.composeYAML ?? "");
    yamlCopied = true;
    setTimeout(() => {
        yamlCopied = false;
    }, 2000);
}

function stackNameToLowercase() {
    if (stack.name) {
        stack = { ...stack,
            name: stack.name.toLowerCase() };
    }
}

function importStack() {
    socketStore.emitAgent(endpoint, "importStack", stack.name, (res: SocketRes & { sourceDir?: string; hasRelativePaths?: boolean }) => {
        if (res.ok) {
            importSourceDir = res.sourceDir ?? "";
            if (res.hasRelativePaths) {
                showImportRelativePathWarning = true;
            }
            loadStack();
        } else {
            socketStore.toastRes(res);
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
    const settings: StackAutoUpdateSettings = { mode: autoUpdateMode,
        schedule };
    socketStore.emitAgent(endpoint, "setStackAutoUpdate", stack.name, settings, (res: SocketRes) => {
        autoUpdateSaving = false;
        socketStore.toastRes(res);
    });
}

function getServiceStats(serviceName: string): StatsData | undefined {
    const svc = stack.services?.[serviceName];
    return svc ? (serviceStats as Record<string, StatsData> | undefined)?.[svc.containerName] : undefined;
}

onMount(() => {
    if (isAdd) {
        isEditMode = true;
        processing = false;
        stack = {
            name: "",
            status: UNKNOWN,
            started: false,
            recreateNecessary: false,
            imageUpdatesAvailable: false,
            tags: [],
            composeYAML: socketStore.composeTemplate || composeTemplate,
            composeENV: socketStore.envTemplate || envDefault,
            isManagedByArbour: true,
            composeFileName: "",
            endpoint: routeEndpoint,
            primaryHostname: "",
            services: {}
        };
        socketStore.composeTemplate = "";
        socketStore.envTemplate = "";
        yamlCodeChange();
    } else {
        stack = { ...stack,
            name: initialStackName };
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
{#if isAdd}
    <h1 class="mb-3">{$t("compose")}</h1>
{:else}
    <h1 class="mb-3">
        <Uptime stack={stack} pill={true} />
        {stack.name}
        {#if socketStore.agentCount > 1 && endpoint !== ""}
            <span class="agent-name">({agentName})</span>
        {/if}
    </h1>
{/if}

<!-- Action bar -->
{#if stack.isManagedByArbour}
    <div class="mb-3 action-bar">
        <div class="btn-group" role="group">
            {#if isEditMode}
                <button class="btn btn-primary" title={$t("tooltipStackDeploy")} disabled={processing} onclick={deployStack}>
                    <Icon name="rocket" /> <span class="d-none d-xl-inline">{$t("deployStack")}</span>
                </button>
                <button class="btn btn-normal" title={$t("tooltipStackSave")} disabled={processing} onclick={saveStack}>
                    <Icon name="floppy-disk" /> <span class="d-none d-xl-inline">{$t("saveStackDraft")}</span>
                </button>
                {#if !isAdd}
                    <button class="btn btn-normal" disabled={processing} onclick={discardStack}>
                        {$t("discardStack")}
                    </button>
                {/if}
            {:else}
                <button class="btn btn-normal" title={$t("tooltipStackEdit")} disabled={processing} onclick={() => (isEditMode = true)}>
                    <Icon name="pen" /> <span class="d-none d-xl-inline">{$t("editStack")}</span>
                </button>
                {#if hasExitedServices || hasInactiveServices() || !stack.started}
                    <button class="btn btn-primary" title={$t("tooltipStackStart")} disabled={processing} onclick={startStack}>
                        <Icon name="play" /> <span class="d-none d-xl-inline">{$t("startStack")}</span>
                    </button>
                {/if}
                {#if hasRunningServices}
                    <button class="btn btn-normal" title={$t("tooltipStackRestart")} disabled={processing} onclick={restartStack}>
                        <Icon name="rotate" /> <span class="d-none d-xl-inline">{$t("restartStack")}</span>
                    </button>
                {/if}
                <button class="btn btn-normal btn-hover-info" title={$t("tooltipStackUpdate")} disabled={processing} onclick={() => (showUpdateDialog = true)}>
                    <Icon name="cloud-arrow-down" /> <span class="d-none d-xl-inline">{$t("updateStack")}</span>
                </button>
                {#if hasRunningServices}
                    <button class="btn btn-normal btn-hover-danger" title={$t("tooltipStackStop")} disabled={processing} onclick={stopStack}>
                        <Icon name="stop" /> <span class="d-none d-xl-inline">{$t("stopStack")}</span>
                    </button>
                {/if}
            {/if}
            {#if !isEditMode}
                <div class="more-menu-wrap" use:clickOutside={() => (showMoreMenu = false)}>
                    <button class="btn btn-normal more-btn" class:active={showMoreMenu} disabled={processing} onclick={() => (showMoreMenu = !showMoreMenu)}>
                        <Icon name="ellipsis-v" />
                    </button>
                    {#if showMoreMenu}
                        <div class="dropdown-menu show dropdown-menu-end more-menu">
                            <button class="dropdown-item" onclick={downStack}>
                                <Icon name="stop" /> {$t("downStack")}
                            </button>
                            <button class="dropdown-item text-danger" onclick={() => {
                                showMoreMenu = false; showDeleteDialog = true;
                            }}>
                                <Icon name="trash" /> {$t("deleteStack")}
                            </button>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{/if}

<!-- URLs -->
{#if urls.length > 0}
    <div class="mb-3 urls">
        {#each urls as item (item.url)}
            <a href={item.url} target="_blank" class="url-badge">
                <span class="badge bg-secondary text-truncate me-2">{item.display}</span>
            </a>
        {/each}
    </div>
{/if}

<!-- Progress terminal -->
<div class="mb-3">
    <ProgressTerminal bind:this={progressTerminalRef} name={terminalName} {endpoint} />
</div>

{#if stack.isManagedByArbour}
    <div class="row mt-3">
        <!-- Left column -->
        <div class="col-xl-6 col-left">
            {#if isAdd}
                <h4 class="mb-3">{$t("general")}</h4>
                <div class="shadow-box big-padding mb-3">
                    <div>
                        <label for="stack-name" class="form-label">{$t("stackName")}</label>
                        <input id="stack-name" type="text" class="form-control" bind:value={stack.name}
                            required onblur={stackNameToLowercase} />
                        <div class="form-text">{$t("Lowercase only")}</div>
                    </div>
                    <div class="mt-3">
                        <label for="stack-endpoint" class="form-label">{$t("arbourAgent")}</label>
                        <select id="stack-endpoint" class="form-select" bind:value={stack.endpoint}>
                            {#each Object.entries(socketStore.agentList) as [ ep, agent ] (ep)}
                                <option value={ep} disabled={socketStore.agentStatusList[ep] !== "online"}>
                                    {agent.name || agent.url || "Master"} ({socketStore.agentStatusList[ep]})
                                </option>
                            {/each}
                        </select>
                    </div>
                </div>
            {/if}

            <h4 class="mb-3">{$tn("container", 2)}</h4>

            {#if isEditMode}
                <div class="input-group mb-3">
                    <input class="form-control" bind:value={newContainerName}
                        placeholder={$t("New Container Name...")}
                        onkeyup={(e) => {
                            if (e.key === "Enter") {
                                addContainer();
                            }
                        }} />
                    <button class="btn btn-primary" onclick={addContainer}>
                        {$t("addContainer")}
                    </button>
                </div>
            {/if}

            <div bind:this={containerListRef}>
                {#each Object.entries(composeDocument.services.getServices()) as [ name ] (name)}
                    <Container
                        {name}
                        {isEditMode}
                        service={stack.services?.[name]}
                        stats={getServiceStats(name)}
                    />
                {/each}
            </div>

            {#if isEditMode}
                <h4 class="mb-3">{$t("extra")}</h4>
                <div class="shadow-box big-padding mb-3">
                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="form-label">{$tn("url", 2)}</label>
                        <ArrayInput composeArray={composeDocument.xArbour.urls} displayName={$t("url")} placeholder="https://" />
                    </div>
                </div>
            {/if}

            {#if !isEditMode}
                <!-- Combined log terminal -->
                <div class="log-section mb-3">
                    <div class="log-header mb-2">
                        <h4 class="mb-0">{$t("log")}</h4>
                        <div class="btn-group btn-group-sm" role="group">
                            {#each timestampOptions as opt (opt.value)}
                                <button type="button" class="btn" class:btn-primary={logTimestampMode === opt.value}
                                    class:btn-normal={logTimestampMode !== opt.value}
                                    onclick={() => {
                                        logTimestampMode = opt.value as "full" | "short" | "none"; localStorage.setItem(LS_KEY, opt.value);
                                    }}>
                                    {opt.label}
                                </button>
                            {/each}
                            <button type="button" class="btn btn-normal" title={$t("expand")} onclick={() => (logExpanded = true)}>
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
                    <h4 class="mb-3">{$t("autoUpdate")}</h4>
                    <div class="shadow-box big-padding mb-3">
                        <div>
                            <!-- svelte-ignore a11y_label_has_associated_control -->
                            <label class="form-label">{$t("autoUpdateMode")}</label>
                            <div class="radio-group">
                                <label class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" bind:group={autoUpdateMode} value="disabled" />
                                    <span class="form-check-label">{$t("disabled")}</span>
                                </label>
                                <label class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" bind:group={autoUpdateMode} value="immediate" />
                                    <span class="form-check-label">{$t("autoUpdateImmediate")}</span>
                                </label>
                                <label class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" bind:group={autoUpdateMode} value="scheduled" />
                                    <span class="form-check-label">{$t("autoUpdateScheduled")}</span>
                                </label>
                            </div>
                        </div>
                        {#if autoUpdateMode === "scheduled"}
                            <div class="mt-3">
                                <!-- svelte-ignore a11y_label_has_associated_control -->
                                <label class="form-label">{$t("autoUpdateSchedule")}</label>
                                <input class="form-control monospace" bind:value={autoUpdateCustomSchedule} placeholder="0 3 * * *" />
                                <div class="form-text">{$t("autoUpdateCronHint")}</div>
                            </div>
                        {/if}
                        {#if autoUpdateMode === "immediate"}
                            <div class="form-text mt-2">{$t("autoUpdateImmediateHint")}</div>
                        {/if}
                        <button class="btn btn-primary btn-sm mt-3" disabled={autoUpdateSaving} onclick={saveAutoUpdateSettings}>
                            <Icon name="floppy-disk" /> {$t("saveSettings")}
                        </button>
                    </div>
                {/if}
            {/if}
        </div>

        <!-- Right column (YAML/ENV editors + Networks) -->
        <div class="col-xl-6 col-right">
            <h4 class="mb-3">{stack.composeFileName || "compose.yaml"}</h4>
            <div class="editor-box mb-3" class:edit-mode={isEditMode}>
                {#if isEditMode}
                    <button class="editor-overlay-btn" onclick={() => (composeEditorOpen = true)} title={$t("expand")}>
                        <Icon name="expand" />
                    </button>
                {:else}
                    <button class="editor-overlay-btn copy-btn" title={$t("copyYAML")} onclick={copyYAML}>
                        <Icon name={yamlCopied ? "check" : "copy"} />
                    </button>
                {/if}
                {#key isEditMode}
                    <CodeEditor bind:value={stack.composeYAML} lang="yaml" isReadonly={!isEditMode}
                        onfocus={() => (editorFocus = true)} onblur={() => (editorFocus = false)} />
                {/key}
            </div>
            {#if isEditMode && yamlError}
                <div class="alert alert-danger">{yamlError}</div>
            {/if}

            {#if isEditMode}
                <h4 class="mb-3">.env</h4>
                <div class="editor-box edit-mode mb-3">
                    <CodeEditor bind:value={stack.composeENV} lang="env" isReadonly={false}
                        onfocus={() => (editorFocus = true)} onblur={() => (editorFocus = false)} />
                </div>

                <h4 class="mb-3">{$tn("network", 2)}</h4>
                <div class="shadow-box big-padding mb-3">
                    <NetworkInput />
                </div>
            {/if}
        </div>
    </div>
{:else if !processing}
    <div class="shadow-box big-padding mb-3">
        <p>{$t("stackNotManagedByArbourMsg")}</p>
        <button class="btn btn-primary" onclick={() => (showImportDialog = true)}>
            <Icon name="file-import" /> {$t("importStack")}
        </button>
    </div>
{/if}

<!-- Log expanded modal -->
<dialog bind:this={logModalEl} class="log-modal" onclick={(e) => {
    if (e.target === e.currentTarget) {
        logExpanded = false;
    }
}}
    onclose={() => (logExpanded = false)}>
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">{$t("log")}</h5>
            <button class="btn-close" aria-label="Close" onclick={() => (logExpanded = false)}></button>
        </div>
        <div class="modal-body log-modal-body">
            {#if logExpanded}
                <Terminal bind:this={modalTerminalRef} name={combinedTerminalName} {endpoint}
                    timestampMode={logTimestampMode} />
            {/if}
        </div>
    </div>
</dialog>

<!-- Compose editor fullscreen modal -->
<dialog bind:this={composeEditorDialogEl} class="compose-editor-modal"
    onclick={(e) => {
        if (e.target === e.currentTarget) {
            composeEditorOpen = false;
        }
    }}
    onclose={() => (composeEditorOpen = false)}>
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">{stack.composeFileName || "compose.yaml"}</h5>
            <button class="btn-close" aria-label="Close" onclick={() => (composeEditorOpen = false)}></button>
        </div>
        <div class="modal-body compose-editor-modal-body">
            {#if composeEditorOpen}
                <div class="editor-box edit-mode">
                    <CodeEditor bind:value={stack.composeYAML} lang="yaml" isReadonly={!isEditMode}
                        onfocus={() => (editorFocus = true)} onblur={() => (editorFocus = false)} />
                </div>
                {#if isEditMode && yamlError}
                    <div class="alert alert-danger mt-3">{yamlError}</div>
                {/if}
            {/if}
        </div>
    </div>
</dialog>

<!-- Update stack dialog -->
<Confirm
    bind:open={showUpdateDialog}
    title={$t("updateStack")}
    yesText={$t("updateStack")}
    btnStyle="btn-primary"
    onyes={updateStack}
    onno={() => {
        updateDialogData = { pruneAfterUpdate: false,
            pruneAllAfterUpdate: false };
    }}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p class="mb-3">{@html $t("updateStackMsg")}</p>
    <label class="form-check">
        <input class="form-check-input" type="checkbox" bind:checked={updateDialogData.pruneAfterUpdate} />
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <span class="form-check-label">{@html $t("pruneAfterUpdate")}</span>
    </label>
    <div class="ms-3">
        <label class="form-check">
            <input class="form-check-input" type="checkbox"
                checked={updateDialogData.pruneAfterUpdate && updateDialogData.pruneAllAfterUpdate}
                disabled={!updateDialogData.pruneAfterUpdate}
                onchange={(e) => (updateDialogData.pruneAllAfterUpdate = (e.target as HTMLInputElement).checked)} />
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <span class="form-check-label">{@html $t("pruneAllAfterUpdate")}</span>
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
h1 { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.agent-name { font-size: 13px; color: var(--arbour-text-muted); }

.action-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.more-btn { border-radius: var(--arbour-radius); }
/* Join the dropdown toggle onto the end of the action button group (flat left edge) */
.btn-group .more-menu-wrap { display: flex; margin-left: -1px; }
.btn-group .more-btn { border-top-left-radius: 0; border-bottom-left-radius: 0; }

.more-menu-wrap { position: relative; display: inline-block; }
.more-menu { min-width: 160px; }

.urls { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.url-badge { display: inline-block; max-width: 100%; text-decoration: none; }
.url-badge :global(.badge) { font-size: 0.78rem; }

.log-section { display: flex; flex-direction: column; }
.log-header { display: flex; align-items: center; justify-content: space-between; }
.log-terminal {
    overflow: hidden;
    border-radius: var(--arbour-radius);
}

.monospace { font-family: 'JetBrains Mono', monospace; }

.editor-box {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    position: relative;
    min-height: 200px;
    background: var(--arbour-bg);
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}

.editor-overlay-btn {
    all: unset; cursor: pointer;
    position: absolute; right: 12px; top: 10px; z-index: 10;
    color: var(--arbour-text-muted); width: 20px; height: 20px;
}
.editor-overlay-btn:hover { color: var(--arbour-text); }
.copy-btn { right: 10px; top: 10px; }

.radio-group { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.25rem; }

:global(.log-modal) { max-width: 1140px !important; width: calc(100% - 2rem) !important; }
:global(.log-modal .modal-content) { padding: 0; }
:global(.log-modal .modal-header) { padding: 1rem 1.25rem; }
:global(.log-modal .modal-body) { padding: 1rem 1.25rem; height: 70vh; }

:global(.compose-editor-modal) { max-width: 1200px !important; width: calc(100% - 2rem) !important; }
:global(.compose-editor-modal .modal-content) { padding: 0; }
:global(.compose-editor-modal .modal-header) { padding: 1rem 1.25rem; }
:global(.compose-editor-modal .modal-body) { padding: 1rem 1.25rem; max-height: 75vh; overflow-y: auto; }
:global(.compose-editor-modal .editor-box) { min-height: 65vh; height: 65vh; }
</style>
