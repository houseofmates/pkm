<<<<<<< HEAD
<h2 align="center">pkm (personal knowledge manager)</h2>

an aesthetically comfortable, self-hosted system for identity tracking, doodling, and knowledge organization

<h2 align="center">quick start</h2>

the system is managed via `pkm-control.sh`.

```bash
# check status
./pkm-control.sh status

# restart services
./pkm-control.sh restart  # if the frontend is moved to port 3011 by accident, restart the service so it binds to 3010 again

# view logs
./pkm-control.sh logs
```

<h2 align="center">bidirectional git sync</h2>

automatic sync between local filesystem and github enables collaboration with external agents like jules.

```bash
# install (one-time)
sudo ./scripts/install-bidirectional-sync.sh

# manage sync
./pkm-control.sh sync-status   # check sync status
./pkm-control.sh sync-logs     # view live sync logs
./pkm-control.sh sync-stop     # stop sync
./pkm-control.sh sync-start    # start sync
```

features:
- local changes → auto-push to github within 10s
- github changes (prs by jules) → auto-pull within 30s
- survives reboots, auto-restarts on failure
- automatic conflict resolution with manual fallback

<h2 align="center">documentation</h2>

the primary source of truth for architecture, dev patterns, and troubleshooting is:
- **[PKM_COMPREHENSIVE_MASTER_CONTEXT.md](PKM_COMPREHENSIVE_MASTER_CONTEXT.md)**

<h2 align="center">architecture</h2>

- **frontend**: Vite-based (port 3010)
- **backend**: Node.js WebSocket/API (port 4100)  
  start it in the background with `npm run start` or install the
  provided systemd service (`scripts/pkm-backend.service`).
- **Services**: Managed via `systemctl --user pkm.service`, initiated by `/etc/systemd/system/pkm-boot.service`.

<h2 align="center">edgeless canvas + syncing</h2>

this project contains a low-latency, local-first canvas system built around an **append-only oplog + indexeddb cache**.

- **canvas state** is reconstructed by replaying a compacted oplog (operations = strokes, erases, transforms, deletes).
- **optimistic UI**: user actions are pushed into memory immediately, then flushed to IndexedDB on a debounce timer.
- **worker-backed persistence**: IndexedDB writes (and read-heavy scans) run in a Web Worker (`canvas-db.worker.ts`) to keep the main thread at 60fps.
- **sync to server**: a background loop batches unsynced operations and pushes them to the backend (NocoBase) in fixed-size chunks, with retries + conflict detection.
- **offline-first**: the UI is always responsive even without network; completed actions are queued locally and synced when online.

for full low-level details, see `packages/core/src/features/edgeless`.

<h2 align="center">sql parser + editor</h2>
a lightweight SQL parser lives in `src/lib/sql-parser.ts` with tests under `src/lib/__tests__`. It currently handles:

- `SELECT` fields and simple `FROM table [alias]`
- `JOIN` clauses (with optional `ON`)
- `GROUP BY` / `HAVING`
- `ORDER BY` and `LIMIT`
- **subqueries** in the `FROM` clause and in joins
- basic `IN` expressions and `UNION` (records additional SELECTs in a `union` array; only the first is returned as the main tree)

the implementation is intentionally naive: it tokenizes on whitespace and balanced parentheses, then walks the string. expanding the parser further means adding grammar rules for additional SQL features (e.g. `UNION ALL`, `INTERSECT`, `EXISTS`, nested expressions, arithmetic, function calls), improving tokenization (strings, identifiers, operators), and possibly adopting a proper parser generator (PEG.js, nearley, etc.) once needs grow beyond toy level.

the associated test file shows usage and serves as a regression suite.

<h2 align="center">notion importer</h2>

a cli/ui tool that lets you export yourotion workspace directly into pkm/nocobase. the importer understands notion property metadata where available (title, number, checkbox, relation, date, multi‑select, etc.) and uses value heuristics to guess types, including arrays, dates and booleans. this richer handling makes collections more faithful to the original Notion schema.

<h2 align="center">usage</h2>

1. export your workspace from notion (ZIP format, up to 5 GB).

<h2 align="center">canvas drawing</h2>

The embedded drawing canvas uses a pleasant-to-use feature-rich brush and eraser tool alongside selecting and transforming of strokes. when editing drawings you can:

- resize the brush or eraser with the size slider
- control **individual opacity** for brush and eraser
- pick pen color from the palette
- adjust **smoothness** (stabilizer level) for fluid, lag‑free strokes
- access all of the above via **right‑click** on the canvas when the brush or eraser is active – a context menu lets you tweak size, opacity, and colour (brush only) without opening the toolbar
- undo/redo via the normal history controls

brush defaults match the drawing app (10 px brush, 20 px eraser). These
values are persisted per‑drawing and exposed in the toolbar menus in case
you prefer left‑click controls.

the behaviour is implemented with fabric.js; the brush respects these
settings and automatically updates when you adjust sliders.


2. from the command line run:
   ```bash
   npm run notion:import -- /path/to/notion-export.zip
   ```
   configure `NOCOBASE_URL` and `ADMIN_API_KEY` environment variables the same way other scripts use.

> **tip:** you can enable a small health/status widget in the app's top-right by setting `VITE_SHOW_HEALTH_BAR=true` in your `.env` or environment. It's off by default to keep the UI clean.

3. alternatively, open the app and click **settings ▶ import notion workspace**; select the ZIP and watch progress logs.

The backend endpoint (`POST /api/notion-import`) accepts the ZIP via multipart/form-data and streams progress via SSE at `/api/notion-import/:taskId/stream`.

<h2 align="center">mapping rules</h2>

- **databases** in notion become nocobase collections named after the csv filename.
- **pages** become records in a `pages` collection; markdown body and front-matter fields are preserved.
- property types are guessed from sample values (number, boolean, string).
- relations, multi-selects and other complex field types are currently treated as plain text but the transformer is easily extensible.

the parser is tolerant of malformed files, logging warnings and continuing. Large exports are streamed to avoid high memory usage.

### code structure

- `src/features/notion-import/parser.ts` – recursive directory walker, CSV and Markdown loader.
- `src/features/notion-import/transformer.ts` – turns parsed workspace into a sequence of import instructions.
- `scripts/notion-import.js` – CLI entrypoint used by both `npm run notion:import` and the backend API.
- `packages/backend/server.js` – new endpoints and SSE task management.
- `src/pages/notion-import.tsx` – UI page with file input and progress panel.

unit and integration tests cover parsing, transformation, and CLI logic (`src/features/notion-import/__tests__`).

a future extension could allow direct client‑side parsing or more advanced field-type inference; the current implementation is designed for simplicity and robustness.

<h2 align="center">why?</h2>
im a neurodivergent system with highly specific needs and visual preferences. pkm is a project in addition to my main brain, the one i can use when i cant trust my own
=======
# PKM - Personal Knowledge Management System

A reliable, beautiful, and self-healing knowledge management workspace that rivals Obsidian Canvas and Notion, but fully local-first, synced, and zero-effort to run.

## 🌟 Features

- **Infinite Canvas**: Visual thinking with smooth zoom, infinite pan, and mobile touch support
- **Bulletproof Sync**: WebSocket sync with exponential backoff and SQLite offline queue
- **Zero-Maintenance**: Auto-save, auto-sync, auto-backup - never lose a single idea
- **Visual Identity Tracking**: Magical headmates system with delightful animations
- **Git Integration**: Automatic bidirectional sync with conflict resolution
- **Local-First**: Works offline, syncs when connected
- **Memory-Friendly**: Designed for users with memory difficulties

## 🚀 One-Command Setup

### Prerequisites

- Node.js 18+ 
- Git
- Systemd (for Linux auto-start)

### Quick Installation

```bash
# Clone and setup
git clone <repository-url>
cd pkm
npm install

# Setup services and start
sudo ./scripts/setup-services.sh
npm run dev
```

That's it! Your PKM is now running at:
- **Frontend**: http://localhost:3010
- **Backend**: http://localhost:4100

## 📋 Detailed Setup & Configuration

### 1. System Requirements

**Minimum Requirements:**
- Node.js 18.0 or higher
- 2GB RAM
- 1GB disk space
- Git 2.0+

**Recommended Requirements:**
- Node.js 20.0 or higher
- 4GB RAM
- 5GB disk space
- Stable internet connection (for sync)

### 2. Installation Steps

```bash
# Clone the repository
git clone <repository-url>
cd pkm

# Install dependencies
npm install

# Build the application
npm run build

# Setup systemd services
sudo ./scripts/setup-services.sh

# Start the development server
npm run dev
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=4100
FRONTEND_PORT=3010

# Security
ADMIN_SECRET=your-secure-admin-secret
BROADCAST_AUTH_KEY=your-broadcast-key

# Sync Configuration
GIT_REPO_URL=https://github.com/yourusername/pkm.git
GIT_SYNC_INTERVAL=300000

# Database
DATABASE_PATH=./data/pkm.db

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/pkm.log
```

### 4. Service Setup

The setup script automatically configures and starts these services:
- `pkm-backend`: Main application server
- `pkm-monitor`: Health monitoring service
- `bidirectional-git-sync`: Git synchronization service

To manually manage services:

```bash
# Check status
./pkm-control.sh status

# Restart services
./pkm-control.sh restart

# View logs
./pkm-control.sh logs

# Stop services
./pkm-control.sh stop
```

## 🔧 Data Safety & Recovery

### Auto-Save System

PKM includes a comprehensive auto-save system that:

- **Saves every 30 seconds** automatically
- **Saves immediately** on critical changes
- **Recovers from crashes** automatically
- **Works offline** with local storage
- **Syncs when connected** to the internet

### Data Locations

```
/home/house/pkm/
├── data/                    # Main database files
├── logs/                    # Application logs
├── .sync-status.json        # Sync status
├── offline-queue.db         # Offline operation queue
└── localStorage/            # Browser local storage
```

### Recovery Procedures

#### If the Application Crashes

1. **Don't panic** - your data is safe
2. **Restart the services**:
   ```bash
   ./pkm-control.sh restart
   ```
3. **Check recovery status** in the web interface
4. **Wait** for auto-recovery to complete (usually < 1 minute)

#### If Data Seems Missing

1. **Check the recovery dashboard** at http://localhost:3010/recovery
2. **Force a save** using the "Force Save Now" button
3. **Check browser console** for recovery messages
4. **Contact support** if issues persist

#### Manual Data Recovery

```bash
# Check database integrity
npm run check:db

# Recover from backup
npm run recover:backup

# Export data
npm run export:data

# Import data
npm run import:data <backup-file>
```

### Backup Strategy

PKM automatically maintains multiple backup layers:

1. **Git Version Control**: Every change is committed
2. **SQLite Database**: Local database with WAL mode
3. **Browser Storage**: Critical data in localStorage
4. **Remote Sync**: Cloud synchronization when online

To create manual backups:

```bash
# Create full backup
npm run backup:create

# List available backups
npm run backup:list

# Restore from backup
npm run backup:restore <backup-id>
```

## 🔒 Security & Privacy

### Data Privacy

- **Local-First**: Your data stays on your device
- **Encrypted Sync**: All network traffic is encrypted
- **No Telemetry**: No usage data is collected
- **Open Source**: Code is fully auditable

### Security Features

- **JWT Authentication**: Secure user sessions
- **Rate Limiting**: Protection against abuse
- **CORS Protection**: Secure cross-origin requests
- **Input Validation**: Protection against injection attacks

### Security Configuration

```bash
# Generate secure secrets
npm run generate:secrets

# Update security settings
npm run update:security

# Check security status
npm run check:security
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check service status
systemctl status pkm-backend

# Check logs
journalctl -u pkm-backend -f

# Common fixes
sudo systemctl daemon-reload
sudo systemctl restart pkm-backend
```

#### Sync Not Working

```bash
# Check git configuration
git config --list

# Test remote connection
git remote show origin

# Force sync
./pkm-control.sh sync-force
```

#### High Memory Usage

```bash
# Check memory usage
./pkm-control.sh stats

# Clear cache
npm run clear:cache

# Restart services
./pkm-control.sh restart
```

#### Database Issues

```bash
# Check database integrity
npm run check:db

# Repair database
npm run repair:db

# Rebuild database
npm run rebuild:db
```

### Getting Help

1. **Check the recovery dashboard** first
2. **Review application logs**:
   ```bash
   ./pkm-control.sh logs
   ```
3. **Check system health**:
   ```bash
   ./pkm-control.sh health
   ```
4. **Create issue report**:
   ```bash
   npm run report:issue
   ```

## 📱 Usage Guide

### Getting Started

1. **Open your browser** to http://localhost:3010
2. **Complete the onboarding** (takes 2 minutes)
3. **Create your first canvas** by clicking "New Canvas"
4. **Start adding content** - everything saves automatically

### Canvas Features

- **Drawing**: Use the brush tool for freehand drawing
- **Text**: Add text boxes anywhere on the canvas
- **Shapes**: Insert circles, rectangles, and arrows
- **Images**: Drag and drop images onto the canvas
- **Links**: Connect elements with smart links
- **Widgets**: Add mood rings, pet status, and more

### Visual Identity Tracking

The headmates system helps you track different aspects of your identity:

- **Create members** to represent different identities
- **Toggle fronting** to show who's currently active
- **View history** to track changes over time
- **Export data** for sharing or backup

### Sync & Collaboration

- **Automatic sync** happens in the background
- **Offline mode** works seamlessly
- **Conflict resolution** is automatic
- **Version history** is preserved in Git

## 🛠️ Development

### Development Setup

```bash
# Install development dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Code Style

```bash
# Check code style
npm run lint

# Fix code style
npm run lint:fix

# Check lowercase compliance
npm run lowercase:check

# Fix lowercase issues
npm run lowercase:fix
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## 📚 Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │    Backend      │    │   Services      │
│   (React)      │◄──►│   (Express)     │◄──►│   (Systemd)     │
│   Port: 3010   │    │   Port: 4100   │    │   Auto-start    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IndexedDB     │    │    SQLite       │    │      Git        │
│   Browser       │    │   Database      │    │   Version Ctrl  │
│   Storage       │    │   Local File    │    │   Remote Sync   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **Edgeless Canvas**: Infinite drawing surface with Fabric.js
- **Sync Engine**: WebSocket + SQLite offline queue
- **Auto-Save**: Multi-layer data persistence
- **Conflict Resolution**: Last-write-wins with visual notifications
- **Git Integration**: Automatic bidirectional sync
- **Health Monitoring**: Systemd services with health checks

### Data Flow

1. **User Action** → Frontend captures interaction
2. **Local Save** → IndexedDB + localStorage
3. **Queue Operation** → SQLite offline queue
4. **Sync Attempt** → WebSocket to backend
5. **Remote Save** → Backend processes and stores
6. **Git Commit** → Automatic version control
7. **Conflict Resolution** → Handle any conflicts

## 🤝 Contributing

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** following the code style
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Submit a pull request**

### Development Guidelines

- **Follow lowercase convention** for all UI text and comments
- **Write tests** for new features
- **Update documentation** for API changes
- **Use TypeScript** for type safety
- **Keep it memory-friendly** for users with cognitive difficulties

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Fabric.js** for canvas functionality
- **Socket.io** for real-time communication
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Radix UI** for component primitives

## 📞 Support

If you need help:

1. **Check the recovery dashboard** first
2. **Review this README** thoroughly
3. **Check the troubleshooting section**
4. **Create an issue** on GitHub
5. **Contact the maintainers** directly

---

**Remember**: Your data is safe and the system is designed to recover automatically. Never hesitate to reach out for help!

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Backend
PORT=4100
NODE_ENV=production

# NocoBase (optional but recommended)
VITE_NOCOBASE_URL=https://your-nocobase-instance.com/api
VITE_NOCOBASE_API_TOKEN=your-api-token

# WebSocket (auto-configured)
VITE_WS_URL=ws://localhost:4100

# Encryption (optional)
VITE_PKM_ENCRYPTION=true
```

### 3. Start Development Server

```bash
npm run dev
```

This starts both frontend (port 3010) and backend (port 4100).

### 4. Production Setup

#### Backend Service

```bash
# Install systemd service
sudo cp scripts/pkm-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pkm-backend
sudo systemctl start pkm-backend
```

#### Monitor Service

```bash
# Install monitor service
sudo cp scripts/pkm-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pkm-monitor
sudo systemctl start pkm-monitor
```

#### Git Sync Service

```bash
# Install bidirectional git sync
sudo ./scripts/install-bidirectional-sync.sh
```

## 🔧 Configuration

### Auto-Sync Settings

The zero-maintenance service automatically:

- **Auto-saves** every 30 seconds
- **Auto-syncs** when connected
- **Auto-backups** every 6 hours
- **Health checks** every 5 minutes

Configure in `src/services/zero-maintenance.service.ts`:

```typescript
const config = {
  autoSaveInterval: 30, // seconds
  backupInterval: 6,    // hours
  healthCheckInterval: 5, // minutes
  maxBackups: 30
}
```

### NocoBase Integration

1. Set up NocoBase instance
2. Generate API token
3. Configure environment variables
4. Run validation:

```bash
./scripts/validate-nocobase-setup.sh
```

### Git Sync Configuration

Auto-sync runs every 15 minutes and triggers on significant changes:

```bash
# Check sync status
./pkm-control.sh sync-status

# Force sync
./pkm-control.sh sync-force

# View logs
./pkm-control.sh sync-logs
```

## 🛠️ Development

### Project Structure

```
pkm/
├── apps/
│   ├── web/              # Main Vite app
│   ├── mobile/           # Capacitor Android
│   ├── desktop-electron/ # Electron desktop
│   └── desktop-tauri/    # Tauri desktop
├── packages/
│   ├── core/             # Shared library
│   └── backend/          # Node.js server
├── scripts/              # Setup and utility scripts
└── docs/                 # Documentation
```

### Key Commands

```bash
# Development
npm run dev              # Start dev servers
npm run backend          # Backend only
npm run test             # Run tests
npm run lint             # Lint code

# Build
npm run build            # Build frontend
npm run build:all        # Build all workspaces

# Services
./pkm-control.sh status  # Check service status
./pkm-control.sh restart # Restart services
./pkm-control.sh logs    # View logs
```

### Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📊 Monitoring

### Health Check

Monitor system health:

```bash
curl http://localhost:4100/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 128,
    "heapTotal": 256
  },
  "connections": {
    "websocket": 3,
    "http": "N/A"
  },
  "services": {
    "database": "ok",
    "filesystem": "ok"
  }
}
```

### Sync Status

View real-time sync status in the UI or via API:

```bash
# Frontend shows sync indicator
# Backend shows connection logs
```

## 🔒 Security

### Data Safety

- All data stored locally first
- Encrypted sync options available
- Git backups provide version history
- Recovery points created automatically

### Privacy

- No data sent to third parties
- Local-first architecture
- Optional external database
- User controls all data

## 🚨 Recovery

### Data Recovery

If something goes wrong, PKM has multiple recovery options:

#### 1. Auto-Recovery Points

```bash
# Recovery points are created automatically
# Check recovery status in the UI
```

#### 2. Git History

```bash
# View git history
git log --oneline

# Restore to previous state
git checkout <commit-hash>
```

#### 3. Database Backups

```bash
# Backups stored in IndexedDB
# Access via browser dev tools
# Application → Storage → IndexedDB
```

#### 4. Manual Recovery

```bash
# Force recovery from last known good state
npm run recover

# Reset to factory defaults (data loss warning!)
npm run reset
```

### Service Recovery

If services stop working:

```bash
# Check status
./pkm-control.sh status

# Restart all services
./pkm-control.sh restart

# View logs for errors
./pkm-control.sh logs

# Reinstall if needed
sudo ./scripts/install-bidirectional-sync.sh
```

## 🎨 Customization

### Theme

The dark theme is optimized for comfort and focus:

```css
/* Override colors in src/enhanced-theme.css */
:root {
  --primary: 38 92% 55%; /* Warm yellow */
  --background: 0 0% 4%;   /* Dark gray */
  --foreground: 0 0% 96%;  /* Light text */
}
```

### Typography

Uses Varela Round for readability:

```css
/* Font customization */
@import url('https://fonts.googleapis.com/css2?family=Varela+Round&display=swap');
```

### Canvas Interactions

Enhanced canvas features:

- Smooth zoom with mouse wheel
- Momentum-based panning
- Mobile pinch-to-zoom
- Keyboard shortcuts

## 🤝 Contributing

### Development Setup

```bash
# Fork and clone
git clone <your-fork>
cd pkm

# Install dependencies
npm install

# Start development
npm run dev
```

### Code Style

- All lowercase UI text and comments
- TypeScript strict mode
- Comprehensive tests
- Follow existing patterns

### Submitting Changes

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📚 Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [NocoBase Setup](./NOCOBASE_SETUP.md)
- [Architecture Guide](./PKM_COMPREHENSIVE_MASTER_CONTEXT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## 🆘 Support

### Common Issues

**Service won't start:**
```bash
# Check logs
sudo journalctl -u pkm-backend -f

# Check permissions
ls -la /home/house/pkm
```

**Sync not working:**
```bash
# Check connectivity
curl http://localhost:4100/api/health

# Restart sync
./pkm-control.sh restart
```

**Data not saving:**
```bash
# Check auto-save status
# Look for errors in browser console
# Verify IndexedDB storage
```

### Getting Help

1. Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review [FAQ](./FAQ.md)
3. Check [Issues](../../issues)
4. Create [New Issue](../../issues/new)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Vite, React, and Fabric.js
- Inspired by Obsidian, Notion, and Roam Research
- Designed for neurodivergent users and those with memory difficulties
- Community contributions and feedback

---

**PKM** - Your calm, infinitely reliable thought space that never loses a single idea, no matter what happens to the hardware.
>>>>>>> main
