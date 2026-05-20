<script lang="ts">
import type { Snippet } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import StackList from "$lib/components/StackList.svelte";
import Icon from "$lib/components/Icon.svelte";

const { children } = $props<{ children: Snippet }>();
</script>

<div class="dashboard-layout">
    {#if !socketStore.isMobile}
        <aside class="sidebar">
            <a href="/compose" class="btn btn-primary compose-btn">
                <Icon name="plus" /> {$t("compose")}
            </a>
            <StackList embedded={true} />
        </aside>
    {/if}

    <div class="main-content">
        {@render children()}
    </div>
</div>

<style>
.dashboard-layout {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem;
    min-height: calc(100vh - 64px);
    box-sizing: border-box;
}

.sidebar {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

@media (min-width: 768px) and (max-width: 1100px) {
    .sidebar { flex: 0 0 240px; }
}

.compose-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    text-decoration: none;
    justify-content: center;
    padding: 0.5rem 1rem;
    background: var(--arbour-primary);
    color: var(--arbour-text-on-primary);
    border: none;
    border-radius: var(--arbour-radius);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
}
.compose-btn:hover { background: color-mix(in srgb, var(--arbour-primary) 85%, black); }

.main-content {
    flex: 1;
    min-width: 0;
}
</style>
