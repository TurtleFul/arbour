# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/turtleful/arbour/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/turtleful/arbour/releases/tag/v0.2.0
