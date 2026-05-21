<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { langStore, languageList } from "$lib/stores/lang.svelte";
import type { SocketRes } from "$lib/types";

let username = $state("");
let password = $state("");
let repeatPassword = $state("");
let processing = $state(false);

onMount(() => {
    socketStore.getSocket().emit("needSetup", (needSetup: boolean) => {
        if (!needSetup) {
            goto("/");
        }
    });
});

function submit() {
    processing = true;

    if (password !== repeatPassword) {
        socketStore.toastError("PasswordsDoNotMatch");
        processing = false;
        return;
    }

    socketStore.getSocket().emit("setup", username, password, (res: SocketRes) => {
        socketStore.toastRes(res);

        if (res.ok) {
            socketStore.login(username, password, "", () => {
                processing = false;
                goto("/");
            });
        } else {
            processing = false;
        }
    });
}

const langs = Object.entries(languageList);
</script>

<div class="setup-wrap">
    <div class="setup-form">
        <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <div class="brand mb-3">
                <img src="/icon.svg" alt="Arbour" width="64" height="64" />
                <div class="brand-name">Arbour</div>
            </div>

            <p class="mt-3">{$t("Create your admin account")}</p>

            <div class="form-floating mb-3">
                <select
                    id="setup-language"
                    class="form-select"
                    value={langStore.language}
                    onchange={(e) => langStore.setLang((e.target as HTMLSelectElement).value)}
                >
                    <option value="en">English</option>
                    {#each langs as [code, name]}
                        <option value={code}>{name}</option>
                    {/each}
                </select>
                <label for="setup-language">{$t("Language")}</label>
            </div>

            <div class="form-floating mb-3">
                <input
                    id="setup-user"
                    class="form-control"
                    bind:value={username}
                    type="text"
                    placeholder={$t("Username")}
                    autocomplete="username"
                    required
                    data-cy="username-input"
                />
                <label for="setup-user">{$t("Username")}</label>
            </div>

            <div class="form-floating mb-3">
                <input
                    id="setup-pass"
                    class="form-control"
                    bind:value={password}
                    type="password"
                    placeholder={$t("Password")}
                    autocomplete="new-password"
                    required
                    data-cy="password-input"
                />
                <label for="setup-pass">{$t("Password")}</label>
            </div>

            <div class="form-floating mb-3">
                <input
                    id="setup-repeat"
                    class="form-control"
                    bind:value={repeatPassword}
                    type="password"
                    placeholder={$t("Repeat Password")}
                    autocomplete="new-password"
                    required
                    data-cy="password-repeat-input"
                />
                <label for="setup-repeat">{$t("Repeat Password")}</label>
            </div>

            <button class="btn btn-primary w-100 mt-3" type="submit" disabled={processing} data-cy="submit-setup-form">
                {$t("Create")}
            </button>
        </form>
    </div>
</div>

<style>
.setup-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 80px);
    padding: 2.5rem 1rem;
}

.setup-form {
    width: 100%;
    max-width: 330px;
    text-align: center;
}

.brand {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.brand-name {
    font-size: 28px;
    font-weight: bold;
    margin-top: 5px;
}
</style>
