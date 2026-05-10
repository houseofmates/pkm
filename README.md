# PKM - Personal Knowledge Manager

A reliable, beautiful, and self-healing knowledge management workspace that rivals Obsidian Canvas and Notion, but fully local-first, synced, and zero-effort to run.

## ✨ Features

- **🎨 Infinite Canvas**: Draw, write, and organize without limits with smooth zoom, momentum panning, and mobile touch support
- **🔄 Real-time Sync**: WebSocket-based synchronization with exponential backoff, jitter, and persistent offline queue using IndexedDB
- **💾 Auto-save & Backup**: Never lose your work with automatic local and cloud backups, change detection, and configurable intervals
- **🔀 Git Integration**: Bidirectional sync with automatic conflict resolution (last-write-wins + diff viewing), cron-like scheduling, and status indicators
- **📱 Mobile Ready**: Touch gestures, responsive design, and cross-platform compatibility (web, desktop, Android)
- **🛡️ Zero Maintenance**: Self-healing system with systemd resilience, health checks, and automatic recovery
- **🧠 Memory Friendly**: Designed for users with memory difficulties with gentle onboarding, visual identity tracking, and fail-safe data preservation
- **🎯 Visual Identity Tracking**: Plural system support with headmates management, identity badges, and fronting status with right-click context menus
- **🌙 Consistent Dark Theme**: Beautiful dark theme with Varela Round typography and warm yellow accents
- **⚡ High Performance**: Canvas element pooling, spatial indexing, and optimized rendering for large workspaces

## 🚀 One-Command Setup

### Prerequisites
- Node.js 18+ 
- Git (for version control)
- Optional: GitHub/GitLab repository for cloud backup

### Quick Install
```bash
# Clone and setup in one command
git clone https://github.com/houseofmates/pkm.git && cd pkm && npm install && npm run dev
```

That's it! The PKM workspace will be available at:
- Frontend: http://localhost:3010
- Backend: http://localhost:4100

### First Launch
On first launch, you'll be guided through a gentle onboarding flow to:
1. **Git Repository Setup**: Initialize local repo and connect to remote for automatic backups
2. **NocoBase Connection** (Optional): Connect to external database for advanced features
3. **Sync Settings**: Configure auto-save intervals, backup frequency, and sync preferences
4. **System Test**: Verify all services are working correctly
5. **Workspace Customization**: Set up your personal preferences

The onboarding is completely skippable and can be revisited anytime from settings.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development servers (frontend on 3010, backend on 4100)
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

## 🏗️ Architecture

### Monorepo Structure
```
pkm/
├── apps/
│   ├── web/              # Main Vite-based web app (port 3010)
│   ├── mobile/           # Capacitor Android app
│   ├── desktop-electron/ # Electron desktop app
│   └── desktop-tauri/    # Tauri desktop app
├── packages/
│   ├── core/             # Shared core library and components
│   └── backend/          # Node.js Express + Socket.IO server (port 4100)
├── scripts/              # Build scripts, linters, and utilities
└── public/               # Static assets and documentation
```

### Service Topology
- **Frontend**: Vite React app with subdomain-based routing
- **Backend**: Express + Socket.IO server for real-time events
- **NocoBase**: Headless CMS/API server (external, port 1337 or remote)
- **Git**: Automatic version control and backup system

### Data Flow
1. Frontend proxies API requests to backend or NocoBase based on path
2. Backend broadcasts real-time events via Socket.IO
3. Optimistic UI pattern: immediate update, then API call, rollback on failure

## 🔧 Configuration

### Environment Variables
Create `.env` file in the root directory:

```env
# Backend Configuration
PORT=4100
NODE_ENV=production
BROADCAST_AUTH_KEY=your-secret-key

# Frontend Configuration
VITE_SOCKET_URL=http://localhost:4100
VITE_NOCOBASE_URL=http://localhost:1337
VITE_PKM_ENCRYPTION=true

# Git Sync Configuration
VITE_GIT_REMOTE_URL=https://github.com/yourusername/pkm-backup.git
VITE_GIT_SYNC_ENABLED=true
VITE_GIT_AUTO_SYNC_INTERVAL=5

# Optional External Services
VITE_SIMPLYPLURAL_API_KEY=your-api-key
VITE_N8N_WEBHOOK_URL=your-webhook-url
```

### Git Sync Setup
```bash
# Install systemd service for automatic git sync
npm run sync:install-service

# Check sync status
./pkm-control.sh sync-status

# View sync logs
./pkm-control.sh sync-logs
```

## 📱 Mobile & Desktop Apps

### Android App
```bash
# Build Android APK
npm run build:android

# Install on device
npx cap run android
```

### Desktop Apps
```bash
# Electron app
npm run electron:dev
npm run electron:build

# Tauri app
npm run tauri:dev
npm run tauri:build
```

## 🔄 Sync Engine Details

### WebSocket Resilience
- **Exponential Backoff**: 1s base delay, 60s max delay, with jitter
- **Persistent Queue**: IndexedDB storage with 10,000 operation limit
- **Conflict Resolution**: Last-write-wins with visual diff viewing
- **Health Monitoring**: Automatic reconnection with heartbeat pings

### Git Sync Features
- **Automatic Commits**: Configurable intervals with smart change detection
- **Conflict Resolution**: Visual diff viewing with manual override options
- **Status Indicators**: Real-time sync status in UI
- **Backup Strategy**: Automatic push to remote with fallback to local

### Offline Queue
- **Priority System**: High/normal/low priority operations
- **Retry Logic**: Exponential backoff with max retry limits
- **Health Monitoring**: Queue size and conflict tracking
- **Data Safety**: Never loses operations, even during extended outages

## 🛡️ Security & Reliability

### Systemd Service
The backend runs as a systemd service with:
- **Auto-restart**: Automatic restart on crashes with exponential backoff
- **Resource Limits**: Memory and CPU constraints to prevent system overload
- **Health Monitoring**: Watchdog with periodic health checks
- **Security Hardening**: Restricted permissions and sandboxing

### Data Safety
- **Local First**: All data stored locally in IndexedDB
- **Automatic Backups**: Git commits with configurable frequency
- **Encryption**: Optional end-to-end encryption for sensitive data
- **Recovery**: Complete data recovery from any failure state

### Security Features
- **Input Validation**: All user inputs validated and sanitized
- **Rate Limiting**: Protection against abuse and DoS attacks
- **CORS Protection**: Secure cross-origin resource sharing
- **Security Headers**: Comprehensive security header implementation

## 🧠 Memory-Friendly Features

### Visual Identity Tracking
- **Headmates Management**: Full CRUD operations with inline editing
- **Right-Click Context Menus**: Quick access to view, edit, copy, delete actions
- **Fronting Status**: Visual indicators for current fronting members
- **Identity Badges**: Color-coded member identification

### Accessibility
- **Gentle Onboarding**: Step-by-step setup with skip options
- **Visual Feedback**: Clear status indicators and progress tracking
- **Error Recovery**: Automatic error handling with user-friendly messages
- **Memory Aids**: Persistent state and automatic save reminders

## 🔍 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check logs
sudo journalctl -u pkm-backend -f

# Restart service
sudo systemctl restart pkm-backend

# Check configuration
npm run backend
```

#### Sync Not Working
```bash
# Check git status
git status

# Check sync configuration
./pkm-control.sh sync-status

# Force sync
npm run sync:daemon
```

#### Frontend Connection Issues
```bash
# Check backend health
curl http://localhost:4100/api/health

# Check WebSocket connection
# Open browser dev tools and check Network tab
```

### Recovery Procedures

#### Data Recovery
```bash
# Restore from git history
git log --oneline
git checkout <commit-hash>

# Export offline queue
# Data stored in IndexedDB, accessible via browser dev tools

# Reset sync state
rm .sync-status.json
./pkm-control.sh restart
```

#### Complete Reset
```bash
# Warning: This will delete all local data
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📚 API Reference

### Backend Endpoints
- `GET /api/health` - System health check
- `POST /api/sync` - Manual sync trigger
- `WebSocket /socket.io` - Real-time events

### Frontend Components
- `SyncStatusPanel` - Sync status display
- `ConflictResolutionModal` - Conflict resolution UI
- `OnboardingWizard` - First-time setup flow

### Services
- `gitSyncService` - Git synchronization
- `offlineQueueService` - Offline operation queue
- `conflictResolutionService` - Conflict handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Code Style
- All comments and UI text must be lowercase
- Use TypeScript for all new code
- Follow existing component patterns
- Test critical functionality

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React, Vite, and Socket.IO
- Canvas powered by Fabric.js
- Sync engine inspired by CRDT principles
- UI components from Radix UI and Tailwind CSS

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Join our community discussions

---

**PKM** - Your reliable, self-healing knowledge management workspace. Never lose an idea again.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

## 📦 Production Deployment

### Systemd Service (Recommended)

```bash
# Install as systemd service
sudo npm run sync:install-service

# Start service
sudo systemctl start pkm-backend
sudo systemctl enable pkm-backend

# Check status
sudo systemctl status pkm-backend
```

### Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🔄 Sync & Backup

### Git Integration
PKM includes bulletproof automatic Git synchronization:

```bash
# Configure Git repository (done via onboarding)
git remote add origin https://github.com/your-repo/pkm-data.git

# Auto-sync runs every 5 minutes with exponential backoff
# Manual sync available in UI and via CLI
npm run sync:daemon
```

### Backup Strategy
- **Auto-save**: Every 30 seconds (configurable) with change detection
- **Daily backups**: Automatic JSON export with 10-day retention
- **Git history**: Full version control with conflict resolution
- **Offline queue**: IndexedDB-based persistent queue survives browser crashes
- **Real-time sync**: WebSocket connection with automatic reconnection

### Data Safety Guarantees
✅ **Never loses data**: All changes queued locally until confirmed synced  
✅ **Automatic recovery**: Restores from last known good state after crashes  
✅ **Conflict resolution**: Last-write-wins with visual diff viewing  
✅ **Version history**: Full Git history with automatic commits  
✅ **Mobile safe**: Works offline and syncs when reconnected

## 🏥 Health & Recovery

### Health Check
```bash
# Check backend health
curl http://localhost:4100/api/health

# Expected response
{
  "status": "ok",
  "timestamp": "2026-05-09T23:58:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "connections": {...}
}
```

### Recovery Procedures

#### If Backend Crashes
```bash
# Restart systemd service
sudo systemctl restart pkm-backend

# If that fails, manual restart
npm run backend
```

#### If Data is Lost
```bash
# Restore from Git history
git log --oneline
git checkout <commit-hash>

# Restore from backup file
# Import the latest backup from your downloads folder
```

#### If Sync Fails
1. Check network connection
2. Verify Git remote is accessible
3. Check sync status panel in UI (bottom status bar)
4. Manual sync: `npm run sync:daemon`
5. Check health endpoint: `curl http://localhost:4100/api/health`

## 🎨 Architecture Overview

### Core Technologies
- **Frontend**: React 18 + Vite + Tailwind CSS + Fabric.js (canvas)
- **Backend**: Node.js + Express + Socket.io + SQLite
- **Storage**: IndexedDB (client) + File system (server) + Git (version control)
- **Sync**: WebSocket real-time + Git bidirectional + Offline queue
- **Deployment**: Systemd service + Docker + Multi-platform builds

### Key Features Implementation
- **Canvas Engine**: Spatial indexing, element pooling, optimized rendering
- **Sync Engine**: Exponential backoff reconnection, conflict resolution, offline queue
- **Auto-save**: Change detection via MutationObserver, configurable intervals
- **Mobile Support**: Touch gestures, responsive design, PWA capabilities
- **Security**: Rate limiting, CORS protection, input validation

## 🔧 Advanced Configuration

### Environment Variables
```bash
# Backend configuration
PORT=4100
NODE_ENV=production
SENTRY_DSN=your-sentry-dsn
ALLOWED_ORIGINS=http://localhost:3010,https://yourdomain.com

# Git sync configuration
BROADCAST_AUTH_KEY=your-secret-key
```

### Service Management
```bash
# Check service status
./pkm-control.sh status

# Restart services  
./pkm-control.sh restart

# View logs
./pkm-control.sh logs

# Check sync status
./pkm-control.sh sync-status
```

## 🤝 Contributing

This project is designed to be a reliable, maintenance-free knowledge management system. When contributing:

1. **Test thoroughly**: Ensure auto-save and sync work correctly
2. **Follow conventions**: Use existing patterns and styling
3. **Document changes**: Update README and inline comments
4. **Test recovery**: Verify crash recovery and data integrity

## 📄 License

MIT License - see LICENSE file for details

---

**PKM**: Your calm, infinitely reliable thought space that never loses a single idea.
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
