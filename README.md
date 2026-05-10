# PKM - Personal Knowledge Management System

A reliable, beautiful, and self-healing knowledge management workspace that rivals Obsidian Canvas and Notion, but fully local-first, synced, and zero-effort to run.

## 🌟 Features

- **Infinite Canvas**: Visual thinking with smooth zoom, infinite pan, and mobile touch support
- **Auto-Sync**: Bulletproof WebSocket sync with exponential backoff and SQLite offline queue
- **Zero-Maintenance**: Auto-save, auto-sync, auto-backup - never lose a single idea
- **Visual Identity Tracking**: Magical headmates system with delightful animations
- **Git Integration**: Automatic bidirectional sync with conflict resolution
- **Local-First**: Works offline, syncs when connected
- **Memory-Friendly**: Designed for users with memory difficulties

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Git
- Systemd (for Linux auto-start)

### One-Command Setup

```bash
# Clone and setup
git clone <repository-url>
cd pkm
npm install
npm run dev

# Install and start services
sudo ./scripts/install-bidirectional-sync.sh
sudo systemctl enable pkm-backend pkm-monitor
sudo systemctl start pkm-backend pkm-monitor
```

That's it! Your PKM is now running at:
- Frontend: http://localhost:3010
- Backend: http://localhost:4100

## 📋 Detailed Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

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