<script lang="ts">
import { getIconHtml } from "$lib/icon";

const { name, spin = false, class: extraClass = "" } = $props<{
    name: string;
    spin?: boolean;
    class?: string;
}>();

const html = $derived(getIconHtml(name, [spin ? "fa-spin" : "", extraClass].filter(Boolean).join(" ")));
</script>

{@html html}
