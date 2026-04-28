export interface ReleaseNoteSection {
    title: string;
    items: string[];
}

export interface ReleaseNote {
    version: string;
    date: string;
    title?: string;
    summary?: string;
    sections: ReleaseNoteSection[];
}

export const releaseNotes: ReleaseNote[] = [
    {
        version: "0.4.0",
        date: "TBD",
        title: "Performance",
        summary: "A focused performance release that reduces unnecessary network traffic, shrinks the initial bundle, and cuts redundant database and Docker API work.",
        sections: [
            {
                title: "Back-end",
                items: [
                    "Added a targeted stackUpdate socket event — hot-path operations (start, stop, restart, update) now push a single stack diff instead of rebroadcasting the entire stack list.",
                    "Stack list broadcast skipped entirely when state has not changed (hash comparison).",
                    "Settings batch writes consolidated into a single SELECT + transaction instead of one query per key.",
                    "Docker network list cached for 60 seconds to avoid redundant Docker API calls.",
                    "Stack polling interval relaxed from every 10 s to every 30 s; real-time events cover the gap.",
                    "Agent reconnect loop replaced with a proper event-driven wait instead of a polling sleep.",
                ],
            },
            {
                title: "Front-end",
                items: [
                    "CodeMirror editor (compose and inspect views) is now lazy-loaded via defineAsyncComponent, splitting it into a separate chunk and reducing the initial bundle by ~430 KB.",
                    "Stack status counts for the dashboard computed in a single pass over the stack list.",
                    "completeStackList filter rebuild debounced to 500 ms to avoid redundant recalculation on rapid updates.",
                ],
            },
        ],
    },
    {
        version: "0.3.5",
        date: "2026-04-27",
        title: "Theme Refinements",
        summary: "Polishes the theming system introduced in 0.3.4, with a theme-aware logo, better accent colour palette, and improved button contrast.",
        sections: [
            {
                title: "Theming",
                items: [
                    "New theme-aware AppLogo SVG component — gradient colours follow the active theme via CSS custom properties.",
                    "Fixed logo visibility in light themes (Retro, Unicorn) by setting darker gradient stops for those palettes.",
                    "Accent colours (info, danger, warning, maintenance) switched to pastels for better readability on dark backgrounds.",
                    "btn-normal, btn-danger, btn-warning, and btn-info now correctly inherit theme accent colours instead of hard-coded Bootstrap defaults.",
                    "Improved contrast for btn-normal so it is clearly distinguishable from the surrounding background.",
                ],
            },
        ],
    },
    {
        version: "0.3.4",
        date: "2026-04-26",
        title: "Themes",
        summary: "Introduces a theme system with four built-in options and an Appearance settings page to switch between them.",
        sections: [
            {
                title: "Themes",
                items: [
                    "Four built-in themes: Arbour (default dark green), Dockge Classic (the original Dockge dark look), SunDown (warm dark), Retro (light amber), and Unicorn (light purple).",
                    "New Appearance tab in Settings to select the active theme.",
                    "Theme preference persisted in the database and restored on next login.",
                    "CSS custom properties (--arbour-*) drive all theme colours, making it straightforward to add community themes.",
                ],
            },
            {
                title: "Styling",
                items: [
                    "General styling cleanup and consistency pass across the application.",
                ],
            },
        ],
    },
    {
        version: "0.3.3",
        date: "2026-04-25",
        title: "Network Info and Service Logging",
        summary: "Adds network inspection, improves how Docker artefacts are presented, and expands service-level event logging.",
        sections: [
            {
                title: "Networking",
                items: [
                    "Network inspect modal — click any network badge to view its full Docker inspect output inline.",
                    "Networks now shown as interactive badges alongside volumes and images in the stack view.",
                ],
            },
            {
                title: "Service Logging",
                items: [
                    "Additional service lifecycle events (network connect/disconnect, exec create) captured in the service event log.",
                    "Docker artefact display improved for volumes and images.",
                ],
            },
        ],
    },
    {
        version: "0.3.2",
        date: "2026-04-25",
        title: "More Update Options and Service History",
        summary: "Gives per-service control over image updates and introduces a persistent event log for individual services.",
        sections: [
            {
                title: "Updates",
                items: [
                    "Per-service update operations — update a single service's image without restarting the whole stack.",
                    "Per-service recreate and restart actions available from the service detail view.",
                ],
            },
            {
                title: "Service Event Log",
                items: [
                    "New service event history panel — start, stop, restart, and error events are recorded and displayed per container.",
                    "Event log persisted in the database so history survives page reloads.",
                ],
            },
            {
                title: "CI",
                items: [
                    "Dagger pipeline functions updated and consolidated.",
                    "Added a verify script (type-check + lint + test in one command).",
                    "Bun set as the explicit runtime target for all CI steps.",
                ],
            },
        ],
    },
    {
        version: "0.3.1",
        date: "2026-04-19",
        title: "Auto-Update Fix",
        summary: "Bug-fix release for the auto-update feature introduced in 0.3.0.",
        sections: [
            {
                title: "Bug Fixes",
                items: [
                    "Auto-update setting now takes effect immediately when the update-available trigger fires, instead of waiting for the next scheduled check cycle.",
                ],
            },
        ],
    },
    {
        version: "0.3.0",
        date: "2026-04-19",
        title: "Auto-Updates and Stack Importing",
        summary: "Two major quality-of-life features: automated image updates for stacks and a way to import existing compose files into Arbour.",
        sections: [
            {
                title: "Stack Auto-Updates",
                items: [
                    "Automatic image update support for managed stacks — enable per-stack from the stack settings.",
                    "Two trigger modes: update immediately when a new image is available, or schedule updates for a specific time.",
                    "Background StackAutoUpdateManager polls registries and applies updates without manual intervention.",
                    "Update status and last-checked time shown in the stack UI.",
                ],
            },
            {
                title: "Stack Importing",
                items: [
                    "Import existing compose stacks into Arbour management without moving files — point Arbour at a directory and it adopts the stack.",
                    "Imported stacks behave identically to stacks created through the UI.",
                ],
            },
        ],
    },
    {
        version: "0.2.0",
        date: "2026-04-18",
        title: "First public release of Arbour",
        summary: "Arbour is a continuation of Dockge under a new name and license, rebuilt on a modern toolchain. This release establishes the foundations: new branding, a Bun-based runtime, an AGPL license, public image publishing, and the scaffolding needed to run as a healthy open-source project.",
        sections: [
            {
                title: "Rebranding",
                items: [
                    "Forked from hamphh/dockge (itself a fork of louislam/dockge) and renamed to Arbour.",
                    "All identifiers renamed: backend classes (ArbourServer, ArbourSocket), environment variables (ARBOUR_*), compose labels (arbour.*), compose extension key (x-arbour), CSS custom properties (--arbour-*), database file (arbour.db).",
                    "New logo and brand mark.",
                    "Version reset from upstream 1.5.x to 0.2.0 to signal an early-stage restart.",
                ],
            },
            {
                title: "Runtime and Tooling",
                items: [
                    "Replaced Node.js + npm with Bun as the runtime, package manager, and test runner.",
                    "CI pipeline rewritten as a Dagger TypeScript module in .dagger/ — the same pipeline runs locally and in GitHub Actions.",
                    "ESLint migrated to flat config (eslint.config.js) and unified typescript-eslint package.",
                    "Added bun:test suite covering util-common, compose-document, and settings.",
                ],
            },
            {
                title: "Database",
                items: [
                    "Replaced sqlite3 + knex + redbean-node with bun:sqlite + Drizzle ORM.",
                    "Plain SQL migrations in backend/db/migrations/ run automatically on startup.",
                ],
            },
            {
                title: "Terminal",
                items: [
                    "Replaced node-pty with bun-pty for native Bun compatibility.",
                    "Replaced promisify-child-process with Bun.spawn.",
                ],
            },
            {
                title: "Editor",
                items: [
                    "Replaced Prism.js + vue-prism-editor with CodeMirror 6 + vue-codemirror.",
                    "Added JSON and YAML language support and the one-dark theme.",
                ],
            },
            {
                title: "Major Dependency Upgrades",
                items: [
                    "Express 4 → 5",
                    "Vite 5 → 8",
                    "TypeScript 5 → 6",
                    "ESLint 8 → 10",
                    "Vue Router 4 → 5",
                    "vue-i18n 10 → 11",
                    "Font Awesome 6 → 7",
                    "Bootstrap-Vue-Next 0.40 → 0.44",
                    "@vitejs/plugin-vue 5 → 6",
                    "unplugin-vue-components 0.25 → 32",
                    "eslint-plugin-jsdoc 46 → 62",
                    "@actions/github 6 → 9",
                    "jwt-decode 3 → 4",
                    "type-fest 4 → 5",
                    "dotenv 16 → 17",
                    "croner 8 → 10",
                    "bcryptjs 2 → 3",
                    "check-password-strength 2 → 3",
                ],
            },
            {
                title: "Removed",
                items: [
                    "compare-versions — replaced with a small internal helper in common/util-common.ts.",
                    "xterm-addon-web-links — deprecated and no longer needed.",
                    "linux/arm/v7 Docker platform — dropped with the Bun migration.",
                    "Dead release scripts (release-final, release-beta, mark-as-nightly) and the orphaned Dockerfile nightly stage.",
                ],
            },
            {
                title: "Licensing",
                items: [
                    "Relicensed from Apache-2.0 to AGPL-3.0-or-later to ensure network-hosted derivatives remain open.",
                    "Added a NOTICE file preserving Dockge's original MIT license and attribution to Louis Lam.",
                ],
            },
            {
                title: "Packaging and Publishing",
                items: [
                    "Docker image published at ghcr.io/turtleful/arbour.",
                    "GitHub Actions workflow publishes multi-arch images (amd64, arm64) on every push to main (tagged :next) and on semver tags (:X.Y.Z, :X.Y, :X, :latest).",
                    "Dockerfile simplified to a single Bun-based multi-stage build.",
                ],
            },
            {
                title: "Open Source Foundations",
                items: [
                    "Added CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md.",
                    "Added GitHub issue templates (bug report, feature request), pull request template, Dependabot config, and funding config.",
                    "Wired the in-app update check to the GitHub Releases API.",
                    "Added docs/development.md with local setup instructions.",
                ],
            },
        ],
    },
];
