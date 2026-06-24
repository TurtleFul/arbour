<script lang="ts">
import { page } from "$app/stores";
import Uptime from "./Uptime.svelte";
import Icon from "./Icon.svelte";
import type { SimpleStackData } from "../../../../common/types";

const { stack } : { stack: SimpleStackData } = $props();

const url = $derived(
    stack.endpoint
        ? `/compose/${stack.name}/${stack.endpoint}`
        : `/compose/${stack.name}`
);

const isActive = $derived($page.url.pathname === url);
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
    </div>
</a>

<style>
.item {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 48px;
    padding: 6px 10px;
    border-radius: var(--arbour-radius-sm);
    background-color: transparent;
    border: 1px solid var(--arbour-border);
    color: var(--arbour-text);
    text-decoration: none;
    transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.item:hover {
    background-color: var(--arbour-bg-header-active);
    border-color: var(--arbour-text-muted);
}
.item.active {
    background-color: var(--arbour-bg-header-active);
    border-color: var(--arbour-primary);
    box-shadow: inset 3px 0 0 var(--arbour-primary);
}
.item.disabled { opacity: 0.4; }

.title { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }

.uptime-wrap { display: inline-flex; align-items: center; }

.name { font-weight: 500; line-height: 1; }

:global(.notification-icon) { color: var(--arbour-info); }
</style>
