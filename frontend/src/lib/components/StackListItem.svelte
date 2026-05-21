<script lang="ts">
import { page } from "$app/stores";
import Uptime from "./Uptime.svelte";
import Icon from "./Icon.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SimpleStackData } from "../../../../common/types";

const { stack } = $props<{ stack: SimpleStackData }>();

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
.item { color: var(--arbour-text); }

.title { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }

.uptime-wrap { display: inline-flex; align-items: center; }

.name { font-weight: 500; }

.endpoint { font-size: 12px; color: var(--arbour-text-muted); }

:global(.notification-icon) { color: var(--arbour-info); }
</style>
