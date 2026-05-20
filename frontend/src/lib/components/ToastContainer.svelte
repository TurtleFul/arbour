<script lang="ts">
import { toastStore } from "$lib/stores/toast.svelte";
import { fly } from "svelte/transition";
</script>

<div class="toast-container">
    {#each toastStore.items as toast (toast.id)}
        <div
            class="toast toast--{toast.type}"
            transition:fly={{ y: 20, duration: 200 }}
        >
            <span class="toast__msg">{toast.message}</span>
            <button class="toast__close" onclick={() => toastStore.dismiss(toast.id)}>×</button>
        </div>
    {/each}
</div>

<style>
.toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 380px;
}

.toast {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: var(--arbour-radius);
    color: #fff;
    font-size: 0.9rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    cursor: default;
}

.toast--success { background: color-mix(in srgb, var(--arbour-primary) 90%, #000); }
.toast--error   { background: color-mix(in srgb, var(--arbour-danger)  90%, #000); }
.toast--info    { background: color-mix(in srgb, var(--arbour-info)    90%, #000); }

.toast__msg {
    flex: 1;
    word-break: break-word;
}

.toast__close {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    opacity: 0.7;
    flex-shrink: 0;
}

.toast__close:hover { opacity: 1; }
</style>
