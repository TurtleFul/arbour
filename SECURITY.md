# Security Policy

## Supported Versions

Arbour is in early development (0.x). Only the latest release receives security fixes.

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| older   | ❌        |

## Threat Model

Arbour runs with access to the host Docker socket (`/var/run/docker.sock`), which is equivalent to root on the host. This means:

- **A compromise of Arbour is a compromise of the host.** Treat the Arbour UI like a privileged admin panel.
- Do not expose Arbour directly to the public internet without authentication, TLS, and ideally a reverse proxy with IP allow-listing.
- The admin account created on first run has full control — protect it with a strong password.

If you are deploying Arbour, prefer:

- Binding to a private network or VPN only
- Placing it behind a reverse proxy (Caddy, nginx, Traefik) with TLS
- Regular image updates (pin to a version tag; watch for releases)

## Reporting a Vulnerability

**Please do not report security vulnerabilities in public issues.**

Report them privately via GitHub Security Advisories:

**[Open a private security advisory](https://github.com/turtleful/arbour/security/advisories/new)**

Include:

- A description of the issue and its impact
- Steps to reproduce (proof-of-concept welcome)
- Affected version(s)
- Any suggested remediation

### What to expect

- Acknowledgement within **5 business days**
- An initial assessment within **14 days**
- Coordinated disclosure once a fix is available — credit given unless you prefer to remain anonymous

Thank you for helping keep Arbour and its users safe.
