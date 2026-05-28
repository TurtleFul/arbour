<script lang="ts">
import type { Snippet } from "svelte";
import { onMount } from "svelte";
import { page } from "$app/stores";
import { t } from "svelte-i18n";
import { tn } from "$lib/stores/lang.svelte";
import { socketStore } from "$lib/stores/socket.svelte";
import type { SocketRes } from "$lib/types";
import { themeStore } from "$lib/stores/theme.svelte";
import { langStore } from "$lib/stores/lang.svelte";
import AppLogo from "$lib/components/AppLogo.svelte";
import Icon from "$lib/components/Icon.svelte";
import ToastContainer from "$lib/components/ToastContainer.svelte";
import Login from "$lib/components/Login.svelte";
import { compareVersions, ALL_ENDPOINTS } from "../../../common/util-common";
import { clickOutside } from "$lib/actions/clickOutside";
import "$lib/../styles/global.scss";
import "$lib/../styles/localization.scss";

const { children } = $props<{ children: Snippet }>();

const isSetup = $derived($page.url.pathname === "/setup");

const hasNewVersion = $derived.by(() => {
    const info = socketStore.info;
    if (info.latestVersion && info.version) {
        return compareVersions(info.latestVersion as string, info.version as string) >= 1;
    }
    return false;
});

const layoutClass = $derived(
    [ socketStore.isMobile ? "mobile" : "", themeStore.isDark ? "dark" : "light" ].filter(Boolean).join(" ")
);

let dropdownOpen = $state(false);

onMount(() => {
    document.title = "Arbour - " + location.host;
    themeStore.init();
    langStore.initI18n();
    socketStore.initSocketIO();
    socketStore.checkScreenSize();
    const handler = () => socketStore.checkScreenSize();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
});
</script>

{#if isSetup}
    {@render children()}
{:else if langStore.ready}
    <div class={layoutClass}>
        {#if !socketStore.socketIO.connected && !socketStore.socketIO.firstConnect}
            <div class="lost-connection">
                <div class="container-fluid">
                    {socketStore.socketIO.connectionErrorMsg}
                    {#if socketStore.socketIO.showReverseProxyGuide}
                        {$t("reverseProxyMsg1")}
                        <a href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">
                            {$t("reverseProxyMsg2")}
                        </a>
                    {/if}
                </div>
            </div>
        {/if}

        <header class="d-flex flex-nowrap align-items-center py-3 mb-3 border-bottom">
            <div class="d-flex align-items-center ms-4 me-3">
                <a href="/" class="d-flex align-items-center text-dark text-decoration-none">
                    <AppLogo size={40} />
                    <span class="d-none d-md-inline fs-4 title ms-2">Arbour</span>
                </a>
                {#if hasNewVersion}
                    <a target="_blank" href="https://github.com/turtleful/arbour/releases" class="ms-2 me-3 notification-icon">
                        <Icon name="arrow-up" />
                    </a>
                {/if}
            </div>

            <ul class="nav nav-pills d-flex flex-nowrap ms-auto">
                {#if socketStore.loggedIn}
                    <li class="nav-item me-2">
                        <a href="/" class="nav-link d-flex flex-column flex-sm-row align-items-center" class:active={$page.url.pathname === "/"} title={$t("home")}>
                            <Icon name="home" />
                            <div class="mt-2 mt-sm-0 ms-sm-2">{$t("home")}</div>
                        </a>
                    </li>

                    {#if socketStore.isMobile}
                        <li class="nav-item me-2">
                            <a href="/stacks" class="nav-link d-flex flex-column flex-sm-row align-items-center" class:active={($page.url.pathname as string) === "/stacks"} title={$tn("stack", 2)}>
                                <Icon name="list" />
                                <div class="mt-2 mt-sm-0 ms-sm-2">{$tn("stack", 2)}</div>
                            </a>
                        </li>
                    {/if}

                    <li class="nav-item me-2">
                        <a href="/console" class="nav-link d-flex flex-column flex-sm-row align-items-center" class:active={$page.url.pathname.startsWith("/console")} title={$t("console")}>
                            <Icon name="terminal" />
                            <div class="mt-2 mt-sm-0 ms-sm-2">{$t("console")}</div>
                        </a>
                    </li>

                    <li class="nav-item">
                        <div class="dropdown dropdown-profile-pic" use:clickOutside={() => (dropdownOpen = false)}>
                            <button type="button" class="nav-link profile-toggle" onclick={() => (dropdownOpen = !dropdownOpen)}>
                                <span class="profile-pic d-none d-sm-flex">{socketStore.usernameFirstChar}</span>
                                <Icon name="ellipsis-v" />
                            </button>

                            <ul class="dropdown-menu" class:show={dropdownOpen}>
                                <li>
                                    {#if socketStore.username}
                                        <span class="dropdown-item-text">
                                            {$t("signedInDisp", { values: { 0: socketStore.username } })}
                                        </span>
                                    {:else}
                                        <span class="dropdown-item-text">{$t("signedInDispDisabled")}</span>
                                    {/if}
                                </li>
                                <li><hr class="dropdown-divider" /></li>
                                <li>
                                    <button class="dropdown-item" onclick={() => {
                                        dropdownOpen = false;
                                        socketStore.emitAgent(ALL_ENDPOINTS, "requestStackList", (res: SocketRes) => socketStore.toastRes(res));
                                    }}>
                                        <Icon name="arrows-rotate" /> {$t("scanFolder")}
                                    </button>
                                </li>
                                <li>
                                    <a href="/settings" class="dropdown-item" class:active={$page.url.pathname.startsWith("/settings")} onclick={() => (dropdownOpen = false)}>
                                        <Icon name="cog" /> {$t("Settings")}
                                    </a>
                                </li>
                                <li>
                                    <button class="dropdown-item" onclick={() => {
                                        dropdownOpen = false; socketStore.logout();
                                    }}>
                                        <Icon name="sign-out-alt" /> {$t("Logout")}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </li>
                {/if}
            </ul>
        </header>

        <main>
            {#if socketStore.socketIO.connecting}
                <div class="container mt-5">
                    <h4>{$t("connecting...")}</h4>
                </div>
            {:else if socketStore.loggedIn}
                {@render children()}
            {:else if socketStore.allowLoginDialog}
                <Login />
            {/if}
        </main>
    </div>
{/if}

<ToastContainer />

<style>
header {
    background-color: var(--arbour-bg-header);
    border-bottom-color: var(--arbour-bg-header) !important;
}

header :global(span) {
    color: var(--arbour-text);
}

.title { font-weight: bold; }

main { min-height: calc(100vh - 160px); }

.nav { margin-right: 25px; }

.dropdown-profile-pic {
    user-select: none;
    position: relative;
}

.dropdown-profile-pic .profile-toggle {
    cursor: pointer;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 0.5rem 0.8rem;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
}

.dropdown-profile-pic :global(.dropdown-menu) {
    right: 0;
    left: auto;
}

.profile-pic {
    align-items: center;
    justify-content: center;
    color: var(--arbour-text-on-primary);
    background-color: var(--arbour-primary);
    width: 24px;
    height: 24px;
    margin-right: 5px;
    border-radius: var(--arbour-radius-pill);
    font-weight: bold;
    font-size: 10px;
}

.notification-icon {
    color: var(--arbour-info);
    font-weight: bold;
}
</style>
