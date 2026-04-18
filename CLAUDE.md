# Arbour — Project Context

## What is Arbour?

Arbour is a web UI for managing Docker Compose stacks across multiple hosts. It is a fork of [dockge](https://github.com/louislam/dockge) (originally by louislam, later maintained by hamphh), continued under a new name because the upstream project is no longer actively maintained.

The theme: help people **cultivate their homelabs** — good UX, easy to use, focused on self-hosted services.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun (replaces Node.js + npm; also used as test runner) |
| Backend | TypeScript, Express, Socket.io |
| Frontend | Vue 3, Vite, Bootstrap 5, Bootstrap-Vue-Next |
| Database | SQLite via `bun:sqlite` + Drizzle ORM |
| Terminal | xterm.js + Bun.spawn |
| Packaging | Docker (multi-arch: amd64, arm64 — arm/v7 dropped with Bun migration) |
| CI | Dagger (TS SDK module in `.dagger/`) — runs locally and in CI |

## Project Structure

```
backend/          TypeScript backend
  arbour-server.ts   Main server class (ArbourServer)
  util-server.ts     Shared types incl. ArbourSocket
  stack.ts           Stack/compose management logic
  database.ts        SQLite setup and migrations (Drizzle)
  db/
    schema.ts        Drizzle table definitions (source of truth for schema)
    index.ts         initDb / getDb / closeDb
    migrations/      Plain SQL migration files
  agent-*.ts         Multi-host agent logic
  socket-handlers/   Socket.io event handlers
  agent-socket-handlers/  Agent-side handlers
  __tests__/         Backend unit tests
common/           Shared code (backend + frontend)
  types.ts           Shared TypeScript types
  util-common.ts     Shared utilities and constants
  compose-document.ts  Compose YAML document model
  compose-labels.ts  Arbour-specific compose labels (arbour.*)
  __tests__/         Common unit tests
frontend/
  src/
    components/    Vue components
    pages/         Vue page components
    layouts/       App layout shells
    lang/          i18n translations (30+ languages)
    mixins/        Vue mixins (socket, theme, lang)
    styles/        SCSS — CSS vars use --arbour-* prefix
docker/           Dockerfile (single multi-stage, Bun-based)
.dagger/          Dagger CI module (TypeScript)
  src/index.ts      Pipeline functions: test, lint, checkTs, buildFrontend, buildImage, ci
extra/            Dev helpers (dev.ts, reset-password.ts) + healthcheck.ts
stacks/           Local dev stacks directory (gitignored)
data/             Runtime data dir — SQLite DB lives here (gitignored)
```

## Key Naming Decisions (from dockge fork)

- Class names: `ArbourServer`, `ArbourSocket`
- Env vars: `ARBOUR_STACKS_DIR`, `ARBOUR_PORT`, `ARBOUR_DATA_DIR`, `ARBOUR_ENABLE_CONSOLE`, etc.
- Compose extension key: `x-arbour`
- Compose labels: `arbour.status.ignore`, `arbour.imageupdates.check`, etc.
- CSS custom properties: `--arbour-primary-color`, etc.
- i18n keys: `arbourAgent`, `arbourURL`, `stackNotManagedByArbourMsg`
- Docker image target: `ghcr.io/turtleful/arbour` (published via `.github/workflows/publish.yml`)
- Database file: `data/arbour.db`
- Internal sentinel: `##ALL_ARBOUR_ENDPOINTS##`

## Running Locally

See [docs/development.md](docs/development.md).

## Known TODOs / Not Yet Done

- Docker image `ghcr.io/turtleful/arbour` — first release tag (`v0.2.0`) needed to populate GHCR; workflow at `.github/workflows/publish.yml`
- `bun run lint` still has pre-existing errors/warnings carried over from dockge — ongoing cleanup
- Inline TODOs scattered in frontend components (Container.vue, StackList.vue, Terminal.vue) inherited from upstream — cosmetic, not blocking
