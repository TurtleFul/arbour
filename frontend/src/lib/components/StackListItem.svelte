<script lang="ts">
import { page } from "$app/stores";
import Uptime from "./Uptime.svelte";
import Icon from "./Icon.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SimpleStackData } from "../../../../common/types";

const { stack } : { stack: SimpleStackData } = $props();

const url = $derived(
    stack.endpoint
        ? `/compose/${stack.name}/${stack.endpoint}`
        : `/compose/${stack.name}`
);

const isActive = $derived($page.url.pathname === url);
const agentCount = $derived(socketStore.agentCount);
const endpointDisplay = $derived(socketStore.getAgentName(stack.endpoint ?? ""));
</script>

<a href={url} class="item" class:active={isActive} class:disabled={!stack.isManagedByArbour}>
    <span class="uptime-wrap me-2"><Uptime {stack} fixedWidth={true} /></span>
    <div class="title">
        <span class="name">{stack.name}</span>
        {#if stack.started && stack.recreateNecessary}
            <Icon name="rocket" class="notification-icon" />
        {/if}
        {#if stack.started && stack.imageUpdatesAvailable}
            <Icon name="arrow-up" class="notification-icon" />
        {/if}
        {#if agentCount > 1}
            <div class="endpoint">{endpointDisplay}</div>
        {/if}
    </div>
</a>

<style>
.item {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 52px;
    padding: 5px 8px;
    margin-bottom: 2px;
    border-radius: var(--arbour-radius);
    color: var(--arbour-text);
    text-decoration: none;
    transition: background-color ease-in-out 0.15s;
}

.item:hover { background-color: var(--arbour-bg-deep); }
.item.active { background-color: var(--arbour-bg-deep); }
.item.disabled { opacity: 0.3; }

.title { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }

.uptime-wrap { display: inline-flex; align-items: center; }

.name { font-weight: 500; line-height: 1; }

.endpoint { font-size: 12px; color: var(--arbour-text-muted); }

:global(.notification-icon) { color: var(--arbour-info); }
</style>
