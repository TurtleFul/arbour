<div align="center">
    <img src="./frontend/public/icon.svg" width="128" alt="Arbour" />
    <h1>Arbour</h1>
    <p>A fancy, easy-to-use Docker Compose stack manager for your homelab.</p>
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
- 30+ languages

## Getting Started

> Docker image publishing is not yet set up. See [docs/development.md](docs/development.md) to run from source.

## Development

See [docs/development.md](docs/development.md) for instructions on running Arbour locally.

## License

MIT — see [LICENSE](LICENSE).

Arbour is based on dockge, originally created by [Louis Lam](https://github.com/louislam).
