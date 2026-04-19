<div align="center">
    <img src="./frontend/public/icon.svg" width="128" alt="Arbour" />
    <h1>Arbour</h1>
    <p>An easy-to-use Docker Compose stack manager for your homelab.</p>
</div>

## About

Arbour is a web UI for managing Docker Compose stacks across multiple hosts. It lets you create, edit, deploy, and monitor your compose stacks through a clean browser interface — no SSH required.

It is a fork of [dockge](https://github.com/louislam/dockge), continued under a new name because the upstream project is no longer actively maintained. The goal is to build a tool with great UX that makes it easy to cultivate and maintain self-hosted services.

**Forked from:** [hamphh/dockge](https://github.com/hamphh/dockge), itself a fork of [louislam/dockge](https://github.com/louislam/dockge).

## Features

- Manage Docker Compose stacks via a web UI
- Interactive compose file editor
- Start, stop, restart, update, and delete stacks
- Real-time container logs and terminal access
- Multi-host support via agents
- Image update detection
- Docker resource management (images, volumes, networks, containers)

## Getting Started

> ⚠️ Arbour has access to your host Docker socket. Treat it like a privileged admin panel. See [SECURITY.md](SECURITY.md) before exposing it to a network.

Minimal `compose.yaml`:

```yaml
services:
  arbour:
    image: ghcr.io/turtleful/arbour:latest
    restart: unless-stopped
    ports:
      - 5001:5001
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/app/data
      # Mount your preferred host path to /opt/stacks — the right side is fixed, the left is yours
      - /opt/stacks:/opt/stacks
    environment:
      - TZ=${TZ:-UTC}
```

The right-hand side of the stacks mount must always be `/opt/stacks`. The left-hand side is any path on your host:

```yaml
# Examples — pick what suits your setup
- /opt/stacks:/opt/stacks
- /home/user/stacks:/opt/stacks
- /mnt/nas/docker/stacks:/opt/stacks
```

Then:

```bash
mkdir -p /opt/stacks   # or whichever host path you chose
docker compose up -d
```

Open <http://localhost:5001> and create the admin account on first run.

Available image tags:

| Tag | Contents |
|---|---|
| `:latest` | Latest tagged release |
| `:X.Y.Z`, `:X.Y`, `:X` | Semver-pinned release |
| `:next` | Head of `main` — all changes since the last release |

Pin to a specific `X.Y.Z` tag for production.

## Releases

- Browse all releases on [GitHub Releases](https://github.com/turtleful/arbour/releases).
- Per-version changes live in [CHANGELOG.md](CHANGELOG.md).
- Inside the app, open **Settings → Release Notes** for a readable view of what changed in each version.

## Development

See [docs/development.md](docs/development.md) for running Arbour locally from source.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

- Bug reports and feature requests → [Issues](https://github.com/turtleful/arbour/issues)
- Questions and ideas → [Discussions](https://github.com/turtleful/arbour/discussions)
- Security vulnerabilities → [SECURITY.md](SECURITY.md) (do not use public issues)

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Acknowledgments

Arbour would not exist without [Dockge](https://github.com/louislam/dockge) and the work of [Louis Lam](https://github.com/louislam). Dockge is a great tool — Arbour is a continuation of that work, with a focus on keeping it maintained and growing it further. Huge thanks to Louis and every Dockge contributor.

## License

[AGPL-3.0-or-later](LICENSE) — free to use, modify, and distribute, including over a network. Derivative works (including hosted services) must be released under the same license with source available.

Dockge's original MIT license terms are preserved in [NOTICE](NOTICE).
