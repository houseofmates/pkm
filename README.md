# PKM (Personal Knowledge Management)

A aesthetic, self-hosted system for identity tracking, infinite canvas, and knowledge organization.

## Quick Start (Service Management)

The system is managed via `pkm-control.sh`.

```bash
# Check status
./pkm-control.sh status

# Restart services
./pkm-control.sh restart

# View logs
./pkm-control.sh logs
```

## Documentation

The primary source of truth for architecture, dev patterns, and troubleshooting is:
- **[PKM_COMPREHENSIVE_MASTER_CONTEXT.md](PKM_COMPREHENSIVE_MASTER_CONTEXT.md)**

## Architecture Overview

- **Frontend**: Vite-based (port 3010)
- **Backend**: Node.js WebSocket/API (port 4100)
- **Services**: Managed via `systemctl --user pkm.service`, initiated by `/etc/systemd/system/pkm-boot.service`.
- **Tunneling**: Cloudflare Tunnel (`cloudflared`) handles external routing.

---

**Context for LLMs:**
### Core Purpose & Identity
This project is a **Personal Knowledge Management (PKM)** system built specifically for the user, who is a **depressed autistic DID (Dissociative Identity Disorder) system with ADHD**. 
- The app must feel safe, low-friction, and visually calming.
- It acts as a custom frontend for **NocoBase** and **SimplyPlural**.

### Strict Typography Rule: All Lowercase
- **Mandatory**: All user-facing UI text (buttons, labels, headers, placeholders, etc.) MUST be lowercase.
- **Exceptions**: Data values stored within database fields (e.g., a record title entered by the user) should be displayed as-is, but all UI chrome and fixed labels must be lowercase.
- **Correction Policy**: If any hardcoded text or visible UI label is found with capitalization, it is considered a bug and must be changed to lowercase immediately.
