<script lang="ts">
import type { Snippet } from "svelte";
import { t } from "svelte-i18n";

let {
    open = $bindable(false),
    title = "",
    yesText = "",
    noText = "",
    btnStyle = "btn-primary",
    onyes,
    onno,
    children,
} = $props<{
    open?: boolean;
    title?: string;
    yesText?: string;
    noText?: string;
    btnStyle?: string;
    onyes?: () => void;
    onno?: () => void;
    children?: Snippet;
}>();

let dialogEl: HTMLDialogElement;

$effect(() => {
    if (!dialogEl) return;
    if (open) {
        dialogEl.showModal();
    } else {
        dialogEl.close();
    }
});

function yes() {
    open = false;
    onyes?.();
}

function no() {
    open = false;
    onno?.();
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialogEl}
    onclose={() => (open = false)}
    onclick={(e) => { if (e.target === dialogEl) no(); }}
>
    <div class="dialog-box">
        <header class="dialog-header">
            <h5>{title || $t("Confirm")}</h5>
            <button class="close-btn" onclick={no} aria-label="Close">×</button>
        </header>
        <div class="dialog-body">
            {#if children}{@render children()}{/if}
        </div>
        <footer class="dialog-footer">
            <button class="btn {btnStyle}" onclick={yes}>
                {yesText || $t("Yes")}
            </button>
            <button class="btn btn-secondary" onclick={no}>
                {noText || $t("No")}
            </button>
        </footer>
    </div>
</dialog>

<style>
dialog {
    border: none;
    border-radius: var(--arbour-radius-lg);
    background: var(--arbour-bg);
    color: var(--arbour-text);
    padding: 0;
    max-width: 500px;
    width: calc(100% - 2rem);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
}

.dialog-box {
    display: flex;
    flex-direction: column;
}

.dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--arbour-border);
}

.dialog-header h5 {
    margin: 0;
    font-size: 1.1rem;
}

.close-btn {
    background: none;
    border: none;
    color: var(--arbour-text-muted);
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}
.close-btn:hover { color: var(--arbour-text); }

.dialog-body {
    padding: 1.25rem;
}

.dialog-footer {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--arbour-border);
}

.btn-secondary {
    background: transparent;
    border: 1px solid var(--arbour-border);
    color: var(--arbour-text);
}
.btn-secondary:hover { background: var(--arbour-bg-deep); }
</style>
