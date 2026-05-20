<script lang="ts">
import { page } from "$app/stores";
import ContainerLogPage from "$lib/components/ContainerLogPage.svelte";
const stackName = $derived($page.params.stackName ?? "");
const serviceName = $derived($page.params.serviceName ?? "");
</script>
<ContainerLogPage {stackName} {serviceName} />
