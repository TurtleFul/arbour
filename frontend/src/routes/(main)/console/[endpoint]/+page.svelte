<script lang="ts">
import { onMount } from "svelte";
import { t } from "svelte-i18n";
import { page } from "$app/stores";
import { socketStore } from "$lib/stores/socket.svelte";
import Terminal from "$lib/components/Terminal.svelte";

const endpoint = $derived($page.params.endpoint ?? "");

let enableConsole = $state(false);
let loading = $state(true);

$effect(() => {
    const ep = endpoint;
    loading = true;
    socketStore.emitAgent(ep, "checkMainTerminal", (res: { ok: boolean }) => {
        enableConsole = res.ok;
        loading = false;
    });
});
</script>

{#if !loading}
    <h1>{$t("console")}</h1>
    {#if enableConsole}
        <div class="terminal-wrap">
            <Terminal rows={20} mode="mainTerminal" name="console" {endpoint} />
        </div>
    {:else}
        <div class="alert">
            <h4>{$t("Console is not enabled")}</h4>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <p>{@html $t("ConsoleNotEnabledMSG1")}</p>
        </div>
    {/if}
{/if}

<style>
h1 { font-size: 2rem; margin: 0 0 1rem; }
.terminal-wrap { height: 410px; }
.alert { background: color-mix(in srgb, var(--arbour-warning) 12%, transparent); border: 1px solid var(--arbour-warning); border-radius: var(--arbour-radius-lg); padding: 1rem 1.25rem; }
.alert h4 { font-size: 1rem; margin: 0 0 0.5rem; }
.alert p { margin: 0.25rem 0; font-size: 0.9rem; }
</style>
