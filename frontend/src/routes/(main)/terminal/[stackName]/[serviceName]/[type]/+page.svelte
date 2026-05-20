<script lang="ts">
import { page } from "$app/stores";
import ContainerTerminalPage from "$lib/components/ContainerTerminalPage.svelte";
const stackName = $derived($page.params.stackName ?? "");
const serviceName = $derived($page.params.serviceName ?? "");
const shell = $derived($page.params.type ?? "");
</script>
<ContainerTerminalPage {stackName} {serviceName} {shell} />
