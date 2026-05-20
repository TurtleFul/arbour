<script lang="ts">
import { t } from "svelte-i18n";
import { settingsStore } from "$lib/stores/settings.svelte";

function saveGeneral() {
    settingsStore.save();
}

function autoGetPrimaryHostname() {
    settingsStore.settings.primaryHostname = location.hostname;
}
</script>

<form class="settings-form" autocomplete="off" onsubmit={(e) => { e.preventDefault(); saveGeneral(); }}>
    <div class="field">
        <label for="primaryHostname">{$t("primaryHostname")}</label>
        <div class="input-row">
            <input
                id="primaryHostname"
                bind:value={settingsStore.settings.primaryHostname}
                placeholder={$t("CurrentHostname")}
            />
            <button type="button" class="btn btn-outline" onclick={autoGetPrimaryHostname}>
                {$t("autoGet")}
            </button>
        </div>
    </div>

    <div>
        <button class="btn btn-primary" type="submit">{$t("Save")}</button>
    </div>
</form>

<style>
.settings-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 0;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.field label {
    font-size: 0.88rem;
    color: var(--arbour-text-muted);
}

.field input {
    padding: 0.55rem 0.9rem;
    border-radius: var(--arbour-radius);
    flex: 1;
}

.input-row {
    display: flex;
    gap: 0.5rem;
}

.btn-outline {
    background: transparent;
    border: 1px solid var(--arbour-primary);
    color: var(--arbour-primary);
    white-space: nowrap;
}
.btn-outline:hover { background: color-mix(in srgb, var(--arbour-primary) 10%, transparent); }
</style>
