<template>
    <div>
        <div class="my-4">
            <label for="language" class="form-label">
                {{ $t("Language") }}
            </label>
            <select id="language" v-model="$root.language" class="form-select">
                <option
                    v-for="(lang, i) in $i18n.availableLocales"
                    :key="`Lang${i}`"
                    :value="lang"
                >
                    {{ $i18n.messages[lang].languageName }}
                </option>
            </select>
        </div>
        <div class="my-4">
            <label for="color-theme" class="form-label">{{ $t("Theme") }}</label>
            <select id="color-theme" v-model="$root.colorTheme" class="form-select">
                <option value="arbour">Arbour</option>
                <option value="dockge">Dockge Classic</option>
                <option value="sundown">SunDown</option>
                <option value="unicorn">Unicorn</option>
                <option value="retro">Retro</option>
            </select>
        </div>
    </div>
</template>

<script>
export default {};
</script>
