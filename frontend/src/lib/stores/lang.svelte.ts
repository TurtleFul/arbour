import { register, init, locale, getLocaleFromNavigator } from "svelte-i18n";
import { get } from "svelte/store";

export const languageList: Record<string, string> = {
    "bg-BG": "Български",
    "es": "Español",
    "de": "Deutsch",
    "fr": "Français",
    "pl-PL": "Polski",
    "pt": "Português",
    "pt-BR": "Português-Brasil",
    "sl": "Slovenščina",
    "tr": "Türkçe",
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文(台灣)",
    "ur": "Urdu",
    "ko-KR": "한국어",
    "ru": "Русский",
    "cs-CZ": "Čeština",
    "ar": "العربية",
    "th": "ไทย",
    "it-IT": "Italiano",
    "sv-SE": "Svenska",
    "uk-UA": "Українська",
    "da": "Dansk",
    "ja": "日本語",
    "nl": "Nederlands",
    "ro": "Română",
    "id": "Bahasa Indonesia (Indonesian)",
    "vi": "Tiếng Việt",
    "hu": "Magyar",
    "ca": "Català",
    "ga": "Gaeilge",
    "de-CH": "Schwiizerdütsch",
};

const RTL_LANGS = new Set(["fa", "ar-SY", "ur", "ar"]);

const langModules = import.meta.glob("../../lang/*.json");

export function currentLocale(): string {
    if (typeof localStorage !== "undefined" && localStorage.locale) {
        return localStorage.locale;
    }
    const nav = (typeof navigator !== "undefined" && navigator.language) ? navigator.language : "en";
    return (languageList[nav] && nav)
        || (languageList[nav.substring(0, 2)] && nav.substring(0, 2))
        || "en";
}

export function isRTL(lang: string): boolean {
    return RTL_LANGS.has(lang);
}

export function setPageLocale(lang: string) {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", isRTL(lang) ? "rtl" : "ltr");
}

class LangStore {
    language = $state(currentLocale());
    ready = $state(false);

    async initI18n() {
        register("en", () => import("../../lang/en.json") as Promise<{ default: Record<string, string> }>);

        for (const langCode of Object.keys(languageList)) {
            const path = `../../lang/${langCode}.json`;
            if (langModules[path]) {
                register(langCode, langModules[path] as () => Promise<{ default: Record<string, string> }>);
            }
        }

        await init({
            fallbackLocale: "en",
            initialLocale: this.language,
        });

        setPageLocale(this.language);
        this.ready = true;
    }

    async setLang(lang: string) {
        await locale.set(lang);
        this.language = lang;
        localStorage.locale = lang;
        setPageLocale(lang);
    }

    getCurrentLocale(): string {
        return get(locale) ?? this.language;
    }
}

export const langStore = new LangStore();
