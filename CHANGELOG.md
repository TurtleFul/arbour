# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.6] — 2026-06-24

### Fixed
- Failed stack creation no longer leaves a broken stack behind. A new stack that fails validation, or fails to come up at deploy time (e.g. a host port is already in use), is now rolled back — its folder, files, and any partially-started containers are removed. Existing stacks are never deleted when a re-deploy fails.

### Changed
- Tidied the multi-host stack list: the host header bar and stack cards now align to a single clean column (removed the offset left rail and edge-to-edge header).

### Added
- Tests covering stack creation and deploy failure/rollback paths (`deployStackWithRollback`, atomic `save()` rollback).

## [0.5.5] — 2026-06-24

### Changed
- Major code-quality pass guided by a TypeScript style guide: enabled ESLint `consistent-type-imports`, `ban-ts-comment`, and `no-explicit-any` (warn); replaced every `@ts-ignore` with a described `@ts-expect-error`; removed redundant `export default`s in favour of named exports; tightened `object`/`any` types; and converted `.then()` chains to `async`/`await`. Removed blanket ESLint ignores in favour of documented, scoped exceptions.

### Fixed
- Smaller styling fixes: the `manual` event-log badge now uses a muted accent colour (distinct from the automated triggers), improved terminal-panel contrast, the container resource-usage chevron no longer shifts when toggled, and sticky host headers no longer overlap stacks while scrolling.

## [0.5.4] — 2026-06-24

### Fixed
- Image-update arrow indicator lingered after an auto-update finished — stack state (including the "update available" flag) is now recomputed immediately after an update completes, with a regression test.

### Changed
- Dependabot now also covers the `.dagger` CI module, uses Conventional Commit prefixes, and ignores xterm prerelease churn. A new workflow regenerates `bun.lock` on Dependabot PRs so CI no longer fails on frozen-lockfile mismatches.
- Dependency maintenance (TypeScript 6, `actions/checkout` v7, and others).

## [0.5.3] — 2026-06-24

### Added
- Expanded backend unit tests around image-update detection and stack status, with the decision logic extracted into pure, testable helpers; added `LimitQueue` tests.

## [0.5.2] — 2026-06-24

### Added
- Cron schedule input now tidies itself on blur — e.g. `03***` is reformatted to `0 3 * * *`.

### Changed
- Restyled the stack list: each stack renders as a distinct card, and the multi-host view groups stacks under host headers with per-host stack counts.

### Fixed
- Image-update arrow and other FontAwesome icons rendered at full viewport size (missing inline-SVG sizing); icons now size to the surrounding text.

## [0.5.1] — 2026-06-14

### Changed
- Theme and styling refinements following the Svelte rewrite.

### Fixed
- ESLint `no-useless-assignment` error in the combined-terminal logic that broke the original 0.5.1 release build.

### Added
- Pre-commit hook that runs `bun run lint` so lint errors are caught before they reach CI, plus a `bun run lint:fix` script.

## [0.5.0] — 2026-06-12

## Major Frontend Rewrite

### Changed
I like svelte. I don't mind vue. But I much prefer to work with Svelte. 
So I did use an LLM to help me rewrite the frontend to use Svelte.
This is to make it easier to add new features and maintain the codebase.
I have tested this pretty thuroughly myself, since I do use Arbour a lot, but please report any issues you find. 

### Fixed
- Stack List filter reactivity bug where toggling options didn't immediately update the UI.
- "Double-highlighting" glitch in CodeMirror 6 YAML editor where browser's native selection stacked with the editor's custom selection.
- Terminal clipping issue where top-left characters were cut off by rounded corners.
- Missing "Setup 2FA" button in Security settings page restored, and missing English translation keys for 2FA dialogs added.

### Removed
- Remaining Vue-specific exclusions and build tools from `tsconfig.json`, `eslint.config.js`, and developer documentation.

## [0.4.7] — 2026-06-05

### Added
- Enhanced testing coverage for pipeline execution and deployment workflows.

### Changed
- Dependency maintenance: Updated core packages to latest compatible versions.
- Pipeline optimizations for faster CI feedback loops.

## [0.4.6] — 2026-05-28

### Added
- Unit tests for backend image processing and stack management logic.

### Changed
- Improved log view scrolling performance and memory usage.

### Fixed
- Dependency vulnerability fixes and general maintenance updates.

## [0.4.5] — 2026-05-15

### Changed
- Refined theme color palettes (especially for Retro and Unicorn) to improve accessibility and contrast.

## [0.4.4] — 2026-05-10

### Added
- `CODEOWNERS` file to maintain repository structure and review workflows.

### Fixed
- Responsive wrapping issues for long service titles and action buttons on narrow viewports.

## [0.4.3] — 2026-05-02

### Added
- Copy-to-clipboard button on the YAML editor (visible in view mode only) — icon briefly swaps to a check mark on success.

### Fixed
- Frontend TypeScript errors eliminated — `frontend/tsconfig.json` and `vue-augmentation.d.ts` added so Volar and `vue-tsc` correctly type-check all Vue files.
- `$t`, `$root`, and common socket callback types now properly declared via Vue `ComponentCustomProperties` augmentation.
- Several minor property-name bugs and unused import warnings cleaned up.

## [0.4.2] — 2026-04-30

### Fixed
- Missing test dependency for backend unit tests.

## [0.4.1] — 2026-04-29

### Added
- Initial backend unit test suite covering core service logic.
- Documentation updates to the `README.md`.

### Removed
- Unused legacy dependencies and leftover Vue assets.

## [0.4.0] — 2026-04-28

### Added
- Targeted `stackUpdate` socket event — hot-path operations push a single stack diff instead of rebroadcasting the full list.
- Stack list broadcast skipped when state is unchanged (hash comparison).
- CodeMirror editor lazy-loaded via `defineAsyncComponent`, reducing the initial JS bundle by ~430 KB.
- Docker network list cached with a 60-second TTL.
- Agent reconnect replaced with an event-driven wait.

### Changed
- Stack polling interval relaxed from 10 s to 30 s.
- Settings batch writes consolidated into a single `SELECT` + transaction.
- `completeStackList` filter rebuild debounced to 500 ms.
- xterm pinned to specific beta versions to prevent silent breakage on `bun update`.

### Removed
- `drizzle-kit`, `@actions/github`, `@fortawesome/free-regular-svg-icons` (unused dependencies).
- `vue-tsc` moved from `dependencies` to `devDependencies`.

## [0.3.5] — 2026-04-27

### Added
- Theme-aware AppLogo SVG component — gradient colours follow the active theme via CSS custom properties.

### Changed
- Accent colours (info, danger, warning, maintenance) switched to pastels for better readability on dark backgrounds.
- Button variants (btn-danger, btn-warning, btn-info, btn-normal) now inherit theme accent colours.
- Improved btn-normal contrast so it is distinguishable from its background.

### Fixed
- Logo visibility in light themes (Retro, Unicorn) — darker gradient stops applied for those palettes.

## [0.3.4] — 2026-04-26

### Added
- Four built-in themes: Arbour (default), Dockge Classic, SunDown, Retro, Unicorn.
- Appearance tab in Settings to select and persist the active theme.

### Changed
- General styling cleanup and consistency pass.

## [0.3.3] — 2026-04-25

### Added
- Network inspect modal — click any network badge to view its full Docker inspect output.
- Networks shown as interactive badges alongside volumes and images.
- Additional service lifecycle events captured in the event log.

## [0.3.2] — 2026-04-25

### Added
- Per-service update, recreate, and restart operations.
- Service event history panel — lifecycle events recorded and persisted per container.

### Changed
- Dagger CI pipeline updated; added `verify` script (fmt + typecheck + test in one command).

## [0.3.1] — 2026-04-19

### Fixed
- Auto-update setting now applies immediately when the update-available trigger fires.

## [0.3.0] — 2026-04-19

### Added
- Stack auto-update support — enable per-stack with immediate or scheduled trigger modes.
- Stack importing — adopt existing compose files into Arbour management without moving them.

## [0.2.0] — 2026-04-18

First public release of the Arbour fork. Renamed from Dockge and refocused on long-term maintenance of the homelab compose-manager use case.

### Added
- Docker image published to `ghcr.io/turtleful/arbour` via GitHub Actions on tag push.
- `NOTICE` file preserving Dockge's original MIT attribution.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- Issue and pull request templates.
- Dependabot config for npm, docker, and github-actions.

### Changed
- Relicensed from Apache-2.0 to AGPL-3.0-or-later (Dockge upstream remains MIT; see `NOTICE`).
- Rebranded from Dockge to Arbour throughout: class names (`ArbourServer`, `ArbourSocket`), env vars (`ARBOUR_*`), compose labels (`arbour.*`), CSS variables (`--arbour-*`).
- Runtime switched from Node.js + npm to Bun.
- Database layer switched to `bun:sqlite` + Drizzle ORM.
- CI pipeline rewritten as a Dagger TypeScript module.
- Default Docker image tags: `:latest`, `:X.Y.Z`, `:X.Y`, `:X` on release; `:next` on every push to `main`.

### Removed
- `linux/arm/v7` Docker build (dropped with the Bun migration).
- Broken release scripts (`release-final`, `release-beta`, `mark-as-nightly`) that referenced missing files.
- Obsolete `.vscode/tasks.json` entries (npm-based, pre-Bun).

[0.5.6]: https://github.com/turtleful/arbour/compare/v0.5.5...HEAD
[0.5.5]: https://github.com/turtleful/arbour/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/turtleful/arbour/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/turtleful/arbour/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/turtleful/arbour/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/turtleful/arbour/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/turtleful/arbour/compare/v0.4.7...v0.5.0
[0.4.7]: https://github.com/turtleful/arbour/compare/v0.4.6...v0.4.7
[0.4.6]: https://github.com/turtleful/arbour/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/turtleful/arbour/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/turtleful/arbour/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/turtleful/arbour/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/turtleful/arbour/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/turtleful/arbour/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/turtleful/arbour/compare/v0.3.5...v0.4.0
[0.3.5]: https://github.com/turtleful/arbour/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/turtleful/arbour/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/turtleful/arbour/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/turtleful/arbour/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/turtleful/arbour/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/turtleful/arbour/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/turtleful/arbour/releases/tag/v0.2.0
