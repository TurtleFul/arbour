<script lang="ts">
import type { Snippet } from "svelte";
import { onMount } from "svelte";
import { page } from "$app/stores";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { langStore } from "$lib/stores/lang.svelte";
import AppLogo from "$lib/components/AppLogo.svelte";
import Icon from "$lib/components/Icon.svelte";
import ToastContainer from "$lib/components/ToastContainer.svelte";
import Login from "$lib/components/Login.svelte";
import { compareVersions, ALL_ENDPOINTS } from "../../../common/util-common";
import "$lib/../styles/global.scss";
import "$lib/../styles/localization.scss";

const { children } = $props<{ children: Snippet }>();

const isSetup = $derived($page.url.pathname === "/setup");

const hasNewVersion = $derived(() => {
    const info = socketStore.info;
    if (info.latestVersion && info.version) {
        return compareVersions(info.latestVersion as string, info.version as string) >= 1;
    }
    return false;
});

const layoutClass = $derived(
    [socketStore.isMobile ? "mobile" : "", themeStore.isDark ? "dark" : "light"].filter(Boolean).join(" ")
);

onMount(() => {
    document.title = "Arbour - " + location.host;
    themeStore.init();
    langStore.initI18n();
    socketStore.initSocketIO();
    socketStore.checkScreenSize();
    window.addEventListener("resize", () => socketStore.checkScreenSize());
    return () => window.removeEventListener("resize", () => socketStore.checkScreenSize());
});
</script>

{#if isSetup}
    {@render children()}
{:else if langStore.ready}
    <div class={layoutClass}>
        {#if !socketStore.socketIO.connected && !socketStore.socketIO.firstConnect}
            <div class="lost-connection">
                {socketStore.socketIO.connectionErrorMsg}
                {#if socketStore.socketIO.showReverseProxyGuide}
                    {$t("reverseProxyMsg1")}
                    <a href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">
                        {$t("reverseProxyMsg2")}
                    </a>
                {/if}
            </div>
        {/if}

        <header>
            <div class="header-logo">
                <a href="/" class="logo-link">
                    <AppLogo size={40} />
                    <span class="app-title">Arbour</span>
                </a>
                {#if hasNewVersion()}
                    <a target="_blank" href="https://github.com/turtleful/arbour/releases" class="update-icon">
                        <Icon name="arrow-up" />
                    </a>
                {/if}
            </div>

            <nav class="header-nav">
                {#if socketStore.loggedIn}
                    <a href="/" class="nav-link" class:active={$page.url.pathname === "/"}>
                        <Icon name="home" />
                        <span>{$t("home")}</span>
                    </a>

                    {#if socketStore.isMobile}
                        <a href="/stacks" class="nav-link" class:active={(($page.url.pathname as string) === "/stacks")}>
                            <Icon name="list" />
                            <span>{$t("stack", { values: { n: 2 } })}</span>
                        </a>
                    {/if}

                    <a href="/console" class="nav-link" class:active={$page.url.pathname.startsWith("/console")}>
                        <Icon name="terminal" />
                        <span>{$t("console")}</span>
                    </a>

                    <div class="profile-menu">
                        <button class="nav-link profile-btn">
                            <span class="profile-pic">{socketStore.usernameFirstChar}</span>
                            <Icon name="ellipsis-v" />
                        </button>
                        <ul class="dropdown-menu">
                            <li class="dropdown-username">
                                {#if socketStore.username}
                                    {$t("signedInDisp", { values: { 0: socketStore.username } })}
                                {:else}
                                    {$t("signedInDispDisabled")}
                                {/if}
                            </li>
                            <li class="dropdown-divider"></li>
                            <li>
                                <button class="dropdown-item" onclick={() => socketStore.scanFolder()}>
                                    <Icon name="arrows-rotate" /> {$t("scanFolder")}
                                </button>
                            </li>
                            <li>
                                <a href="/settings" class="dropdown-item" class:active={$page.url.pathname.startsWith("/settings")}>
                                    <Icon name="cog" /> {$t("Settings")}
                                </a>
                            </li>
                            <li>
                                <button class="dropdown-item" onclick={() => socketStore.logout()}>
                                    <Icon name="sign-out-alt" /> {$t("Logout")}
                                </button>
                            </li>
                        </ul>
                    </div>
                {/if}
            </nav>
        </header>

        <main>
            {#if socketStore.socketIO.connecting}
                <div class="connecting-msg">
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
    display: flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background-color: var(--arbour-bg-header);
    border-bottom: 1px solid var(--arbour-bg-header);
    flex-wrap: nowrap;
}

.header-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-right: auto;
}

.logo-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
}

.app-title {
    color: var(--arbour-text);
    font-size: 1.25rem;
    font-weight: bold;
    display: none;
}

@media (min-width: 768px) {
    .app-title { display: inline; }
}

.update-icon {
    color: var(--arbour-info);
    font-weight: bold;
}

.header-nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-right: 1.5rem;
}

.nav-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-radius: var(--arbour-radius);
    color: var(--arbour-text-on-header);
    text-decoration: none;
    font-size: 0.85rem;
    gap: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: color 0.15s, background 0.15s;
}

@media (min-width: 576px) {
    .nav-link {
        flex-direction: row;
        gap: 0.4rem;
    }
}

.nav-link:hover, .nav-link.active {
    color: var(--arbour-primary);
    background-color: var(--arbour-bg-header-active);
}

.profile-menu {
    position: relative;
}

.profile-btn {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    padding: 0.5rem 0.8rem;
}

.profile-pic {
    display: none;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--arbour-radius-pill);
    background-color: var(--arbour-primary);
    color: var(--arbour-text-on-primary);
    font-weight: bold;
    font-size: 0.65rem;
}

@media (min-width: 576px) {
    .profile-pic { display: flex; }
}

.profile-menu:hover .dropdown-menu,
.profile-menu:focus-within .dropdown-menu {
    display: block;
}

.dropdown-menu {
    display: none;
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 180px;
    background-color: var(--arbour-bg);
    border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius-lg);
    overflow: hidden;
    z-index: 100;
    list-style: none;
    padding: 0;
    margin: 0;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.dropdown-username {
    padding: 0.7rem 1rem 0.5rem;
    font-size: 0.85rem;
    color: var(--arbour-text-muted);
}

.dropdown-divider {
    height: 1px;
    background-color: var(--arbour-border);
    margin: 0;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.7rem 1rem;
    background: none;
    border: none;
    text-align: left;
    color: var(--arbour-text);
    font-size: 0.9rem;
    font-family: inherit;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.1s;
}

.dropdown-item:hover {
    background-color: var(--arbour-bg-deep);
}

.dropdown-item.active {
    background-color: var(--arbour-dropdown-selected);
}

.lost-connection {
    padding: 0.4rem 1rem;
    background-color: var(--arbour-danger);
    color: var(--arbour-text-on-danger);
    position: fixed;
    width: 100%;
    z-index: 9999;
    font-size: 0.9rem;
}

.lost-connection a {
    color: inherit;
    text-decoration: underline;
}

main {
    min-height: calc(100vh - 64px);
    padding: 0;
}

.connecting-msg {
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--arbour-text-muted);
}
</style>
