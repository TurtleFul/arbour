/* eslint-disable */
/// <reference types="vite/client" />

declare module "@fontsource/jetbrains-mono";

declare const FRONTEND_VERSION: string;
declare const DEVCONTAINER: string | undefined;
declare const CODESPACE_NAME: string | undefined;
declare const GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: string | undefined;

declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent<{}, {}, any>;
    export default component;
}
