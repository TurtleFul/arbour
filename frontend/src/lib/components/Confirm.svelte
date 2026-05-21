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
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">{title || $t("Confirm")}</h5>
            <button class="btn-close" onclick={no} aria-label="Close"></button>
        </div>
        <div class="modal-body">
            {#if children}{@render children()}{/if}
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick={no}>
                {noText || $t("No")}
            </button>
            <button class="btn {btnStyle}" onclick={yes}>
                {yesText || $t("Yes")}
            </button>
        </div>
    </div>
</dialog>

<style>
dialog { max-width: 500px; width: calc(100% - 2rem); }
</style>
