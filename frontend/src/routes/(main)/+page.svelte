<script lang="ts">
import { goto } from "$app/navigation";
import { SvelteMap } from "svelte/reactivity";
import { t } from "svelte-i18n";
import { tn } from "$lib/stores/lang.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { StackStatusInfo } from "../../../../common/util-common";
import type { AgentData, SimpleStackData } from "../../../../common/types";
import Icon from "$lib/components/Icon.svelte";
import Confirm from "$lib/components/Confirm.svelte";

let showAgentForm = $state(false);
let connectingAgent = $state(false);
let newAgent = $state<AgentData>({ url: "http://",
    username: "",
    password: "",
    name: "",
    endpoint: "" });
let dockerRunCommand = $state("");
let agentToRemove = $state<AgentData | null>(null);
let showRemoveConfirm = $state(false);
let showEditAgentNameDialog = $state<Record<string, boolean>>({});
let editAgentNewName = $state<Record<string, string>>({});

const stackList = $derived(Object.values(socketStore.completeStackList) as SimpleStackData[]);

const stackStatusCounts = $derived.by(() => {
    const byEndpoint = new SvelteMap<string, SvelteMap<number, number>>();
    const overall = new SvelteMap<number, number>();
    for (const stack of stackList) {
        let epMap = byEndpoint.get(stack.endpoint);
        if (!epMap) {
            epMap = new SvelteMap();
            byEndpoint.set(stack.endpoint, epMap);
        }
        epMap.set(stack.status, (epMap.get(stack.status) ?? 0) + 1);
        overall.set(stack.status, (overall.get(stack.status) ?? 0) + 1);
    }
    return { byEndpoint,
        overall };
});

function getStatusCount(statusIds: number[]): number {
    return statusIds.reduce((acc, s) => acc + (stackStatusCounts.overall.get(s) ?? 0), 0);
}

function getEndpointStatusCount(endpoint: string, statusIds: number[]): number {
    return statusIds.reduce((acc, s) => acc + (stackStatusCounts.byEndpoint.get(endpoint)?.get(s) ?? 0), 0);
}

function filterStackList(endpoint: string | undefined, info: StackStatusInfo) {
    socketStore.stackFilter.clear();
    if (endpoint !== undefined) {
        socketStore.stackFilter.agents.selected.add(endpoint);
    }
    socketStore.stackFilter.status.selected.add(info.label);
    if (socketStore.isMobile) {
        goto("/stacks");
    }
}

function resetNewAgent() {
    newAgent = { url: "http://",
        username: "",
        password: "",
        name: "",
        endpoint: "" };
}

function addAgent() {
    connectingAgent = true;
    socketStore.getSocket().emit("addAgent", newAgent, (res: SocketRes) => {
        socketStore.toastRes(res);
        if (res.ok) {
            showAgentForm = false;
        }
        connectingAgent = false;
    });
}

function removeAgent(agent: AgentData) {
    socketStore.getSocket().emit("removeAgent", agent.url, (res: SocketRes) => {
        if (res.ok) {
            socketStore.toastRes(res);
            delete (socketStore.allAgentStackList as Record<string, unknown>)[agent.endpoint];
        }
    });
}

function editAgentName(agent: AgentData) {
    editAgentNewName[agent.endpoint] = agent.name;
    showEditAgentNameDialog = { ...showEditAgentNameDialog,
        [agent.endpoint]: true };
}

function updateAgentName(agent: AgentData, updatedName: string) {
    socketStore.getSocket().emit("updateAgent", agent.url, updatedName, (res: SocketRes) => {
        socketStore.toastRes(res);
        showEditAgentNameDialog = { ...showEditAgentNameDialog,
            [agent.endpoint]: false };
    });
}

function convertDockerRun() {
    if (!dockerRunCommand.trim() || dockerRunCommand.trim() === "docker run") {
        return;
    }
    socketStore.getSocket().emit("composerize", dockerRunCommand, (res: SocketRes & { composeTemplate?: string }) => {
        if (res.ok) {
            socketStore.composeTemplate = res.composeTemplate ?? "";
            goto("/compose");
        } else {
            socketStore.toastRes(res);
        }
    });
}

function getAgentName(agent: AgentData): string {
    return socketStore.getAgentName(agent.endpoint);
}

function getAgentLink(agent: AgentData): string {
    return agent.endpoint ? `/agent/${agent.endpoint}` : "/agent";
}
</script>

<div class="dashboard-home">
    <h1>{$t("home")}</h1>

    <div class="home-grid">
        <!-- Left column -->
        <div class="col-left">
            <!-- Status counts -->
            <div class="status-card shadow-box">
                <div class="status-row">
                    {#each StackStatusInfo.ALL as info (info.label)}
                        {#if getStatusCount(info.statusIds) > 0}
                            <div class="status-item">
                                <div class="status-label">{$t(info.label)}</div>
                                <button class="status-num" style="color: var(--arbour-{info.textColor}-color);"
                                    onclick={() => filterStackList(undefined, info)}>
                                    {getStatusCount(info.statusIds)}
                                </button>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>

            <!-- Agents -->
            <div class="section-header">
                <h4>{$tn("arbourAgent", 2)}</h4>
                {#if !showAgentForm}
                    <button class="btn btn-primary" onclick={() => (showAgentForm = true)}>
                        <Icon name="plus" /> {$t("addAgent")}
                    </button>
                {/if}
            </div>

            {#each Object.entries(socketStore.agentList) as [ endpoint, agent ] (endpoint)}
                <div class="agent-card shadow-box">
                    <div class="agent-header">
                        <div class="agent-title">
                            <h4>{getAgentName(agent)}</h4>
                            <button class="icon-btn" onclick={() => editAgentName(agent)} title={$t("Edit")}>
                                <Icon name="pen-to-square" />
                            </button>
                            {#if endpoint !== ""}
                                <button class="icon-btn icon-btn-danger"
                                    onclick={() => {
                                        agentToRemove = agent; showRemoveConfirm = true;
                                    }}
                                    title={$t("removeAgent")}>
                                    <Icon name="trash" />
                                </button>
                            {/if}
                        </div>
                        {#if socketStore.agentStatusList[endpoint] === "online"}
                            <a class="btn btn-sm btn-normal" href={getAgentLink(agent)} title={$t("tooltipAgentMaintenance")}>
                                <Icon name="wrench" /> {$t("maintenance")}
                            </a>
                        {/if}
                    </div>

                    <div class="agent-url">{agent.url || "local"}</div>

                    <div class="agent-badges">
                        {#if socketStore.agentStatusList[endpoint] === "online"}
                            <span class="badge badge-primary">{$t("agentOnline")}</span>
                        {:else if socketStore.agentStatusList[endpoint] === "offline"}
                            <span class="badge badge-danger">{$t("agentOffline")}</span>
                        {:else if socketStore.agentStatusList[endpoint]}
                            <span class="badge badge-secondary">{$t(socketStore.agentStatusList[endpoint])}</span>
                        {/if}

                        {#each StackStatusInfo.ALL as info (info.label)}
                            {#if getEndpointStatusCount(endpoint, info.statusIds) > 0}
                                <span class="status-inline">
                                    {$t(info.label)}:
                                    <button class="status-num-sm" style="color: var(--arbour-{info.textColor}-color);"
                                        onclick={() => filterStackList(endpoint, info)}>
                                        {getEndpointStatusCount(endpoint, info.statusIds)}
                                    </button>
                                </span>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/each}

            <!-- Add agent form dialog -->
            {#if showAgentForm}
                <dialog open onclick={(e) => {
                    if (e.target === e.currentTarget) {
                        showAgentForm = false; resetNewAgent();
                    }
                }}>
                    <div class="dialog-box">
                        <header class="dialog-header">
                            <h5>{$t("addAgent")}</h5>
                            <button class="close-btn" onclick={() => {
                                showAgentForm = false; resetNewAgent();
                            }}>×</button>
                        </header>
                        <div class="dialog-body">
                            <form onsubmit={(e) => {
                                e.preventDefault(); addAgent();
                            }}>
                                <div class="form-group">
                                    <label for="agent-url">{$t("arbourURL")}</label>
                                    <input id="agent-url" type="url" class="form-control" bind:value={newAgent.url} required placeholder="http://" />
                                </div>
                                <div class="form-group">
                                    <label for="agent-user">{$t("Username")}</label>
                                    <input id="agent-user" type="text" class="form-control" bind:value={newAgent.username} required />
                                </div>
                                <div class="form-group">
                                    <label for="agent-pass">{$t("Password")}</label>
                                    <input id="agent-pass" type="password" class="form-control" bind:value={newAgent.password} required autocomplete="new-password" />
                                </div>
                                <div class="form-group">
                                    <label for="agent-name">{$t("Friendly Name")}</label>
                                    <input id="agent-name" type="text" class="form-control" bind:value={newAgent.name} />
                                </div>
                            </form>
                        </div>
                        <footer class="dialog-footer">
                            <button class="btn btn-ghost" onclick={() => {
                                showAgentForm = false; resetNewAgent();
                            }}>{$t("cancel")}</button>
                            <button class="btn btn-primary" disabled={connectingAgent} onclick={addAgent}>
                                {connectingAgent ? $t("connecting") : $t("connect")}
                            </button>
                        </footer>
                    </div>
                </dialog>
            {/if}

            <!-- Edit agent name dialogs -->
            {#each Object.entries(socketStore.agentList) as [ endpoint, agent ] (endpoint)}
                {#if showEditAgentNameDialog[endpoint]}
                    <dialog open onclick={(e) => {
                        if (e.target === e.currentTarget) {
                            showEditAgentNameDialog = { ...showEditAgentNameDialog,
                                [endpoint]: false };
                        }
                    }}>
                        <div class="dialog-box">
                            <header class="dialog-header">
                                <h5>{endpoint || "Master"}</h5>
                                <button class="close-btn" onclick={() => {
                                    showEditAgentNameDialog = { ...showEditAgentNameDialog,
                                        [endpoint]: false };
                                }}>×</button>
                            </header>
                            <div class="dialog-body">
                                <input type="text" class="form-control" bind:value={editAgentNewName[endpoint]} />
                            </div>
                            <footer class="dialog-footer">
                                <button class="btn btn-ghost" onclick={() => {
                                    showEditAgentNameDialog = { ...showEditAgentNameDialog,
                                        [endpoint]: false };
                                }}>{$t("cancel")}</button>
                                <button class="btn btn-primary" onclick={() => updateAgentName(agent, editAgentNewName[endpoint])}>{$t("Update Name")}</button>
                            </footer>
                        </div>
                    </dialog>
                {/if}

            {/each}

            <!-- Remove agent confirm (single dialog, shared) -->
            <Confirm
                bind:open={showRemoveConfirm}
                title={agentToRemove ? getAgentName(agentToRemove) : ""}
                yesText={$t("removeAgent")}
                btnStyle="btn-danger"
                onyes={() => {
                    if (agentToRemove) {
                        removeAgent(agentToRemove); agentToRemove = null;
                    }
                }}
            >
                <p>{$t("removeAgentMsg")}</p>
            </Confirm>
        </div>

        <!-- Right column -->
        <div class="col-right">
            <h2>{$t("Docker Run")}</h2>
            <textarea class="form-control docker-run-input" rows="3" bind:value={dockerRunCommand} placeholder="docker run ..."></textarea>
            <button class="btn btn-normal" onclick={convertDockerRun}>{$t("Convert to Compose")}</button>
        </div>
    </div>
</div>

<style>
.dashboard-home { padding-bottom: 2rem; }

h1 { font-size: 32px; margin: 0 0 1rem; }
h2 { font-size: 26px; margin: 0 0 0.75rem; }
h4 { font-size: 1.5rem; margin: 0; font-weight: 500; }
h5 { font-size: 1rem; margin: 0; }

.home-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
}
@media (min-width: 1200px) {
    .home-grid { grid-template-columns: 7fr 5fr; }
}

.status-card {
    margin-bottom: 3rem;
    text-align: center;
}
.status-row { display: flex; flex-wrap: wrap; }
.status-item { flex: 1; text-align: center; }
.status-label {
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--arbour-text);
    margin-bottom: 0.25rem;
    line-height: 1.2;
}
.status-num {
    background: none; border: none; cursor: pointer;
    font-size: 30px; font-weight: 700; padding: 0; line-height: 1;
    display: block;
    margin: 0 auto;
}
.status-num:hover { opacity: 0.8; }

.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding: 0 1rem; }

.agent-card {
    margin-bottom: 1rem;
}
.agent-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.agent-title { display: flex; align-items: baseline; gap: 0.75rem; }
.agent-url { font-size: 0.85rem; color: var(--arbour-text-muted); margin-bottom: 1rem; }
.agent-badges { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }

.icon-btn {
    background: none; border: none; color: var(--arbour-text-muted);
    cursor: pointer; padding: 0.1rem 0.25rem; border-radius: var(--arbour-radius-sm);
}
.icon-btn:hover { color: var(--arbour-text); background: var(--arbour-bg-deep); }
.icon-btn-danger:hover { color: var(--arbour-danger); }

.badge {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.2em 0.5em; height: 22px;
    border-radius: var(--arbour-radius-pill); font-size: 0.75rem; font-weight: 600;
    text-align: center;
}
.badge-primary { background: var(--arbour-primary); color: var(--arbour-text-on-primary); }
.badge-danger { background: var(--arbour-danger); color: var(--arbour-text-on-primary); }
.badge-secondary { background: var(--arbour-bg-header-active); color: var(--arbour-text-muted); }

.status-inline { font-size: 0.95rem; color: var(--arbour-text); }
.status-num-sm { background: none; border: none; cursor: pointer; font-weight: 700; padding: 0; font-size: 0.95rem; }
.status-num-sm:hover { opacity: 0.8; }

.docker-run-input {
    background-color: var(--arbour-bg-deep) !important;
    border: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    margin-bottom: 1rem;
    resize: vertical;
}
.docker-run-input:focus {
    outline: none;
    box-shadow: 0 0 0 0.15rem color-mix(in srgb, var(--arbour-primary) 18%, transparent);
}

.btn-ghost { background: none; border: 1px solid var(--arbour-border); color: var(--arbour-text-muted); }
.btn-ghost:hover { background: var(--arbour-bg-deep); color: var(--arbour-text); }

dialog {
    border: none; border-radius: var(--arbour-radius-lg);
    background: var(--arbour-bg); color: var(--arbour-text);
    padding: 0; max-width: 480px; width: calc(100% - 2rem);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%); margin: 0;
}
.dialog-box { display: flex; flex-direction: column; max-height: 80vh; }
.dialog-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--arbour-border); flex-shrink: 0;
}
.close-btn { background: none; border: none; color: var(--arbour-text-muted); font-size: 1.4rem; cursor: pointer; padding: 0; line-height: 1; }
.close-btn:hover { color: var(--arbour-text); }
.dialog-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 1rem 1.25rem; border-top: 1px solid var(--arbour-border); flex-shrink: 0; }

.form-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
.form-group label { font-size: 0.85rem; font-weight: 500; color: var(--arbour-text-muted); }
.form-control {
    background: var(--arbour-bg-deep); border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius-sm); color: var(--arbour-text);
    padding: 0.4rem 0.6rem; font-size: 0.9rem; width: 100%; box-sizing: border-box;
}
</style>
