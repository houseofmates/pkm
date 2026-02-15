# Copilot Instructions for PKM & Discord Qwen Bot Workspace

## Project Overview
- **pkm/**: Personal Knowledge Management system for a neurodivergent user. Emphasizes safety, low friction, and a calming UI. Integrates with NocoBase and SimplyPlural.
- **discord-qwen-bot/**: Discord bot using Qwen LLM via Ollama, with custom slash commands and channel integration. Includes Minecraft mod bridge (chestray-mod/).

## Architecture & Key Patterns
- **Frontend**: Vite (port 3010)
- **Backend**: Node.js WebSocket/API (port 4100)
- **Service Management**: Use `pkm-control.sh` for status, restart, and logs. Systemd units manage startup.
- **Tunneling**: Cloudflare Tunnel (`cloudflared`) for external access.
- **Bot**: Main logic in `index.js`, commands in `deploy-commands.js`, diagnostics in `diagnose.js`.
- **Minecraft Mod**: Java 25+, uses sealed classes, records, and pattern matching. See `chestray-mod/README.md`.

## Critical Conventions
- **Typography**: All user-facing UI text must be lowercase (except user data). Any capitalization in UI chrome is a bug.
- **File Organization**: Scripts and configs are in root; workflows and mods in subfolders. See `PKM_COMPREHENSIVE_MASTER_CONTEXT.md` for rationale.
- **Deployment**: Use `pkm-sync.sh` or `deploy-fixes.sh` for syncing and quick fixes.
- **Testing/Debug**: Use `debug-bot.js` for Discord bot, `diagnose.js` for config checks, and `debug-rgl.cjs`/`debug-draggable.cjs` for PKM UI.

## Developer Workflows
- **Start/Stop PKM**: `./pkm-control.sh status|restart|logs`
- **Sync to GitHub**: `./pkm-sync.sh`
- **Deploy Discord Bot**: `node deploy-commands.js` (registers slash commands)
- **Restart Bot**: `pm2 restart housebot` or `./deploy-fixes.sh`
- **Import n8n Workflows**: Use n8n UI, import fixed JSON, activate.

## Integration Points
- **NocoBase/SimplyPlural**: PKM acts as a frontend; see master context for API details.
- **Ollama/Qwen**: Discord bot queries Qwen LLM via Ollama; prompt engineering in `index.js`.
- **Minecraft Mod**: Communicates via custom handshake and session protocol; see `chestray-mod/common/` and `server/`.

## Examples & References
- See `PKM_COMPREHENSIVE_MASTER_CONTEXT.md` for architecture, troubleshooting, and design rationale.
- For bot fixes and workflow imports, see `QUICK_REFERENCE.md` and `README_SETUP.md` in discord-qwen-bot/.
- For mod architecture, see `chestray-mod/README.md`.

## AI Agent Guidance
- Always follow the lowercase UI rule.
- Reference the master context for any non-obvious design or workflow questions.
- Prefer scripts and documented workflows over ad-hoc commands.
- When in doubt, check for recent fixes in `QUICK_REFERENCE.md`.

---
For unclear or missing conventions, ask the user for clarification or point to the relevant file for further details.
