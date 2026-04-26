import { defineComponent } from "vue";

const COLOR_THEMES = [ "arbour", "dockge", "sundown", "unicorn", "retro" ] as const;
type ColorTheme = typeof COLOR_THEMES[number];

export default defineComponent({
    data() {
        const stored = localStorage.colorTheme as ColorTheme | undefined;
        return {
            colorTheme: (stored && (COLOR_THEMES as readonly string[]).includes(stored))
                ? stored as ColorTheme
                : "arbour" as ColorTheme,
        };
    },

    computed: {
        theme() {
            return "dark";
        },

        isDark() {
            return this.colorTheme !== "unicorn" && this.colorTheme !== "retro";
        },
    },

    watch: {
        colorTheme(val: ColorTheme) {
            localStorage.colorTheme = val;
            this.applyColorTheme(val);
        },
    },

    mounted() {
        document.body.classList.add("dark");
        this.applyColorTheme(this.colorTheme);
    },

    methods: {
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
                document.documentElement.setAttribute("data-bs-theme", "light");
                document.body.classList.remove("dark");
                document.body.classList.add("light");
            } else {
                document.documentElement.setAttribute("data-bs-theme", "dark");
                document.body.classList.remove("light");
                document.body.classList.add("dark");
            }
        },
    },
});
