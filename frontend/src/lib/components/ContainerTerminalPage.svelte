<script lang="ts">
import { onMount } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { getContainerTerminalName } from "../../../../common/util-common";
import Terminal from "./Terminal.svelte";

const { stackName, serviceName, shell, endpoint = "" } : {
    stackName: string;
    serviceName: string;
    shell: string;
    endpoint?: string;
} = $props();

const terminalName = $derived(getContainerTerminalName(endpoint, stackName, serviceName, shell, 0));

function shellLink(s: string): string {
    return endpoint
        ? `/terminal/${stackName}/${serviceName}/${s}/${endpoint}`
        : `/terminal/${stackName}/${serviceName}/${s}`;
}

onMount(() => {
    socketStore.emitAgent(endpoint, "joinContainerTerminal", stackName, serviceName, shell, () => {});
});
</script>

<h1>{$t("terminal")} ({shell}) - {serviceName} ({stackName})</h1>

<div class="shell-links">
    {#if shell !== "bash"}
        <a href={shellLink("bash")} class="btn btn-ghost">{$t("Switch to bash")}</a>
    {/if}
    {#if shell !== "sh"}
        <a href={shellLink("sh")} class="btn btn-ghost">{$t("Switch to sh")}</a>
    {/if}
</div>

<div class="terminal-wrap">
    <Terminal rows={20} mode="interactive" name={terminalName} {stackName} {serviceName} {shell} {endpoint} />
</div>

<style>
h1 { font-size: 1.4rem; margin: 0 0 0.75rem; }
.shell-links { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.btn { padding: 0.3rem 0.7rem; border-radius: var(--arbour-radius-sm); cursor: pointer; border: 1px solid var(--arbour-border); font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; }
.btn-ghost { background: var(--arbour-bg-deep); color: var(--arbour-text-muted); }
.btn-ghost:hover { background: var(--arbour-bg-header-active); color: var(--arbour-text); }
.terminal-wrap { height: 410px; }
</style>
