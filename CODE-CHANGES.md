# Code Changes Summary

## Files Modified

### 1. `/home/house/pkm/backend/server.js`

**Added at top (after imports):**
```javascript
import multer from 'multer';
import path from 'path';

// Configure multer for background image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `bg-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
```

**Added before `const PORT = ...`:**
```javascript
// Background Image Upload Endpoint
app.post('/api/upload-background', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const publicUrl = `/public/${req.file.filename}`;
        console.log('[Upload] Background image uploaded:', publicUrl);

        res.json({
            url: publicUrl,
            data: {
                url: publicUrl,
                data: { url: publicUrl }
            }
        });
    } catch (error) {
        console.error('[Upload] Error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

// Serve static files from public directory
app.use('/public', express.static(path.join(process.cwd(), 'public')));
```

### 2. `/home/house/pkm/src/api/nocobase-client.ts`

**Replaced `upload()` method:**
```typescript
// --- File/Storage Methods ---
async upload(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Try PKM backend upload first (for background images)
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4100';
    const res = await fetch(`${backendUrl}/api/upload-background`, {
      method: 'POST',
      body: formData,
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('[Upload] Using PKM backend upload:', data);
      return data;
    }
  } catch (err) {
    console.warn('[Upload] PKM backend upload failed, falling back to NocoBase:', err);
  }
  
  // Fallback to NocoBase attachments endpoint
  const res = await this._axios.post('/attachments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
```

## Files Created

### 3. `/home/house/pkm/fixed-minecraft-discord-workflow.json`

Complete n8n workflow JSON with:
- Minecraft webhook: `POST /minecraft-events`
- Discord webhook: `POST /discord-chat`
- Server status poller (30s interval)
- All webhooks forward to: `http://172.17.0.1:4100/api/broadcast`

### 4. `/home/house/pkm/migrate-stack.sh`

Bash script that:
1. Installs multer dependency
2. Creates public directory with correct permissions
3. Restarts backend and frontend services
4. Tests endpoints
5. Guides n8n workflow import

### 5. `/home/house/pkm/test-stack.sh`

Testing script that:
- Tests backend status endpoint
- Tests broadcast endpoint
- Checks server-data.json freshness
- Lists recent background uploads
- Shows how to test webhooks

### 6. `/home/house/pkm/MIGRATION-GUIDE.md`

Comprehensive documentation covering:
- Problem analysis
- Code changes
- Migration procedures
- Testing instructions
- Troubleshooting guide
- Rollback plan

## Dependencies Added

Add to `package.json`:
```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1"
  }
}
```

Install with:
```bash
npm install multer
```

## Environment Variables (Optional)

Can add to `.env`:
```bash
VITE_BACKEND_URL=http://localhost:4100
BROADCAST_AUTH_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc2OTY2MTcwMiwiZXhwIjozMzMyNzI2MTcwMn0.aMl0pcnaUOlmeJwkODjVjSIqYhs1OxZDtPbNKv66fnE
PORT=4100
```

## File Permissions

Ensure these permissions:
```bash
/home/house/pkm/public/          # 755 (drwxr-xr-x)
/home/house/pkm/public/bg-*.jpg  # 644 (-rw-r--r--)
/home/house/pkm/migrate-stack.sh # 755 (-rwxr-xr-x)
/home/house/pkm/test-stack.sh    # 755 (-rwxr-xr-x)
```

All owned by: `house:house`

## API Endpoints Summary

### New Endpoints
```
POST /api/upload-background
  - Accepts: multipart/form-data with 'file' field
  - Returns: { url: "/public/bg-123.jpg", data: {...} }
  - Auth: None required
  - Max size: 10MB
  - Allowed types: jpeg, jpg, png, gif, webp

GET /public/:filename
  - Serves static files from /home/house/pkm/public/
  - No auth required
```

### Existing Endpoints (Unchanged)
```
POST /api/broadcast
  - Auth: x-api-key header
  - Updates server-data.json
  - Emits socket.io events

GET /api/status
GET /api/stats
GET /api/chat
GET /api/players
```

## n8n Webhook URLs

After import, these webhooks will be active:
```
POST http://localhost:5678/webhook/minecraft-events
POST http://localhost:5678/webhook/discord-chat
```

Minecraft plugin should POST to:
```
http://YOUR_SERVER_IP:5678/webhook/minecraft-events
```

## Verification Checklist

After migration, verify:

- [ ] Backend starts without errors
- [ ] Frontend loads correctly
- [ ] `/api/status` returns data
- [ ] POST to `/api/broadcast` works
- [ ] File upload to `/api/upload-background` works
- [ ] Uploaded files are accessible via `/public/filename`
- [ ] n8n workflow is active
- [ ] Minecraft events update server-data.json
- [ ] Discord messages appear on site
- [ ] Background image upload works in frontend

## Quick Commands Reference

```bash
# Install deps
cd /home/house/pkm && npm install multer

# Run migration
sudo ./migrate-stack.sh

# Test everything
./test-stack.sh

# View logs
tail -f /home/house/pkm/backend.log

# Restart backend
sudo pkill -f "node.*backend/server.js"
cd /home/house/pkm && nohup node backend/server.js > backend.log 2>&1 &

# Restart frontend
sudo systemctl restart pkm-frontend

# Restart n8n
docker restart n8n

# Check if services are running
curl http://localhost:4100/api/status
curl http://localhost:3010
curl http://localhost:5678/healthz
```
