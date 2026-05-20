<script lang="ts">
import { t } from "svelte-i18n";
import { langStore, languageList } from "$lib/stores/lang.svelte";
import { themeStore, type ColorTheme } from "$lib/stores/theme.svelte";

const langs = Object.entries(languageList);
</script>

<div class="settings-section">
    <div class="field">
        <label for="language">{$t("Language")}</label>
        <select
            id="language"
            value={langStore.language}
            onchange={(e) => langStore.setLang((e.target as HTMLSelectElement).value)}
        >
            <option value="en">English</option>
            {#each langs as [code, name]}
                <option value={code}>{name}</option>
            {/each}
        </select>
    </div>

    <div class="field">
        <label for="color-theme">{$t("Theme")}</label>
        <select
            id="color-theme"
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
.settings-section {
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

.field select {
    padding: 0.55rem 0.9rem;
    border-radius: var(--arbour-radius);
    background: var(--arbour-bg-deep);
    color: var(--arbour-text);
    border: 1px solid var(--arbour-border);
    max-width: 360px;
}
</style>
