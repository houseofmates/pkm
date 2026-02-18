# pkm (personal knowledge manager)

an aesthetically comfortable, self-hosted system for identity tracking, doodling, and knowledge organization.

## quick start (service management)

the system is managed via `pkm-control.sh`.

```bash
# check status
./pkm-control.sh status

# restart services
./pkm-control.sh restart

# view logs
./pkm-control.sh logs
```

## documentation

the primary source of truth for architecture, dev patterns, and troubleshooting is:
- **[PKM_COMPREHENSIVE_MASTER_CONTEXT.md](PKM_COMPREHENSIVE_MASTER_CONTEXT.md)**

### lowercase checks (ci)

the repo enforces strictly-lowercase comments and ui text. a github action runs on pull requests and pushes to `main` that will:

- check code comments are all-lowercase (`npm run lowercase:check`)
- check visible ui strings (jsx/html attributes & text nodes) are lowercase (`npm run check:ui-lowercase`)
- run linters and tests as part of the job

to run locally:

- `npm run lowercase:check` (comments)
- `npm run check:ui-lowercase` (ui strings)
- `npm run lowercase:all` (both checks)

if you want to allow an exception, talk to the team — the CI rule is strict by design.

## architecture overview

- **frontend**: Vite-based (port 3010)
- **backend**: Node.js WebSocket/API (port 4100)
- **Services**: Managed via `systemctl --user pkm.service`, initiated by `/etc/systemd/system/pkm-boot.service`.
- **tunneling**: cloudflare tunnel (`cloudflared`) handles external routing.