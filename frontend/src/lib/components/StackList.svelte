<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { t } from "svelte-i18n";
import { tn } from "$lib/stores/lang.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { CREATED_FILE, CREATED_STACK, EXITED, RUNNING, RUNNING_AND_EXITED, StackStatusInfo, UNHEALTHY, UNKNOWN } from "../../../../common/util-common";
import type { SimpleStackData } from "../../../../common/types";
import Icon from "./Icon.svelte";
import StackListItem from "./StackListItem.svelte";

const { embedded = false } = $props<{ embedded?: boolean }>();

let searchText = $state("");
let closedAgents = new SvelteMap<string, boolean>();
let checkingForUpdates = $state(false);
let filterOpen = $state(false);
let windowTop = $state(0);

const agentStackList = $derived.by(() => {
    let result: SimpleStackData[] = Object.values(socketStore.completeStackList);

    result = result.filter(stack => {
        const lowered = searchText.toLowerCase();
        const searchMatch = !searchText || stack.name.toLowerCase().includes(lowered);

        const agentMatch = !socketStore.stackFilter.agents.isFilterSelected() ||
            socketStore.stackFilter.agents.selected.has(stack.endpoint);

        const statusMatch = !socketStore.stackFilter.status.isFilterSelected() ||
            socketStore.stackFilter.status.selected.has(StackStatusInfo.get(stack.status).label);

        const attributeMatch = !socketStore.stackFilter.attributes.isFilterSelected() ||
            [ ...socketStore.stackFilter.attributes.selected ].some(attr => (stack as unknown as Record<string, unknown>)[attr] === true);

        return searchMatch && agentMatch && statusMatch && attributeMatch;
    });

    result.sort((m1, m2) => {
        if (m1.isManagedByArbour && !m2.isManagedByArbour) {
            return -1;
        }
        if (!m1.isManagedByArbour && m2.isManagedByArbour) {
            return 1;
        }

        const s1 = m1.status !== RUNNING_AND_EXITED ? m1.status : RUNNING;
        const s2 = m2.status !== RUNNING_AND_EXITED ? m2.status : RUNNING;

        if (s1 !== s2) {
            if (s2 === UNHEALTHY) {
                return 1;
            }
            if (s1 === UNHEALTHY) {
                return -1;
            }
            if (s2 === RUNNING) {
                return 1;
            }
            if (s1 === RUNNING) {
                return -1;
            }
            if (s2 === EXITED) {
                return 1;
            }
            if (s1 === EXITED) {
                return -1;
            }
            if (s2 === CREATED_STACK) {
                return 1;
            }
            if (s1 === CREATED_STACK) {
                return -1;
            }
            if (s2 === CREATED_FILE) {
                return 1;
            }
            if (s1 === CREATED_FILE) {
                return -1;
            }
            if (s2 === UNKNOWN) {
                return 1;
            }
            if (s1 === UNKNOWN) {
                return -1;
            }
        }
        return m1.name.localeCompare(m2.name);
    });

    const byEndpoint = result.reduce((acc, stack) => {
        const ep = stack.endpoint;
        if (!acc.has(ep)) {
            acc.set(ep, []);
        }
        acc.get(ep)!.push(stack);
        return acc;
    }, new Map<string, SimpleStackData[]>());

    return [ ...byEndpoint.entries() ]
        .map(([ endpoint, stacks ]) => ({ endpoint,
            stacks }))
        .sort((a, b) => {
            if (a.endpoint === "" && b.endpoint !== "") {
                return -1;
            }
            if (a.endpoint !== "" && b.endpoint === "") {
                return 1;
            }
            return a.endpoint.localeCompare(b.endpoint);
        });
});

const filtersActive = $derived(socketStore.stackFilter.isFilterSelected() || searchText !== "");

const boxStyle = $derived(
    embedded
        ? (typeof window !== "undefined" && window.innerWidth > 550
            ? `height: calc(100vh - 160px + ${windowTop}px)`
            : "height: calc(100vh - 160px)")
        : ""
);

function onScroll() {
    if (window.top!.scrollY <= 133) {
        windowTop = window.top!.scrollY;
    } else {
        windowTop = 133;
    }
}

function checkForUpdates() {
    checkingForUpdates = true;
    socketStore.emitAgent("", "checkForUpdates", (res: SocketRes) => {
        checkingForUpdates = false;
        socketStore.toastRes(res);
    });
}

function toggleAgent(endpoint: string) {
    closedAgents.set(endpoint, !closedAgents.get(endpoint));
}

onMount(() => {
    if (embedded) {
        window.addEventListener("scroll", onScroll);
    }
});
onDestroy(() => {
    if (embedded) {
        window.removeEventListener("scroll", onScroll);
    }
});
</script>

<div class="shadow-box mb-3" class:sticky-box={embedded} style={boxStyle}>
    <div class="list-header">
        <div class="header-row">
            <div class="input-group search-wrap">
                <button class="input-group-text" onclick={() => (searchText = "")} disabled={!searchText} aria-label="clear search">
                    <Icon name={searchText ? "xmark" : "magnifying-glass"} />
                </button>
                <input class="form-control" bind:value={searchText} placeholder={$t("search")} autocomplete="off" />
            </div>

            <button class="btn btn-normal btn-sm" title={$t("checkForUpdates")} disabled={checkingForUpdates} onclick={checkForUpdates}>
                <Icon name={checkingForUpdates ? "spinner" : "arrows-rotate"} spin={checkingForUpdates} />
            </button>

            <div class="filter-wrap">
                <button class="btn btn-normal btn-sm" class:filter-active={filtersActive} onclick={() => (filterOpen = !filterOpen)}
                    title={$t("filter")}>
                    <Icon name="filter" />
                </button>

                {#if filterOpen}
                    <div class="dropdown-menu show filter-dropdown" role="menu" tabindex="-1"
                        onmouseleave={() => (filterOpen = false)}>
                        <button class="dropdown-item" disabled={!socketStore.stackFilter.isFilterSelected()}
                            onclick={() => socketStore.stackFilter.clear()}>
                            <Icon name="xmark" /> {$t("clearFilter")}
                        </button>
                        <hr class="dropdown-divider" />
                        {#each socketStore.stackFilter.categories as category (category.label)}
                            {#if category.hasOptions()}
                                <div class="filter-group">
                                    <div class="filter-group-label">{$tn(category.label, 2)}</div>
                                    {#each Object.entries(category.options) as [ key, value ] (value)}
                                        <div class="form-check form-switch filter-option">
                                            <input id="filter-{category.label}-{value}" class="form-check-input" type="checkbox"
                                                checked={category.selected.has(value as never)}
                                                onchange={() => category.toggleSelected(value as never)} />
                                            <label class="form-check-label" for="filter-{category.label}-{value}">{$t(key)}</label>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <div class="stack-list">
        {#if agentStackList.length > 0 && agentStackList[0].stacks.length === 0}
            <div class="empty-msg">
                <a href="/compose">{$t("addFirstStackMsg")}</a>
            </div>
        {/if}

        {#each agentStackList as agent (agent.endpoint)}
            {#if socketStore.agentCount > 1}
                <button class="agent-header" onclick={() => toggleAgent(agent.endpoint)}>
                    <Icon name={closedAgents.get(agent.endpoint) ? "chevron-right" : "chevron-down"} />
                    <span>{socketStore.getAgentName(agent.endpoint)}</span>
                </button>
            {/if}
            {#if !closedAgents.get(agent.endpoint)}
                {#each agent.stacks as stack (stack.name + stack.endpoint)}
                    <StackListItem {stack} />
                {/each}
            {/if}
        {/each}
    </div>
</div>

<style>
.shadow-box {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 10px;
}

.sticky-box {
    position: sticky;
    top: 10px;
}

.list-header {
    margin: -10px -10px 10px;
    padding: 0.4rem 0.5rem;
    background: var(--arbour-bg-header);
    border-bottom: 1px solid var(--arbour-border);
    border-top-left-radius: var(--arbour-radius);
    border-top-right-radius: var(--arbour-radius);
    flex-shrink: 0;
}

.header-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.search-wrap { flex: 1; }
.search-wrap :global(.input-group-text) {
    background: var(--arbour-bg-deep);
    border-color: var(--arbour-border);
    color: var(--arbour-text-muted);
    cursor: pointer;
}
.search-wrap :global(.input-group-text:hover:not(:disabled)) { color: var(--arbour-text); }
.search-wrap :global(.form-control) {
    background: var(--arbour-bg-deep);
    border-color: var(--arbour-border);
    padding: 0.35rem 0.5rem;
    font-size: 0.9rem;
}

.filter-active { color: var(--arbour-info) !important; border-color: var(--arbour-info) !important; }

.filter-wrap { position: relative; }

.filter-dropdown {
    right: 0;
    left: auto;
    min-width: 200px;
    padding: 0.25rem 0;
}

.filter-group { padding: 0.25rem 0; }

.filter-group-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--arbour-text-muted);
    padding: 0.3rem 0.75rem;
}

.filter-option {
    padding: 0.25rem 0.75rem 0.25rem 2.25rem;
    margin-bottom: 0;
    font-size: 0.85rem;
}
.filter-option:hover { background: var(--arbour-bg-header-active); }

.stack-list { flex: 1; overflow-y: auto; }

.empty-msg {
    text-align: center;
    padding: 1.5rem;
    color: var(--arbour-text-muted);
    font-size: 0.9rem;
}

.agent-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    background: var(--arbour-bg-header);
    border: none;
    border-bottom: 1px solid var(--arbour-border);
    color: var(--arbour-text-muted);
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    text-align: left;
    user-select: none;
}
.agent-header:hover { background: var(--arbour-bg-header-active); }
</style>
