<script lang="ts">
import { page } from "$app/stores";
import ContainerInspectPage from "$lib/components/ContainerInspectPage.svelte";
const containerName = $derived($page.params.containerName ?? "");
const endpoint = $derived($page.params.endpoint ?? "");
</script>
<ContainerInspectPage {containerName} {endpoint} />
