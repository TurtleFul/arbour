<script lang="ts">
import { page } from "$app/stores";
import AgentMaintenancePage from "$lib/components/AgentMaintenancePage.svelte";
const endpoint = $derived($page.params.endpoint ?? "");
</script>
<AgentMaintenancePage {endpoint} />
