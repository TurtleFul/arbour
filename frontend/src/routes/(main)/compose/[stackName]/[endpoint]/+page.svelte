<script lang="ts">
import { page } from "$app/stores";
import ComposePage from "$lib/components/ComposePage.svelte";
const stackName = $derived($page.params.stackName ?? "");
const endpoint = $derived($page.params.endpoint ?? "");
</script>
{#key stackName + endpoint}
    <ComposePage {stackName} routeEndpoint={endpoint} />
{/key}
