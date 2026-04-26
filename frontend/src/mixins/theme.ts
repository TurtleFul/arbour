import { defineComponent } from "vue";

export default defineComponent({
    computed: {
        theme() {
            return "dark";
        },

        isDark() {
            return true;
        }
    },

    mounted() {
        document.body.classList.add("dark");
        document.querySelector("#theme-color")?.setAttribute("content", "#161B22");
    },
});
