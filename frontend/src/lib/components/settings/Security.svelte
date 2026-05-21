<script lang="ts">
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { settingsStore } from "$lib/stores/settings.svelte";
import Confirm from "$lib/components/Confirm.svelte";
import TwoFADialog from "$lib/components/TwoFADialog.svelte";
import type { SocketRes } from "$lib/types";

let password = $state({
    currentPassword: "",
    newPassword: "",
    repeatNewPassword: "",
});

let invalidPassword = $state(false);
let confirmDisableAuthOpen = $state(false);
let twoFAOpen = $state(false);

function savePassword() {
    if (password.newPassword !== password.repeatNewPassword) {
        invalidPassword = true;
        return;
    }
    invalidPassword = false;
    socketStore.getSocket().emit("changePassword", password, (res: SocketRes) => {
        socketStore.toastRes(res);
        if (res.ok) {
            password.currentPassword = "";
            password.newPassword = "";
            password.repeatNewPassword = "";
        }
    });
}

function disableAuth() {
    settingsStore.settings.disableAuth = true;
    settingsStore.save(() => {
        password.currentPassword = "";
        socketStore.username = null;
        socketStore.socketIO.token = "autoLogin";
    }, password.currentPassword);
}

function enableAuth() {
    settingsStore.settings.disableAuth = false;
    settingsStore.save();
    socketStore.storage().removeItem("token");
    location.reload();
}
</script>

<div class="my-4">
    {#if settingsStore.loaded}
        {#if !settingsStore.settings.disableAuth}
            <div class="mb-4 d-flex align-items-center gap-3 flex-wrap">
                <span>{$t("Current User")}: <strong>{socketStore.username}</strong></span>
                <button class="btn btn-danger" onclick={socketStore.logout.bind(socketStore)}>
                    {$t("Logout")}
                </button>
            </div>

            <h5 class="settings-subheading mb-3">{$t("Change Password")}</h5>
            <form class="mb-4" onsubmit={(e) => { e.preventDefault(); savePassword(); }}>
                <div class="mb-3">
                    <label for="current-password" class="form-label">{$t("Current Password")}</label>
                    <input
                        id="current-password"
                        class="form-control"
                        bind:value={password.currentPassword}
                        type="password"
                        autocomplete="current-password"
                        required
                    />
                </div>

                <div class="mb-3">
                    <label for="new-password" class="form-label">{$t("New Password")}</label>
                    <input
                        id="new-password"
                        class="form-control"
                        bind:value={password.newPassword}
                        type="password"
                        autocomplete="new-password"
                        required
                    />
                </div>

                <div class="mb-3">
                    <label for="repeat-new-password" class="form-label">{$t("Repeat New Password")}</label>
                    <input
                        id="repeat-new-password"
                        class="form-control"
                        class:is-invalid={invalidPassword}
                        bind:value={password.repeatNewPassword}
                        type="password"
                        autocomplete="new-password"
                        required
                        oninput={() => (invalidPassword = false)}
                    />
                    {#if invalidPassword}
                        <div class="text-danger mt-1">{$t("passwordNotMatchMsg")}</div>
                    {/if}
                </div>

                <div>
                    <button class="btn btn-primary" type="submit">
                        {$t("Update Password")}
                    </button>
                </div>
            </form>
        {/if}

        <h5 class="settings-subheading mb-3">{$t("Advanced")}</h5>
        <div class="d-flex gap-2">
            {#if settingsStore.settings.disableAuth}
                <button class="btn btn-outline-primary" onclick={enableAuth}>
                    {$t("Enable Auth")}
                </button>
            {:else}
                <button class="btn btn-primary" onclick={() => (confirmDisableAuthOpen = true)}>
                    {$t("Disable Auth")}
                </button>
            {/if}
        </div>
    {/if}
</div>

<TwoFADialog bind:open={twoFAOpen} />

<Confirm
    bind:open={confirmDisableAuthOpen}
    btnStyle="btn-danger"
    yesText={$t("I understand, please disable")}
    noText={$t("Leave")}
    onyes={disableAuth}
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t("disableauth.message1")}</p>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $t("disableauth.message2")}</p>
    <p>{$t("Please use this option carefully!")}</p>
    <div class="mb-3">
        <label for="current-password2" class="form-label">{$t("Current Password")}</label>
        <input
            id="current-password2"
            class="form-control"
            bind:value={password.currentPassword}
            type="password"
            required
        />
    </div>
</Confirm>

<style>
.is-invalid { border-color: var(--arbour-danger); }
</style>
