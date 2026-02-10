# PKM Service Management

## Quick Reference

```bash
# Easy control script
./pkm-control.sh status    # Check service status
./pkm-control.sh start     # Start all services
./pkm-control.sh stop      # Stop all services  
./pkm-control.sh restart   # Restart all services
./pkm-control.sh rebuild   # Rebuild frontend & restart
./pkm-control.sh test      # Test backend API
```

## Services

### Frontend (pkm-frontend.service)
- **Port:** 3010
- **Purpose:** Serves the production build of the website
- **Command:** `npx serve@14 /home/house/pkm/dist -l 3010 -s`
- **Domains:** dupe.houseofmates.space, houseofmates.space, pkm.houseofmates.space, home.houseofmates.space

### Backend (pkm-server.service)
- **Port:** 4100
- **Purpose:** WebSocket server for Minecraft events + n8n webhook endpoint
- **Command:** `node backend/server.js` (via auto-deploy wrapper)
- **Endpoint:** POST http://172.17.0.1:4100/api/broadcast

## Systemd Commands

### Status
```bash
sudo systemctl status pkm-frontend
sudo systemctl status pkm-server
```

### Start/Stop/Restart
```bash
# Individual services
sudo systemctl start pkm-frontend
sudo systemctl stop pkm-frontend
sudo systemctl restart pkm-frontend

sudo systemctl start pkm-server
sudo systemctl stop pkm-server
sudo systemctl restart pkm-server

# Both at once
sudo systemctl start pkm-frontend pkm-server
sudo systemctl stop pkm-frontend pkm-server
sudo systemctl restart pkm-frontend pkm-server
```

### Enable/Disable Auto-Start on Boot
```bash
# Enable (services start automatically on boot)
sudo systemctl enable pkm-frontend
sudo systemctl enable pkm-server

# Disable (services don't start on boot)
sudo systemctl disable pkm-frontend
sudo systemctl disable pkm-server

# Check if enabled
systemctl is-enabled pkm-frontend
systemctl is-enabled pkm-server
```

### View Logs
```bash
# Live logs (Ctrl+C to exit)
sudo journalctl -u pkm-frontend -f
sudo journalctl -u pkm-server -f

# Last 50 lines
sudo journalctl -u pkm-frontend -n 50
sudo journalctl -u pkm-server -n 50

# Since today
sudo journalctl -u pkm-frontend --since today
sudo journalctl -u pkm-server --since today
```

## Development Workflow

### Making Code Changes

1. **Edit frontend code** in [src/](src/)
2. **Rebuild:**
   ```bash
   npm run build
   ```
3. **Restart frontend:**
   ```bash
   sudo systemctl restart pkm-frontend
   ```
   
   Or use the control script:
   ```bash
   ./pkm-control.sh rebuild
   ```

### Backend Changes

1. **Edit backend code** in [backend/server.js](backend/server.js)
2. **Restart backend:**
   ```bash
   sudo systemctl restart pkm-server
   ```

### Testing Changes

```bash
# Frontend: Visit in browser
curl http://localhost:3010

# Backend: Test API
./pkm-control.sh test
```

## Troubleshooting

### Services Won't Start

Check for port conflicts:
```bash
sudo lsof -i:3010
sudo lsof -i:4100
```

Kill conflicting processes:
```bash
sudo lsof -ti:3010 | xargs sudo kill -9
sudo lsof -ti:4100 | xargs sudo kill -9
```

### Frontend Shows Old Version

Rebuild and hard restart:
```bash
npm run build
sudo systemctl stop pkm-frontend
sleep 2
sudo systemctl start pkm-frontend
```

### Backend Not Receiving Events

1. Check it's running: `sudo systemctl status pkm-server`
2. Test API: `./pkm-control.sh test`
3. Check logs: `sudo journalctl -u pkm-server -f`
4. Verify n8n using correct API key (see [N8N_SETUP.md](N8N_SETUP.md))

### Check What's Actually Running

```bash
# Show all node processes
ps aux | grep node

# Show ports in use
sudo netstat -tlnp | grep -E "3010|4100"

# Show service file locations
systemctl show pkm-frontend | grep FragmentPath
systemctl show pkm-server | grep FragmentPath
```

## Service Files

Frontend: `/etc/systemd/system/pkm-frontend.service`
Backend: `/etc/systemd/system/pkm-server.service`

After editing service files:
```bash
sudo systemctl daemon-reload
sudo systemctl restart pkm-frontend pkm-server
```

## Current Status

Both services are **enabled** and will start automatically on system boot.

Check current status:
```bash
./pkm-control.sh status
```
