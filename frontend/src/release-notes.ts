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
