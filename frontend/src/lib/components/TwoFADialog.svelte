<script lang="ts">
import { onMount } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import Confirm from "./Confirm.svelte";
import type { SocketRes } from "$lib/types";
import QRCode from "qrcode";

let { open = $bindable(false) } : { open?: boolean } = $props();

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
    if (!dialogEl) {
        return;
    }
    if (open) {
        dialogEl.showModal();
    } else {
        dialogEl.close();
    }
});

$effect(() => {
    if (uri) {
        QRCode.toDataURL(uri, { color: { light: "#ffffffff" },
            width: 210 }).then((url) => {
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

<dialog
    bind:this={dialogEl}
    onclose={() => (open = false)}
    onclick={(e) => {
        if (e.target === dialogEl) {
            close();
        }
    }}
>
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">
                {$t("Setup 2FA")}
                {#if twoFAStatus === true}
                    <span class="badge bg-primary ms-2">{$t("Active")}</span>
                {:else if twoFAStatus === false}
                    <span class="badge bg-secondary ms-2">{$t("Inactive")}</span>
                {/if}
            </h5>
            <button class="btn-close" onclick={close} disabled={processing} aria-label="Close"></button>
        </div>

        <div class="modal-body">
            {#if uri && twoFAStatus === false}
                <div class="qr-wrap text-center">
                    {#if qrDataUrl}
                        <img src={qrDataUrl} alt="QR Code" width="210" height="210" />
                    {/if}
                    {#if !showURI}
                        <div>
                            <button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick={() => (showURI = true)}>
                                {$t("Show URI")}
                            </button>
                        </div>
                    {/if}
                </div>
                {#if showURI}
                    <p class="text-break mt-2">{uri}</p>
                {/if}

                <div class="mt-3">
                    <label for="twofa-token" class="form-label">{$t("twoFAVerifyLabel")}</label>
                    <div class="input-group">
                        <input
                            id="twofa-token"
                            class="form-control"
                            bind:value={token}
                            type="text"
                            maxlength="6"
                            autocomplete="one-time-code"
                        />
                        <button type="button" class="btn btn-outline-primary" onclick={verifyToken}>
                            {$t("Verify Token")}
                        </button>
                    </div>
                    {#if tokenValid}
                        <p class="text-primary mt-2 mb-0">{$t("tokenValidSettingsMsg")}</p>
                    {/if}
                </div>
            {:else}
                <div>
                    <label for="twofa-pass" class="form-label">{$t("Current Password")}</label>
                    <input
                        id="twofa-pass"
                        class="form-control"
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
            <div class="modal-footer">
                <button
                    type="button"
                    class="btn btn-primary"
                    disabled={processing || !tokenValid}
                    onclick={() => (confirmEnableOpen = true)}
                >
                    {$t("Save")}
                </button>
            </div>
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
dialog { max-width: 480px; width: calc(100% - 2rem); }
.modal-title { display: flex; align-items: center; }
</style>
