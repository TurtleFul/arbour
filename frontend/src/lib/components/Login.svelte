<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";

let username = $state("");
let password = $state("");
let token = $state("");
let processing = $state(false);
let tokenRequired = $state(false);
let res = $state<SocketRes | null>(null);

const origTitle = document.title;
onMount(() => { document.title += " — Login"; });
onDestroy(() => { document.title = origTitle; });

function submit() {
    processing = true;
    socketStore.login(username, password, token, (r) => {
        processing = false;
        if (r.tokenRequired) {
            tokenRequired = true;
        } else {
            res = r;
        }
    });
}
</script>

<div class="login-wrap">
    <form class="login-form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
        {#if !tokenRequired}
            <div class="field">
                <label for="login-user">{$t("Username")}</label>
                <input
                    id="login-user"
                    bind:value={username}
                    type="text"
                    placeholder={$t("Username")}
                    autocomplete="username"
                    required
                />
            </div>
            <div class="field">
                <label for="login-pass">{$t("Password")}</label>
                <input
                    id="login-pass"
                    bind:value={password}
                    type="password"
                    placeholder={$t("Password")}
                    autocomplete="current-password"
                    required
                />
            </div>
        {:else}
            <div class="field">
                <label for="login-otp">{$t("Token")}</label>
                <input
                    id="login-otp"
                    bind:value={token}
                    type="text"
                    maxlength="6"
                    placeholder="123456"
                    autocomplete="one-time-code"
                    required
                />
            </div>
        {/if}

        <div class="remember-row">
            <label>
                <input type="checkbox" bind:checked={socketStore.remember} />
                {$t("Remember me")}
            </label>
        </div>

        <button class="btn btn-primary w-100" type="submit" disabled={processing}>
            {$t("Login")}
        </button>

        {#if res && !res.ok}
            <div class="error-msg" role="alert">
                {$t(res.msg as string)}
            </div>
        {/if}
    </form>
</div>

<style>
.login-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 80px);
    padding: 2rem 1rem;
}

.login-form {
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
    padding: 0.65rem 1.1rem;
    border-radius: var(--arbour-radius);
}

.remember-row {
    display: flex;
    justify-content: center;
}

.remember-row label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    color: var(--arbour-text);
}

.w-100 { width: 100%; }

.error-msg {
    padding: 0.75rem 1rem;
    background: color-mix(in srgb, var(--arbour-danger) 20%, transparent);
    border: 1px solid var(--arbour-danger);
    border-radius: var(--arbour-radius);
    color: var(--arbour-danger);
    font-size: 0.9rem;
}
</style>
