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

<form class="my-4" autocomplete="off" onsubmit={(e) => {
    e.preventDefault(); saveGeneral();
}}>
    <div class="mb-3">
        <label for="primaryHostname" class="form-label">{$t("primaryHostname")}</label>
        <div class="input-group">
            <input
                id="primaryHostname"
                class="form-control"
                bind:value={settingsStore.settings.primaryHostname}
                placeholder={$t("CurrentHostname")}
            />
            <button type="button" class="btn btn-outline-primary" onclick={autoGetPrimaryHostname}>
                {$t("autoGet")}
            </button>
        </div>
    </div>

    <div>
        <button class="btn btn-primary" type="submit">{$t("Save")}</button>
    </div>
</form>
