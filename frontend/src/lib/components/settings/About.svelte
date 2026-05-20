<script lang="ts">
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { settingsStore } from "$lib/stores/settings.svelte";
import AppLogo from "$lib/components/AppLogo.svelte";
</script>

<div class="about-wrap">
    <AppLogo size={160} />
    <div class="app-name">Arbour</div>
    <div class="version-line">{$t("Version")}: {socketStore.info.version as string ?? "—"}</div>
    <div class="frontend-version">{$t("Frontend Version")}: {FRONTEND_VERSION}</div>

    {#if !socketStore.isFrontendBackendVersionMatched}
        <div class="version-warning" role="alert">
            ⚠️ {$t("Frontend Version do not match backend version!")}
        </div>
    {/if}

    <a
        class="update-link"
        href="https://github.com/turtleful/arbour/releases"
        target="_blank"
        rel="noopener noreferrer"
    >
        {$t("Check Update On GitHub")}
    </a>

    <div class="checks">
        <label>
            <input
                type="checkbox"
                bind:checked={settingsStore.settings.checkUpdate}
                onchange={() => settingsStore.save()}
            />
            {$t("Show update if available")}
        </label>
        <label>
            <input
                type="checkbox"
                bind:checked={settingsStore.settings.checkBeta}
                disabled={!settingsStore.settings.checkUpdate}
                onchange={() => settingsStore.save()}
            />
            {$t("Also check beta release")}
        </label>
    </div>
</div>

<style>
.about-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    gap: 0.5rem;
}

.app-name {
    font-size: 1.5rem;
    font-weight: bold;
}

.version-line {
    font-size: 0.95rem;
}

.frontend-version {
    font-size: 0.875rem;
    color: var(--arbour-text-muted);
}

.version-warning {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: color-mix(in srgb, var(--arbour-warning) 15%, transparent);
    border: 1px solid var(--arbour-warning);
    border-radius: var(--arbour-radius);
    font-size: 0.9rem;
    text-align: center;
}

.update-link {
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: var(--arbour-primary);
}

.checks {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.checks label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}
</style>
