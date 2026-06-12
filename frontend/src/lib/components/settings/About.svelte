<script lang="ts">
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { settingsStore } from "$lib/stores/settings.svelte";
import AppLogo from "$lib/components/AppLogo.svelte";
</script>

<div class="text-center my-4">
    <AppLogo size={160} />
    <div class="app-name mt-2">Arbour</div>
    <div class="version-line">{$t("Version")}: {socketStore.info.version as string ?? "—"}</div>
    <div class="text-muted">{$t("Frontend Version")}: {FRONTEND_VERSION}</div>

    {#if !socketStore.isFrontendBackendVersionMatched}
        <div class="alert alert-warning mt-3" role="alert">
            ⚠️ {$t("Frontend Version do not match backend version!")}
        </div>
    {/if}

    <div class="mt-3">
        <a
            href="https://github.com/turtleful/arbour/releases"
            target="_blank"
            rel="noopener noreferrer"
        >
            {$t("Check Update On GitHub")}
        </a>
    </div>

    <div class="mt-4 text-start mx-auto" style="max-width: 360px;">
        <div class="form-check form-switch">
            <input
                id="check-update"
                class="form-check-input"
                type="checkbox"
                bind:checked={settingsStore.settings.checkUpdate}
                onchange={() => settingsStore.save()}
            />
            <label class="form-check-label" for="check-update">{$t("Show update if available")}</label>
        </div>
        <div class="form-check form-switch">
            <input
                id="check-beta"
                class="form-check-input"
                type="checkbox"
                bind:checked={settingsStore.settings.checkBeta}
                disabled={!settingsStore.settings.checkUpdate}
                onchange={() => settingsStore.save()}
            />
            <label class="form-check-label" for="check-beta">{$t("Also check beta release")}</label>
        </div>
    </div>
</div>

<style>
.app-name { font-size: 1.5rem; font-weight: bold; }
.version-line { font-size: 0.95rem; }
</style>
