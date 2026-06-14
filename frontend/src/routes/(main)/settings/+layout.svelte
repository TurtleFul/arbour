<script lang="ts">
import { page } from "$app/stores";
import { t } from "svelte-i18n";
import { onMount, type Snippet } from "svelte";
import { goto } from "$app/navigation";
import { settingsStore } from "$lib/stores/settings.svelte";

const { children } : { children: Snippet } = $props();

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

<div>
    <h1 class="mb-3">{$t("Settings")}</h1>

    <div class="shadow-box shadow-box-settings">
        <div class="row">
            <div class="settings-menu col-lg-4 col-sm-12">
                <div class="d-flex flex-row flex-wrap flex-lg-column align-items-start">
                    {#each Object.entries(subMenus) as [ key, label ] (key)}
                        <a href="/settings/{key}" class="d-none d-lg-block w-100" class:active={$page.url.pathname === `/settings/${key}`}>
                            <div class="menu-item menu-item-v">{label}</div>
                        </a>
                        <a href="/settings/{key}" class="d-inline d-lg-none mb-3 me-2" class:active={$page.url.pathname === `/settings/${key}`}>
                            <div class="menu-item menu-item-h">{label}</div>
                        </a>
                    {/each}
                </div>
            </div>
            <div class="settings-content col-lg-8 col-sm-12">
                <div class="settings-content-header d-none d-lg-block">
                    {currentPage() ? subMenus[currentPage() as keyof typeof subMenus] ?? "" : ""}
                </div>
                <div class="mx-3">
                    {@render children()}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.shadow-box-settings {
    padding: 20px;
    min-height: calc(100vh - 155px);
}

.settings-menu :global(a) { text-decoration: none !important; color: var(--arbour-text); }

.settings-menu :global(.menu-item) {
    border-radius: var(--arbour-radius);
    margin: 0.5em;
    padding: 0.7em 1em;
    cursor: pointer;
    border-left-width: 0;
    border-bottom-width: 0;
    transition: all ease-in-out 0.1s;
}

.settings-menu :global(.menu-item:hover) {
    background: var(--arbour-bg-header-active);
    color: var(--arbour-text-on-header);
}

.settings-menu :global(.active .menu-item-v) {
    background: var(--arbour-bg-header-active);
    color: var(--arbour-text-on-header);
    border-left: 4px solid var(--arbour-primary);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.settings-menu :global(.active .menu-item-h) {
    background: var(--arbour-bg-header-active);
    color: var(--arbour-text-on-header);
    border-bottom: 4px solid var(--arbour-primary);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}

.settings-content :global(.settings-content-header) {
    width: calc(100% + 20px);
    border-radius: 0 var(--arbour-radius) 0 0;
    margin-top: -20px;
    margin-right: -20px;
    padding: 12.5px 1em;
    font-size: 26px;
    background: var(--arbour-bg-header);
    color: var(--arbour-text-on-header);
}
</style>
