# Contributing to Arbour

Thanks for considering a contribution. Arbour is a community-maintained fork of [Dockge](https://github.com/louislam/dockge) — every bit of help keeps it alive and growing.

## Ground Rules

- **Be respectful.** See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **Open an issue before large changes.** Small fixes (typos, obvious bugs) can go straight to a PR. For new features or substantial refactors, please discuss first so we don't duplicate work or build something that won't be accepted.
- **Security issues go through [SECURITY.md](SECURITY.md), not public issues.**

## Development Setup

Full instructions are in [docs/development.md](docs/development.md). Short version:

```bash
bun install
ARBOUR_STACKS_DIR=./stacks bun run dev
```

Open <http://localhost:5000>.

## Before You Submit a PR

Run the full local check suite:

```bash
bun run verify   # fmt + typecheck + test in one command
```

Or individually:

```bash
bun run lint        # eslint (check only)
bun run fmt         # eslint --fix
bun run typecheck   # vue-tsc --noEmit
bun test            # unit tests
```

All must pass. CI runs the same checks via Dagger (`dagger call ci --source=.`).

## Commit Messages

Keep them short and descriptive. No strict convention required — look at `git log` for the house style. If your change is user-visible, add an entry to [CHANGELOG.md](CHANGELOG.md) under `## Unreleased`.

## Pull Request Checklist

- [ ] Branch is up to date with `main`
- [ ] `bun run verify` passes (fmt + typecheck + test)
- [ ] New behavior has tests where reasonable
- [ ] User-visible changes are noted in `CHANGELOG.md`
- [ ] No secrets, personal data, or large binaries committed

## What We're Looking For

- Bug fixes (especially around compose editing, agent connectivity, container lifecycle)
- Documentation improvements
- Translations (see `frontend/src/lang/`)
- Small UX wins
- Test coverage

## What to Avoid

- Large unsolicited rewrites
- Introducing heavy new dependencies without discussion
- Breaking changes to the compose schema or on-disk data format without a migration

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0-or-later](LICENSE), the same license as the rest of the project.
