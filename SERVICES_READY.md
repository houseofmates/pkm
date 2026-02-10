# ✅ PKM Services - Complete Setup

## 🎯 Summary

All PKM services are now **running** and **enabled to start on boot**. Your n8n workflow can now connect to the backend.

## 🚀 Services Status

### Frontend
- ✅ Running on port **3010**
- ✅ Enabled (starts on boot)
- 🌐 Accessible at: dupe.houseofmates.space, houseofmates.space, pkm.houseofmates.space

### Backend
- ✅ Running on port **4100**  
- ✅ Enabled (starts on boot)
- 🔌 Webhook endpoint: `http://172.17.0.1:4100/api/broadcast`

## 🔧 Quick Commands

```bash
# Check services status
./pkm-control.sh status

# Restart everything
./pkm-control.sh restart

# Rebuild frontend after code changes
./pkm-control.sh rebuild

# View logs
./pkm-control.sh logs-frontend
./pkm-control.sh logs-backend

# Test backend API
./pkm-control.sh test
```

See [pkm-control.sh](pkm-control.sh) for all available commands.

## 🔐 n8n Backend Configuration

Your n8n workflow needs these exact settings:

**URL:** `http://172.17.0.1:4100/api/broadcast`

**Header:** 
- Name: `x-api-key`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc3MDY2OTc4OCwiZXhwIjozMzMyODI2OTc4OH0.V9CJrXXKRi9-B-RYKpqRxZSXTm3w1aKLjv8nRMv96UE`

**⚠️ CRITICAL:** The API key is the full JWT token above, NOT "CENSOREDAPIKEY"

See [N8N_SETUP.md](N8N_SETUP.md) for complete n8n node configuration.

## 📚 Documentation

- [SERVICE_MANAGEMENT.md](SERVICE_MANAGEMENT.md) - How to control services
- [N8N_SETUP.md](N8N_SETUP.md) - n8n webhook configuration
- [pkm-control.sh](pkm-control.sh) - Service control script

## 🔄 What Happens on Reboot

Both services **automatically start** when your system boots:
1. ✅ `pkm-frontend.service` starts → Website available on port 3010
2. ✅ `pkm-server.service` starts → Backend API available on port 4100
3. ✅ Cloudflare Tunnel routes traffic to services

No manual intervention needed!

## 🛠️ Making Changes

### Frontend Changes
1. Edit code in `src/`
2. Run: `./pkm-control.sh rebuild`
3. Done! New version is live.

### Backend Changes
1. Edit `backend/server.js`
2. Run: `sudo systemctl restart pkm-server`
3. Done! Backend restarted.

## ❓ Troubleshooting

**n8n getting 403 Forbidden?**
→ Check you're using the full JWT token as the API key

**n8n getting connection refused?**
→ Check backend is running: `./pkm-control.sh status`

**Website not updating after rebuild?**
→ Hard refresh browser (Ctrl+Shift+R) or clear cache

**Services not starting on boot?**
→ Verify they're enabled: `systemctl is-enabled pkm-frontend pkm-server`

See [SERVICE_MANAGEMENT.md](SERVICE_MANAGEMENT.md) for detailed troubleshooting.
