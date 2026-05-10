# pkm — a calm, infinitely reliable thought space

> offline-first, infinite-canvas knowledge manager with bidirectional git sync, real-time collaboration, and zero-effort operation.

## what is this?

pkm is a self-sustaining personal knowledge workspace designed for people who need their tools to just work — forever. it combines an infinite edgeless canvas, structured data through nocobase, real-time websocket collaboration, and automatic bidirectional git sync so your ideas are never lost, no matter what happens to your hardware.

## philosophy

- **offline-first**: your data lives on your device first. sync is a convenience, not a requirement.
- **never lose a thought**: auto-save, auto-sync, auto-backup to git. if the internet drops, changes queue locally and replay when it returns.
- **zero maintenance**: systemd services auto-restart on crash. health checks monitor every component. conflicts resolve automatically with visual notifications.
- **calm by design**: dark theme, lowercase typography (varela round), gentle animations, no clutter.

## one-command setup

```bash
# 1. clone the repository
git clone https://github.com/houseofmates/pkm.git
cd pkm

# 2. install dependencies (exact versions locked in package-lock.json)
npm install

# 3. start the development stack (frontend + backend)
npm run dev
```

the web app will be available at `http://localhost:3010` and the backend at `http://localhost:4100`.

## production deployment

### systemd services (recommended)

copy the service files and enable them:

```bash
sudo cp scripts/pkm-backend.service /etc/systemd/system/
sudo cp scripts/bidirectional-git-sync.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pkm-backend.service
sudo systemctl enable --now bidirectional-git-sync.service
```

services include:
- **auto-restart on crash** (`restart=always`)
- **oom protection** (`oomscoreadjust=-100`)
- **memory limits** (512m backend, 256m sync)
- **health checks** via `/api/health` and `/health`

### docker (optional)

```bash
docker-compose up -d
```

## architecture

```
┌─────────────────┐      ws://localhost:3456      ┌──────────────────┐
│  pkm frontend   │  ◄─────────────────────────►  │  sync server     │
│  (react/vite)   │                               │  (presence+ops)  │
│  port 3010      │                               │  port 3456       │
└─────────────────┘                               └──────────────────┘
         │                                                │
         │           http://localhost:4100                │
         │  ◄────────────────────────────────────────►   │
         │                                               │
┌─────────────────┐                               ┌──────────────────┐
│  pkm backend    │  ◄─────────────────────────►  │  nocobase        │
│  (express/io)   │         rest proxy            │  (postgres)      │
│  port 4100      │                               │                  │
└─────────────────┘                               └──────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
local git  remote github
(auto-sync every 5 min + on change)
```

## data safety guarantees

1. **local persistence**: all canvas strokes, journal entries, and database changes are written to indexeddb within 500ms.
2. **offline queue**: if the websocket or nocobase connection drops, changes are queued locally with exponential-backoff retry (up to 10 attempts). failed items move to a dead-letter queue for manual review, never dropped.
3. **git backup**: the bidirectional sync daemon commits every significant change to git and pushes to your remote. it also polls the remote every 30 seconds for incoming changes.
4. **conflict resolution**: when git conflicts occur, the daemon attempts automatic 3-way merge. if that fails, it falls back to last-write-wins and writes a `.sync-conflict` marker with instructions.
5. **health monitoring**: the backend exposes `/api/health` and `/api/status`. the frontend shows a persistent status bar with websocket, backend, git sync, and offline-queue indicators.

## recovery steps

| scenario | recovery |
|----------|----------|
| backend crashes | systemd auto-restarts within 5 seconds. check `journalctl -u pkm-backend.service -f` |
| websocket disconnects | frontend auto-reconnects with exponential backoff + jitter. check status bar for retry count. |
| git sync conflict | run `git stash list` and `git stash pop` manually. the conflicted state is preserved in `.sync-conflict`. |
| data appears missing | check indexeddb in browser devtools under `pkm-optimistic-queue` and `pkm_offline_cache`. the backend also keeps `packages/backend/data/` json backups. |
| complete local disk failure | clone the repo from github. all committed data is in git history. uncommitted queued changes would be lost — this is why the auto-sync daemon runs continuously. |

## key features

- **infinite edgeless canvas**: fabric.js-powered canvas with smooth zoom (0.1–5×), momentum panning, pinch-to-zoom on mobile, and spatial indexing for 10k+ objects.
- **real-time collaboration**: socket.io rooms with presence indicators, typing cursors, and operational-transform-style oplog sync.
- **visual identity tracking**: relationship graphs and inner-world scenes for system tracking, with animated glows and particle effects.
- **journal & gamification**: mood tracking, streaks, pet companions, and activity logging.
- **nocobase integration**: structured collections, permissions, and workflows through a proxy layer.
- **cross-platform**: web (vite), electron (linux/windows), tauri (rust), and android (capacitor).

## environment variables

copy `.env.pieces.example` to `.env` and configure:

| variable | purpose |
|----------|---------|
| `vite_nocobase_proxy_url` | nocobase api endpoint |
| `vite_storage_proxy_url` | nocobase file storage endpoint |
| `vite_local_api_url` | local backend (default: `http://127.0.0.1:4100`) |
| `vite_ollama_proxy_url` | local ollama instance for ai features |
| `sync_token` | optional token to restrict websocket sync server access |

## development

```bash
# run tests
npm test

# run e2e tests
npm run test:e2e

# lint
npm run lint

# build for production
npm run build

# build all releases (appimage, deb, apk)
npm run build:releases
```

## onboarding

on first launch, a gentle skippable wizard guides you through:
1. connecting your git remote for automatic backup
2. setting your nocobase sync endpoint

this can be re-run anytime by clearing `localstorage.pkm_onboarding_complete`.

## license

mates license — built for the house of mates.

## support

for issues or feature requests, open a github issue or check the docs in `docs/content/`.
