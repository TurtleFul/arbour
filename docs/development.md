# Running Arbour Locally

## Prerequisites

- [Bun](https://bun.sh) >= 1.1 (replaces Node.js and npm)
- Docker (required at runtime for stack management — the backend talks to the host Docker socket)

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

Check your versions:
```bash
bun --version
docker --version
```

## Setup

Install dependencies from the project root:

```bash
bun install
```

Create a local stacks directory (where Arbour will store your compose stacks):

```bash
mkdir -p stacks
```

## Running in Dev Mode

Arbour has two servers in dev mode:

| Server | Port | Command |
|---|---|---|
| Frontend (Vite) | 5000 | `bun run dev:frontend` |
| Backend (Express + Socket.io) | 5001 | `ARBOUR_STACKS_DIR=./stacks bun run dev:backend` |

Open two terminals from the project root:

**Terminal 1 — Backend:**
```bash
ARBOUR_STACKS_DIR=./stacks bun run dev:backend
```

**Terminal 2 — Frontend:**
```bash
bun run dev:frontend
```

Then open **http://localhost:5000** in your browser. On first run you will be prompted to create an admin account.

The frontend connects directly to the backend at `:5001` for all Socket.io communication. No proxy configuration is needed.

### Combined command

```bash
bun run dev
```

This starts both servers in parallel. Running them in separate terminals gives cleaner output and easier restart control.

## Environment Variables

Bun loads `.env` natively — no `dotenv` import needed.

| Variable | Default | Description |
|---|---|---|
| `ARBOUR_STACKS_DIR` | `/opt/stacks` | Directory where compose stacks are stored |
| `ARBOUR_PORT` | `5001` | Backend server port |
| `ARBOUR_DATA_DIR` | `./data/` | Directory for the SQLite database and other runtime data |
| `ARBOUR_HOSTNAME` | (unset) | Bind hostname |
| `ARBOUR_ENABLE_CONSOLE` | `false` | Enable the web console feature |
| `ARBOUR_HIDE_LOG` | (unset) | Suppress log output, e.g. `debug_monitor,info_monitor` |
| `ARBOUR_SSL_KEY` | (unset) | Path to SSL key file |
| `ARBOUR_SSL_CERT` | (unset) | Path to SSL certificate file |

## Data

At runtime Arbour creates:

- `data/arbour.db` — SQLite database (users, settings, agents)
- `data/db-config.json` — Database configuration

Both are gitignored. Delete `data/` to reset the app to a clean state.

The database is managed with [Drizzle ORM](https://orm.drizzle.team). The schema lives in `backend/db/schema.ts`. Migrations are plain SQL files in `backend/db/migrations/` and run automatically on startup.

## Testing

```bash
bun test           # run all tests once
bun run test:watch # re-run on file changes
```

Tests use `bun:test` (built-in, no extra packages needed). Backend tests that need a database use an in-memory SQLite instance — no setup required.

Test files live next to their subjects in `__tests__/` directories:
```
common/__tests__/util-common.test.ts
common/__tests__/compose-document.test.ts
backend/__tests__/settings.test.ts
```

## Type Checking

```bash
bun run check-ts
```

## Linting

```bash
bun run lint        # check
bun run fmt         # fix
```

## Building the Frontend

To produce a production-ready frontend bundle in `frontend-dist/`:

```bash
bun run build:frontend
```

The backend serves `frontend-dist/` when `NODE_ENV` is not `development`.
