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
            <div class="form-floating mb-3">
                <input
                    id="login-user"
                    class="form-control"
                    bind:value={username}
                    type="text"
                    placeholder={$t("Username")}
                    autocomplete="username"
                    required
                />
                <label for="login-user">{$t("Username")}</label>
            </div>
            <div class="form-floating mb-3">
                <input
                    id="login-pass"
                    class="form-control"
                    bind:value={password}
                    type="password"
                    placeholder={$t("Password")}
                    autocomplete="current-password"
                    required
                />
                <label for="login-pass">{$t("Password")}</label>
            </div>
        {:else}
            <div class="form-floating mb-3">
                <input
                    id="login-otp"
                    class="form-control"
                    bind:value={token}
                    type="text"
                    maxlength="6"
                    placeholder="123456"
                    autocomplete="one-time-code"
                    required
                />
                <label for="login-otp">{$t("Token")}</label>
            </div>
        {/if}

        <div class="form-check d-flex justify-content-center mb-3">
            <input id="remember-me" class="form-check-input me-2" type="checkbox" bind:checked={socketStore.remember} />
            <label class="form-check-label" for="remember-me">{$t("Remember me")}</label>
        </div>

        <button class="btn btn-primary w-100" type="submit" disabled={processing}>
            {$t("Login")}
        </button>

        {#if res && !res.ok}
            <div class="alert alert-danger mt-3" role="alert">
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
}
</style>
