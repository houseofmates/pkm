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

## architecture overview

- **frontend**: Vite-based (port 3010)
- **backend**: Node.js WebSocket/API (port 4100)
- **Services**: Managed via `systemctl --user pkm.service`, initiated by `/etc/systemd/system/pkm-boot.service`.
- **tunneling**: cloudflare tunnel (`cloudflared`) handles external routing.