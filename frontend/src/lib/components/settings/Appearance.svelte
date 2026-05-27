<script lang="ts">
import { t } from "svelte-i18n";
import { langStore, languageList } from "$lib/stores/lang.svelte";
import { themeStore, type ColorTheme } from "$lib/stores/theme.svelte";

const langs = Object.entries(languageList);
</script>

<div class="my-4">
    <div class="mb-3">
        <label for="language" class="form-label">{$t("Language")}</label>
        <select
            id="language"
            class="form-select"
            value={langStore.language}
            onchange={(e) => langStore.setLang((e.target as HTMLSelectElement).value)}
        >
            <option value="en">English</option>
            {#each langs as [ code, name ] (code)}
                <option value={code}>{name}</option>
            {/each}
        </select>
    </div>

    <div class="mb-3">
        <label for="color-theme" class="form-label">{$t("Theme")}</label>
        <select
            id="color-theme"
            class="form-select"
            value={themeStore.colorTheme}
            onchange={(e) => themeStore.setTheme((e.target as HTMLSelectElement).value as ColorTheme)}
        >
            <option value="arbour">Arbour</option>
            <option value="dockge">Dockge Classic</option>
            <option value="sundown">SunDown</option>
            <option value="unicorn">Unicorn</option>
            <option value="retro">Retro</option>
        </select>
    </div>
</div>

<style>
.form-select { max-width: 360px; }
</style>
