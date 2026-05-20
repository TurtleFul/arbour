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

<div class="settings-section">
    {#if settingsStore.loaded}
        {#if !settingsStore.settings.disableAuth}
            <div class="user-row">
                <span>{$t("Current User")}: <strong>{socketStore.username}</strong></span>
                <button class="btn btn-danger" onclick={socketStore.logout.bind(socketStore)}>
                    {$t("Logout")}
                </button>
            </div>

            <section>
                <h5 class="section-heading">{$t("Change Password")}</h5>
                <form class="pass-form" onsubmit={(e) => { e.preventDefault(); savePassword(); }}>
                    <div class="field">
                        <label for="current-password">{$t("Current Password")}</label>
                        <input
                            id="current-password"
                            bind:value={password.currentPassword}
                            type="password"
                            autocomplete="current-password"
                            required
                        />
                    </div>

                    <div class="field">
                        <label for="new-password">{$t("New Password")}</label>
                        <input
                            id="new-password"
                            bind:value={password.newPassword}
                            type="password"
                            autocomplete="new-password"
                            required
                        />
                    </div>

                    <div class="field">
                        <label for="repeat-new-password">{$t("Repeat New Password")}</label>
                        <input
                            id="repeat-new-password"
                            bind:value={password.repeatNewPassword}
                            type="password"
                            autocomplete="new-password"
                            class:invalid={invalidPassword}
                            required
                            oninput={() => (invalidPassword = false)}
                        />
                        {#if invalidPassword}
                            <span class="error-hint">{$t("passwordNotMatchMsg")}</span>
                        {/if}
                    </div>

                    <div>
                        <button class="btn btn-primary" type="submit">
                            {$t("Update Password")}
                        </button>
                    </div>
                </form>
            </section>
        {/if}

        <section>
            <h5 class="section-heading">{$t("Advanced")}</h5>
            <div class="btn-row">
                {#if settingsStore.settings.disableAuth}
                    <button class="btn btn-outline" onclick={enableAuth}>
                        {$t("Enable Auth")}
                    </button>
                {:else}
                    <button class="btn btn-primary" onclick={() => (confirmDisableAuthOpen = true)}>
                        {$t("Disable Auth")}
                    </button>
                {/if}
            </div>
        </section>
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
    <div class="field">
        <label for="current-password2">{$t("Current Password")}</label>
        <input
            id="current-password2"
            bind:value={password.currentPassword}
            type="password"
            required
        />
    </div>
</Confirm>

<style>
.settings-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 1rem 0;
}

.user-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.section-heading {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1rem;
    color: var(--arbour-text-muted);
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
}

.pass-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 360px;
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

.field input.invalid {
    border-color: var(--arbour-danger);
}

.error-hint {
    font-size: 0.82rem;
    color: var(--arbour-danger);
}

.btn-row {
    display: flex;
    gap: 0.5rem;
}

.btn-outline {
    background: transparent;
    border: 1px solid var(--arbour-primary);
    color: var(--arbour-primary);
}
.btn-outline:hover { background: color-mix(in srgb, var(--arbour-primary) 10%, transparent); }
</style>
