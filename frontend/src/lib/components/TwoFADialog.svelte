<script lang="ts">
import { onMount } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import Confirm from "./Confirm.svelte";
import type { SocketRes } from "$lib/types";
import QRCode from "qrcode";

let { open = $bindable(false) } = $props<{ open?: boolean }>();

let currentPassword = $state("");
let processing = $state(false);
let uri = $state<string | null>(null);
let tokenValid = $state(false);
let twoFAStatus = $state<boolean | null>(null);
let token = $state("");
let showURI = $state(false);
let qrDataUrl = $state("");
let dialogEl: HTMLDialogElement;

let confirmEnableOpen = $state(false);
let confirmDisableOpen = $state(false);

$effect(() => {
    if (!dialogEl) return;
    if (open) {
        dialogEl.showModal();
    } else {
        dialogEl.close();
    }
});

$effect(() => {
    if (uri) {
        QRCode.toDataURL(uri, { color: { light: "#ffffffff" }, width: 210 }).then((url) => {
            qrDataUrl = url;
        });
    }
});

onMount(() => {
    getStatus();
});

function close() {
    open = false;
}

function getStatus() {
    socketStore.getSocket().emit("twoFAStatus", (res: SocketRes) => {
        if (res.ok) {
            twoFAStatus = res.status as boolean | null;
        } else {
            socketStore.toastRes(res);
        }
    });
}

function prepare2FA() {
    processing = true;
    socketStore.getSocket().emit("prepare2FA", currentPassword, (res: SocketRes) => {
        processing = false;
        if (res.ok) {
            uri = res.uri as string | null;
        } else {
            socketStore.toastRes(res);
        }
    });
}

function verifyToken() {
    socketStore.getSocket().emit("verifyToken", token, currentPassword, (res: SocketRes) => {
        if (res.ok) {
            tokenValid = res.valid as boolean;
        } else {
            socketStore.toastRes(res);
        }
    });
}

function save2FA() {
    processing = true;
    socketStore.getSocket().emit("save2FA", currentPassword, (res: SocketRes) => {
        processing = false;
        if (res.ok) {
            socketStore.toastRes(res);
            getStatus();
            currentPassword = "";
            close();
        } else {
            socketStore.toastRes(res);
        }
    });
}

function disable2FA() {
    processing = true;
    socketStore.getSocket().emit("disable2FA", currentPassword, (res: SocketRes) => {
        processing = false;
        if (res.ok) {
            socketStore.toastRes(res);
            getStatus();
            currentPassword = "";
            close();
        } else {
            socketStore.toastRes(res);
        }
    });
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialogEl}
    onclose={() => (open = false)}
    onclick={(e) => { if (e.target === dialogEl) close(); }}
>
    <div class="dialog-box">
        <header class="dialog-header">
            <h5>
                {$t("Setup 2FA")}
                {#if twoFAStatus === true}
                    <span class="badge">{$t("Active")}</span>
                {:else if twoFAStatus === false}
                    <span class="badge badge-inactive">{$t("Inactive")}</span>
                {/if}
            </h5>
            <button class="close-btn" onclick={close} disabled={processing} aria-label="Close">×</button>
        </header>

        <div class="dialog-body">
            {#if uri && twoFAStatus === false}
                <div class="qr-wrap">
                    {#if qrDataUrl}
                        <img src={qrDataUrl} alt="QR Code" width="210" height="210" />
                    {/if}
                    {#if !showURI}
                        <button type="button" class="btn btn-sm btn-outline mt-2" onclick={() => (showURI = true)}>
                            {$t("Show URI")}
                        </button>
                    {/if}
                </div>
                {#if showURI}
                    <p class="uri-text">{uri}</p>
                {/if}

                <div class="field mt-3">
                    <label for="twofa-token">{$t("twoFAVerifyLabel")}</label>
                    <div class="token-row">
                        <input
                            id="twofa-token"
                            bind:value={token}
                            type="text"
                            maxlength="6"
                            autocomplete="one-time-code"
                        />
                        <button type="button" class="btn btn-outline" onclick={verifyToken}>
                            {$t("Verify Token")}
                        </button>
                    </div>
                    {#if tokenValid}
                        <p class="token-valid-msg">{$t("tokenValidSettingsMsg")}</p>
                    {/if}
                </div>
            {:else}
                <div class="field">
                    <label for="twofa-pass">{$t("Current Password")}</label>
                    <input
                        id="twofa-pass"
                        bind:value={currentPassword}
                        type="password"
                        autocomplete="current-password"
                    />
                </div>

                {#if twoFAStatus === false}
                    <button type="button" class="btn btn-primary mt-3" onclick={prepare2FA}>
                        {$t("Enable 2FA")}
                    </button>
                {/if}

                {#if twoFAStatus === true}
                    <button
                        type="button"
                        class="btn btn-danger mt-3"
                        disabled={processing}
                        onclick={() => (confirmDisableOpen = true)}
                    >
                        {$t("Disable 2FA")}
                    </button>
                {/if}
            {/if}
        </div>

        {#if uri && twoFAStatus === false}
            <footer class="dialog-footer">
                <button
                    type="button"
                    class="btn btn-primary"
                    disabled={processing || !tokenValid}
                    onclick={() => (confirmEnableOpen = true)}
                >
                    {$t("Save")}
                </button>
            </footer>
        {/if}
    </div>
</dialog>

<Confirm
    bind:open={confirmEnableOpen}
    btnStyle="btn-danger"
    yesText={$t("Yes")}
    noText={$t("No")}
    onyes={save2FA}
>
    {$t("confirmEnableTwoFAMsg")}
</Confirm>

<Confirm
    bind:open={confirmDisableOpen}
    btnStyle="btn-danger"
    yesText={$t("Yes")}
    noText={$t("No")}
    onyes={disable2FA}
>
    {$t("confirmDisableTwoFAMsg")}
</Confirm>

<style>
dialog {
    border: none;
    border-radius: var(--arbour-radius-lg);
    background: var(--arbour-bg);
    color: var(--arbour-text);
    padding: 0;
    max-width: 480px;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

.badge {
    font-size: 0.75rem;
    padding: 0.2em 0.5em;
    border-radius: var(--arbour-radius);
    background: var(--arbour-primary);
    color: #fff;
}
.badge-inactive { background: var(--arbour-text-muted); }

.qr-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.uri-text {
    word-break: break-all;
    font-size: 0.85rem;
    margin-top: 0.5rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.field label {
    font-size: 0.88rem;
    color: var(--arbour-text-muted);
}

.field input {
    padding: 0.55rem 0.9rem;
    border-radius: var(--arbour-radius);
}

.token-row {
    display: flex;
    gap: 0.5rem;
}

.token-row input {
    flex: 1;
    padding: 0.55rem 0.9rem;
    border-radius: var(--arbour-radius);
}

.token-valid-msg {
    color: var(--arbour-primary);
    margin: 0.5rem 0 0;
}

.btn-outline {
    background: transparent;
    border: 1px solid var(--arbour-primary);
    color: var(--arbour-primary);
}
.btn-outline:hover { background: color-mix(in srgb, var(--arbour-primary) 10%, transparent); }

.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
</style>
