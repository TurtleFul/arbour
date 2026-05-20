<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { CREATED_FILE, CREATED_STACK, EXITED, RUNNING, RUNNING_AND_EXITED, StackStatusInfo, UNHEALTHY, UNKNOWN } from "../../../../common/util-common";
import type { SimpleStackData } from "../../../../common/types";
import Icon from "./Icon.svelte";
import StackListItem from "./StackListItem.svelte";

const { embedded = false } = $props<{ embedded?: boolean }>();

let searchText = $state("");
let closedAgents = $state(new Map<string, boolean>());
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
            [...socketStore.stackFilter.attributes.selected].some(attr => (stack as any)[attr] === true);

        return searchMatch && agentMatch && statusMatch && attributeMatch;
    });

    result.sort((m1, m2) => {
        if (m1.isManagedByArbour && !m2.isManagedByArbour) return -1;
        if (!m1.isManagedByArbour && m2.isManagedByArbour) return 1;

        const s1 = m1.status !== RUNNING_AND_EXITED ? m1.status : RUNNING;
        const s2 = m2.status !== RUNNING_AND_EXITED ? m2.status : RUNNING;

        if (s1 !== s2) {
            if (s2 === UNHEALTHY) return 1;
            if (s1 === UNHEALTHY) return -1;
            if (s2 === RUNNING) return 1;
            if (s1 === RUNNING) return -1;
            if (s2 === EXITED) return 1;
            if (s1 === EXITED) return -1;
            if (s2 === CREATED_STACK) return 1;
            if (s1 === CREATED_STACK) return -1;
            if (s2 === CREATED_FILE) return 1;
            if (s1 === CREATED_FILE) return -1;
            if (s2 === UNKNOWN) return 1;
            if (s1 === UNKNOWN) return -1;
        }
        return m1.name.localeCompare(m2.name);
    });

    const byEndpoint = result.reduce((acc, stack) => {
        const ep = stack.endpoint;
        if (!acc.has(ep)) acc.set(ep, []);
        acc.get(ep)!.push(stack);
        return acc;
    }, new Map<string, SimpleStackData[]>());

    return [...byEndpoint.entries()]
        .map(([endpoint, stacks]) => ({ endpoint, stacks }))
        .sort((a, b) => {
            if (a.endpoint === "" && b.endpoint !== "") return -1;
            if (a.endpoint !== "" && b.endpoint === "") return 1;
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
    socketStore.emitAgent("", "checkForUpdates", (res: { ok: boolean; msg?: string }) => {
        checkingForUpdates = false;
        socketStore.toastRes(res as any);
    });
}

function toggleAgent(endpoint: string) {
    closedAgents = new Map(closedAgents).set(endpoint, !closedAgents.get(endpoint));
}

onMount(() => {
    if (embedded) window.addEventListener("scroll", onScroll);
});
onDestroy(() => {
    if (embedded) window.removeEventListener("scroll", onScroll);
});
</script>

<div class="stack-list-box" class:sticky-box={embedded} style={boxStyle}>
    <div class="list-header">
        <div class="header-row">
            <div class="search-wrap">
                <button class="search-icon-btn" onclick={() => (searchText = "")} disabled={!searchText}>
                    <Icon name={searchText ? "xmark" : "magnifying-glass"} />
                </button>
                <input class="search-input" bind:value={searchText} placeholder={$t("search")} autocomplete="off" />
            </div>

            <button class="icon-btn" title={$t("checkForUpdates")} disabled={checkingForUpdates} onclick={checkForUpdates}>
                <Icon name={checkingForUpdates ? "spinner" : "arrows-rotate"} spin={checkingForUpdates} />
            </button>

            <div class="filter-wrap">
                <button class="icon-btn" class:filter-active={filtersActive} onclick={() => (filterOpen = !filterOpen)}
                    title={$t("filter")}>
                    <Icon name="filter" />
                </button>

                {#if filterOpen}
                    <div class="filter-dropdown" role="menu" tabindex="-1"
                        onmouseleave={() => (filterOpen = false)}>
                        <button class="filter-clear" disabled={!socketStore.stackFilter.isFilterSelected()}
                            onclick={() => socketStore.stackFilter.clear()}>
                            <Icon name="xmark" /> {$t("clearFilter")}
                        </button>
                        <div class="filter-divider"></div>
                        {#each socketStore.stackFilter.categories as category}
                            {#if category.hasOptions()}
                                <div class="filter-group">
                                    <div class="filter-group-label">{$t(category.label, { values: { n: 2 } })}</div>
                                    {#each Object.entries(category.options) as [key, value] (value)}
                                        <label class="filter-option">
                                            <input type="checkbox"
                                                checked={category.selected.has(value as any)}
                                                onchange={() => category.toggleSelected(value as any)} />
                                            {$t(key)}
                                        </label>
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
.stack-list-box {
    background: var(--arbour-bg);
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.sticky-box {
    position: sticky;
    top: 10px;
}

.list-header {
    background: var(--arbour-bg-header);
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid var(--arbour-border);
    flex-shrink: 0;
}

.header-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.search-wrap {
    display: flex;
    align-items: center;
    flex: 1;
    background: var(--arbour-bg-deep);
    border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius-sm);
    overflow: hidden;
}

.search-icon-btn {
    background: none;
    border: none;
    color: var(--arbour-text-muted);
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    flex-shrink: 0;
}
.search-icon-btn:disabled { cursor: default; }
.search-icon-btn:hover:not(:disabled) { color: var(--arbour-text); }

.search-input {
    flex: 1;
    background: none;
    border: none;
    color: var(--arbour-text);
    padding: 0.4rem 0.4rem 0.4rem 0;
    font-size: 0.9rem;
    outline: none;
    width: 0;
}

.icon-btn {
    background: none;
    border: none;
    color: var(--arbour-text-muted);
    cursor: pointer;
    padding: 0.4rem 0.5rem;
    border-radius: var(--arbour-radius-sm);
    flex-shrink: 0;
}
.icon-btn:hover:not(:disabled) { color: var(--arbour-text); background: var(--arbour-bg-deep); }
.icon-btn:disabled { opacity: 0.4; cursor: default; }
.filter-active { color: var(--arbour-info) !important; border: 1px solid var(--arbour-info); }

.filter-wrap { position: relative; }

.filter-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: 100;
    background: var(--arbour-bg);
    border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    min-width: 200px;
    padding: 0.25rem 0;
}

.filter-clear {
    width: 100%;
    background: none;
    border: none;
    color: var(--arbour-text);
    padding: 0.4rem 0.75rem;
    text-align: left;
    cursor: pointer;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.filter-clear:disabled { color: var(--arbour-text-muted); cursor: default; }
.filter-clear:hover:not(:disabled) { background: var(--arbour-bg-header-active); }

.filter-divider { border-top: 1px solid var(--arbour-border); margin: 0.25rem 0; }

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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    color: var(--arbour-text);
    cursor: pointer;
}
.filter-option:hover { background: var(--arbour-bg-header-active); }
.filter-option input { width: auto; cursor: pointer; }

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
