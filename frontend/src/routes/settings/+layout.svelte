<script lang="ts">
import { page } from "$app/stores";
import { t } from "svelte-i18n";
import { onMount, type Snippet } from "svelte";
import { goto } from "$app/navigation";
import { settingsStore } from "$lib/stores/settings.svelte";

const { children } = $props<{ children: Snippet }>();

const subMenus = $derived({
    general: $t("general"),
    appearance: $t("Appearance"),
    security: $t("Security"),
    "release-notes": $t("Release Notes"),
    about: $t("About"),
});

const currentPage = $derived(() => {
    const parts = $page.url.pathname.split("/");
    const last = parts[parts.length - 1];
    return last && last !== "settings" ? last : null;
});

onMount(() => {
    settingsStore.load();
    if (!currentPage()) {
        goto("/settings/general");
    }
});
</script>

<div class="settings-wrap">
    <h1 class="settings-title">{$t("Settings")}</h1>

    <div class="settings-box">
        <nav class="settings-menu">
            {#each Object.entries(subMenus) as [key, label]}
                <a
                    href="/settings/{key}"
                    class="menu-item"
                    class:active={$page.url.pathname === `/settings/${key}`}
                >
                    {label}
                </a>
            {/each}
        </nav>

        <div class="settings-content">
            {#if currentPage()}
                <div class="content-header">{subMenus[currentPage() as keyof typeof subMenus] ?? ""}</div>
            {/if}
            <div class="content-body">
                {@render children()}
            </div>
        </div>
    </div>
</div>

<style>
.settings-wrap {
    padding: 1.5rem 1rem;
}

.settings-title {
    margin-bottom: 1rem;
    font-size: 1.75rem;
}

.settings-box {
    display: flex;
    min-height: calc(100vh - 155px);
    background: var(--arbour-bg);
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}

.settings-menu {
    display: flex;
    flex-direction: column;
    width: 200px;
    flex-shrink: 0;
    border-right: 1px solid var(--arbour-border);
    padding: 0.5rem;
}

.menu-item {
    text-decoration: none;
    color: var(--arbour-text);
    border-radius: var(--arbour-radius);
    padding: 0.7rem 1rem;
    transition: background 0.1s ease;
    border-left: 4px solid transparent;
}

.menu-item:hover {
    background: var(--arbour-bg-header-active);
}

.menu-item.active {
    background: var(--arbour-bg-header-active);
    border-left-color: var(--arbour-primary);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.settings-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.content-header {
    padding: 0.85rem 1.25rem;
    font-size: 1.4rem;
    background: var(--arbour-bg-header);
    border-bottom: 1px solid var(--arbour-border);
}

.content-body {
    padding: 0 1.25rem;
    flex: 1;
}

@media (max-width: 768px) {
    .settings-box {
        flex-direction: column;
    }

    .settings-menu {
        width: 100%;
        flex-direction: row;
        flex-wrap: wrap;
        border-right: none;
        border-bottom: 1px solid var(--arbour-border);
    }

    .menu-item {
        border-left: none;
        border-bottom: 4px solid transparent;
        border-radius: var(--arbour-radius);
    }

    .menu-item.active {
        border-left: none;
        border-left-color: transparent;
        border-bottom-color: var(--arbour-primary);
        border-top-left-radius: var(--arbour-radius);
        border-bottom-left-radius: var(--arbour-radius);
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
    }

    .content-header {
        display: none;
    }
}
</style>
