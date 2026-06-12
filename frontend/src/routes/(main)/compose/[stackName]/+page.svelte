<script lang="ts">
import { page } from "$app/stores";
import ComposePage from "$lib/components/ComposePage.svelte";
const stackName = $derived($page.params.stackName ?? "");
</script>
{#key stackName}
    <ComposePage {stackName} />
{/key}
