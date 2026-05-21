<script lang="ts">
import { onMount } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import CodeEditor from "./CodeEditor.svelte";

const { containerName, endpoint = "" } = $props<{
    containerName: string;
    endpoint?: string;
}>();

let inspectData = $state("fetching ...");

onMount(() => {
    socketStore.emitAgent(endpoint, "containerInspect", containerName, (res: { ok: boolean; inspectData?: string }) => {
        if (res.ok && res.inspectData) {
            try {
                inspectData = JSON.stringify(JSON.parse(res.inspectData), undefined, 2);
            } catch {
                inspectData = res.inspectData;
            }
        }
    });
});
</script>

<h1>{$t("inspect")} - {containerName}</h1>

<div class="editor-box">
    <CodeEditor bind:value={inspectData} lang="json" isReadonly={true} />
</div>

<style>
h1 { font-size: 1.4rem; margin: 0 0 0.75rem; }
.editor-box {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    height: calc(100vh - 200px);
    min-height: 300px;
    box-shadow: 0 15px 70px rgba(0, 0, 0, 0.1);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}
</style>
