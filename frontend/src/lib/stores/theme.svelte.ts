export const COLOR_THEMES = [ "arbour", "dockge", "sundown", "unicorn", "retro" ] as const;
export type ColorTheme = typeof COLOR_THEMES[number];

class ThemeStore {
    colorTheme = $state<ColorTheme>(
        ((): ColorTheme => {
            const stored = typeof localStorage !== "undefined" ? localStorage.colorTheme as string | undefined : undefined;
            return stored && (COLOR_THEMES as readonly string[]).includes(stored)
                ? (stored as ColorTheme)
                : "arbour";
        })()
    );

    isDark = $derived(this.colorTheme !== "unicorn" && this.colorTheme !== "retro");

    init() {
        this.applyColorTheme(this.colorTheme);
    }

    setTheme(theme: ColorTheme) {
        this.colorTheme = theme;
        localStorage.colorTheme = theme;
        this.applyColorTheme(theme);
    }

    applyColorTheme(theme: ColorTheme) {
        const metaColors: Record<string, string> = {
            dockge: "#161B22",
            sundown: "#1f1135",
            unicorn: "#ec4899",
            retro: "#8c8680",
        };
        const metaColor = metaColors[theme] ?? "#1c2e1e";
        document.querySelector("#theme-color")?.setAttribute("content", metaColor);

        if (theme === "arbour") {
            document.body.removeAttribute("data-theme");
        } else {
            document.body.setAttribute("data-theme", theme);
        }

        if (theme === "unicorn" || theme === "retro") {
            document.body.classList.remove("dark");
            document.body.classList.add("light");
        } else {
            document.body.classList.remove("light");
            document.body.classList.add("dark");
        }
    }
}

export const themeStore = new ThemeStore();
