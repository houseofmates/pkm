# PKM Stack Migration Guide

## Issues Fixed

### 1. **Background Images Not Saving**
**Problem:** Frontend uploads to NocoBase `/attachments` but backend doesn't serve them  
**Solution:** Added `/api/upload-background` endpoint to backend + static file serving from `~/pkm/public/`

### 2. **Minecraft Chat Data Stale** 
**Problem:** Discord webhook hitting public URL instead of local backend  
**Solution:** Updated workflow to use `http://172.17.0.1:4100/api/broadcast`

### 3. **Webhook Not Registered**
**Problem:** Workflow uses wrong webhook path (`/minecraft-chat-sync` vs `/minecraft-events`)  
**Solution:** Fixed workflow with correct path matching Minecraft plugin

---

## Changes Made

### Backend (`/home/house/pkm/backend/server.js`)

**Added:**
- `multer` middleware for multipart file uploads
- `POST /api/upload-background` endpoint
- Static file serving from `public/` directory
- Image validation (jpeg, png, gif, webp, max 10MB)

**Upload Response Format:**
```json
{
  "url": "/public/bg-1738992847123-abc.jpg",
  "data": {
    "url": "/public/bg-1738992847123-abc.jpg",
    "data": { "url": "/public/bg-1738992847123-abc.jpg" }
  }
}
```

### Frontend (`/home/house/pkm/src/api/nocobase-client.ts`)

**Modified `upload()` method:**
1. Try PKM backend upload first (`http://localhost:4100/api/upload-background`)
2. Fallback to NocoBase `/attachments` if backend fails
3. Uses `VITE_BACKEND_URL` env var (defaults to `localhost:4100`)

### n8n Workflow (`fixed-minecraft-discord-workflow.json`)

**New workflow structure:**
```
Minecraft Webhook (POST /minecraft-events)
    ↓
Send Minecraft Event → http://172.17.0.1:4100/api/broadcast

Discord Webhook (POST /discord-chat)
    ↓
Send Discord Event → http://172.17.0.1:4100/api/broadcast

Poll Every 30s
    ↓
Get Server Status (mcapi.us)
    ↓
Send Minecraft Event → http://172.17.0.1:4100/api/broadcast
```

**Key fixes:**
- Minecraft webhook path: `/minecraft-events` (matches plugin)
- Discord webhook uses LOCAL backend: `http://172.17.0.1:4100/api/broadcast`
- Proper auth header: `x-api-key` with JWT token

---

## Migration Steps

### Quick Migration (Recommended)

```bash
cd /home/house/pkm
sudo ./migrate-stack.sh
```

This script will:
1. Install `multer` dependency
2. Create/fix permissions on `public/` directory
3. Restart backend and frontend services
4. Test endpoints
5. Guide you through n8n workflow import

### Manual Migration

If you prefer step-by-step:

#### 1. Install Dependencies
```bash
cd /home/house/pkm
npm install multer
```

#### 2. Setup Public Directory
```bash
mkdir -p /home/house/pkm/public
chown -R house:house /home/house/pkm/public
chmod 755 /home/house/pkm/public
```

#### 3. Restart Services
```bash
# Stop services
sudo systemctl stop pkm-frontend
sudo pkill -f "node.*backend/server.js"

# Start backend
cd /home/house/pkm
nohup node backend/server.js > backend.log 2>&1 &

# Wait for backend to start
sleep 3

# Start frontend
sudo systemctl start pkm-frontend
```

#### 4. Import n8n Workflow
1. Open n8n: http://localhost:5678
2. Go to **Workflows** → **Import from File**
3. Select: `/home/house/pkm/fixed-minecraft-discord-workflow.json`
4. Click **Import**
5. **Activate** the new workflow
6. **Deactivate** old workflows:
   - "Minecraft Monitoring V3 (Clean)"
   - "DupeMates Webhook Bridge"
   - "pkm capture" (if it has minecraft event handling)

#### 5. Clear Webhook Cache
```bash
docker restart n8n
# Wait 30 seconds for n8n to reinitialize
```

---

## Testing

### Automated Test
```bash
cd /home/house/pkm
./test-stack.sh
```

### Manual Tests

#### Test 1: Backend Status
```bash
curl http://localhost:4100/api/status
# Expected: {"status":"online","clients":0}
```

#### Test 2: Broadcast Endpoint
```bash
curl -X POST http://172.17.0.1:4100/api/broadcast \
  -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc2OTY2MTcwMiwiZXhwIjozMzMyNzI2MTcwMn0.aMl0pcnaUOlmeJwkODjVjSIqYhs1OxZDtPbNKv66fnE" \
  -H "Content-Type: application/json" \
  -d '{"type":"chat","player":"TestUser","message":"test"}'
# Expected: {"status":"broadcasted"}
```

#### Test 3: Background Upload
```bash
# Create test image
curl -o /tmp/test.jpg https://via.placeholder.com/400x300.jpg

# Upload
curl -X POST http://172.17.0.1:4100/api/upload-background \
  -F "file=@/tmp/test.jpg"
# Expected: {"url":"/public/bg-TIMESTAMP-HASH.jpg",...}

# Verify file exists
ls -lh /home/house/pkm/public/bg-*
```

#### Test 4: Minecraft Webhook
```bash
curl -X POST http://localhost:5678/webhook/minecraft-events \
  -H "Content-Type: application/json" \
  -d '{"type":"join","player":"TestPlayer","count":1,"online":true}'
```

Check `server-data.json` was updated:
```bash
cat /home/house/pkm/server-data.json | jq '.lastServerStats'
```

#### Test 5: Frontend Background Upload
1. Open: https://dupe.houseofmates.space
2. Open builder mode (if needed)
3. Right-click → **Upload Background**
4. Select an image
5. Verify it appears immediately
6. Check backend log: `tail -f /home/house/pkm/backend.log`

---

## Troubleshooting

### Issue: "POST minecraft-events webhook is not registered"

**Cause:** Old workflow using wrong path or workflow not activated  
**Fix:**
```bash
# 1. Check active workflows
docker exec n8n n8n list:workflow --active=true

# 2. Ensure new workflow is active in n8n UI
# 3. Restart n8n
docker restart n8n
```

### Issue: Background images return 404

**Cause:** Files saved but not served (missing static middleware)  
**Fix:**
```bash
# Check if endpoint exists
curl -I http://localhost:4100/api/upload-background
# Should return 200 or 400, not 404

# Check file permissions
ls -la /home/house/pkm/public/
# Should be owned by house:house with 644 permissions

# Restart backend
sudo pkill -f "node.*backend/server.js"
cd /home/house/pkm && nohup node backend/server.js > backend.log 2>&1 &
```

### Issue: server-data.json not updating

**Cause:** Discord/Minecraft webhooks hitting wrong URL  
**Fix:**
```bash
# Check n8n logs for failed requests
docker logs -f n8n | grep broadcast

# Test webhook manually
curl -X POST http://localhost:5678/webhook/minecraft-events \
  -H "Content-Type: application/json" \
  -d '{"type":"ping","player":"system","online":true,"count":0}'

# Verify backend received it
tail -f /home/house/pkm/backend.log | grep Broadcast
```

### Issue: "Cannot read property 'data' of undefined" (upload)

**Cause:** Frontend getting unexpected response format  
**Debug:**
```bash
# Check backend logs during upload
tail -f /home/house/pkm/backend.log

# Test upload directly
curl -X POST http://172.17.0.1:4100/api/upload-background \
  -F "file=@/tmp/test.jpg" -v
```

---

## Architecture Reference

### Port Mapping
- **PKM Backend:** `4100` (Node.js, serves APIs + static files)
- **PKM Frontend:** `3010` (Vite dev server / node serve)
- **n8n:** `5678` (Docker container)
- **NocoBase:** `https://db.houseofmates.space`

### Docker Networking
- **Host machine:** `172.17.0.1` (from n8n container perspective)
- **n8n webhooks:** `http://172.17.0.1:4100/api/broadcast`
- **Minecraft plugin:** Should POST to `http://your-server-ip:5678/webhook/minecraft-events`

### File Locations
```
/home/house/pkm/
├── backend/
│   └── server.js           # Main backend server (MODIFIED)
├── src/
│   └── api/
│       └── nocobase-client.ts  # Upload logic (MODIFIED)
├── public/                 # Background images (NEW)
│   └── bg-*.jpg
├── server-data.json        # Live chat/stats data
├── backend.log             # Backend logs
├── fixed-minecraft-discord-workflow.json  # Import this
├── migrate-stack.sh        # Migration script
└── test-stack.sh          # Testing script
```

### Auth Keys
- **Backend API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc2OTY2MTcwMiwiZXhwIjozMzMyNzI2MTcwMn0.aMl0pcnaUOlmeJwkODjVjSIqYhs1OxZDtPbNKv66fnE`
- **Header:** `x-api-key`
- **Role:** root (full access)

---

## Maintenance

### View Logs
```bash
# Backend
tail -f /home/house/pkm/backend.log

# Frontend
sudo journalctl -fu pkm-frontend

# n8n
docker logs -f n8n
```

### Restart Services
```bash
# Backend only
sudo pkill -f "node.*backend/server.js"
cd /home/house/pkm && nohup node backend/server.js > backend.log 2>&1 &

# Frontend only
sudo systemctl restart pkm-frontend

# n8n only
docker restart n8n

# Everything
./migrate-stack.sh
```

### Clean Old Backgrounds
```bash
# Delete backgrounds older than 30 days
find /home/house/pkm/public -name "bg-*" -mtime +30 -delete
```

---

## Rollback Plan

If something breaks:

### 1. Restore Backend
```bash
cd /home/house/pkm
git checkout backend/server.js
git checkout src/api/nocobase-client.ts
sudo pkill -f "node.*backend/server.js"
nohup node backend/server.js > backend.log 2>&1 &
```

### 2. Reactivate Old n8n Workflows
1. Open n8n UI
2. Deactivate "Minecraft + Discord Bridge (FIXED)"
3. Activate "Minecraft Monitoring V3 (Clean)"
4. Update Discord webhook URL back to `https://dupe.houseofmates.space/api/broadcast`

### 3. Verify
```bash
curl http://localhost:4100/api/status
# Should still work (status endpoint unchanged)
```

---

## Support

If issues persist:
1. Check logs in all 3 services (backend, frontend, n8n)
2. Verify webhooks are active in n8n UI
3. Test each endpoint individually with curl
4. Check file permissions on `public/` directory
5. Ensure `multer` is installed: `npm list multer`

Contact: Review this guide or check service logs for error details.
