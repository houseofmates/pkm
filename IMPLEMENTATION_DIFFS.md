# PKM Backend - Unified Diffs for Security Improvements

This file contains unified diff format showing the exact changes needed to implement the critical security improvements.

## File 1: packages/backend/server.js

### Change 1: Replace environment variable loading (lines 36-54)

```diff
--- a/packages/backend/server.js
+++ b/packages/backend/server.js
@@ -33,24 +33,10 @@ import ical from 'node-ical';
 import { getPiecesRecentActivity, getPiecesContextForQuery, isPiecesConnected } from './pieces-mcp.js';
 import { getAllMemoryContext, addMemory, recordInteraction, readMemory, writeMemory, appendMemory, clearMemory } from './bot-memory.js';
 
-// Load environment variables if .env exists
-if (fs.existsSync('.env')) {
-    // Basic dotenv loader since we are in ES module and might not have dotenv package installed
-    // do not overwrite existing variables so tests can override values before import
-    const envContent = fs.readFileSync('.env', 'utf-8');
-    envContent.split('\n').forEach(line => {
-        const [key, ...val] = line.split('=');
-        if (key && val) {
-            const name = key.trim();
-            const value = val.join('=').trim();
-            if (name === 'ALLOWED_ORIGINS' && process.env[name]) {
-                // merge entries so multiple lines in .env accumulate
-                process.env[name] = process.env[name] + ',' + value;
-            } else if (!(name in process.env)) {
-                process.env[name] = value;
-            }
-        }
-    });
-}
+// Import environment validator and rate limiters
+import { loadEnvironment } from './env-validator.js';
+import { createRateLimiters } from './rate-limiter.js';
+
+// Load and validate environment variables (replaces manual .env parsing)
+const env = loadEnvironment();
 
 const PORT = process.env.PORT || 4100;
```

### Change 2: Add rate limiting after app creation (after line 64)

```diff
--- a/packages/backend/server.js
+++ b/packages/backend/server.js
@@ -62,6 +48,15 @@ const ADMIN_SECRET = process.env.BROADCAST_AUTH_KEY || process.env.ADMIN_SECRET
 
 const app = express();
+
+// Initialize rate limiters
+const { generalLimiter, aiLimiter, authLimiter, uploadLimiter } = createRateLimiters();
+
+// Apply general rate limiter to all API routes
+app.use('/api/', generalLimiter);
+
+// Apply stricter limits to specific endpoints
+app.use('/api/ai/', aiLimiter);
+app.use('/api/auth/', authLimiter);
+app.use('/api/notion-import', uploadLimiter);
+app.use('/api/csv-import', uploadLimiter);
+
 // create http server from express app for socket.io
 const server = http.createServer(app);
```

### Change 3: Update WebSocket configuration (around line 67-100)

```diff
--- a/packages/backend/server.js
+++ b/packages/backend/server.js
@@ -67,13 +72,52 @@ const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
     .map(s => s.trim())
     .filter(Boolean);
 
+const MAX_CONNECTIONS = parseInt(process.env.MAX_WS_CONNECTIONS || '1000', 10);
+const CONNECTION_TIMEOUT_MS = 30000;
+let activeConnections = 0;
+
 const io = new Server(server, {
     cors: {
         origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3010'],
         methods: ["GET", "POST"],
         credentials: true,
     },
     pingTimeout: 60000,
     pingInterval: 25000,
     connectTimeout: 45000,
     allowEIO3: true,
     transports: ['websocket', 'polling']
+    maxHttpBufferSize: 1e6, // 1 MB
+    perMessageDeflate: {
+        threshold: 1024 // Only compress messages > 1KB
+    }
 });
+
+// Connection limiting middleware
+io.use((socket, next) => {
+    if (activeConnections >= MAX_CONNECTIONS) {
+        console.warn('[WebSocket] Connection limit reached:', activeConnections);
+        return next(new Error('Connection limit exceeded'));
+    }
+    
+    const clientIp = socket.handshake.address;
+    socket.data.connectedAt = Date.now();
+    socket.data.ip = clientIp;
+    
+    next();
+});
+
 io.on('connection', (socket) => {
+    activeConnections++;
+    console.log(`[WebSocket] Connected: ${socket.id} (${activeConnections}/${MAX_CONNECTIONS})`);
+    
+    // Disconnect stale connections (idle for > 1 hour)
+    const heartbeat = setInterval(() => {
+        const idleTime = Date.now() - socket.data.connectedAt;
+        if (idleTime > 3600000) { // 1 hour
+            console.log(`[WebSocket] Disconnecting stale connection: ${socket.id}`);
+            socket.disconnect(true);
+        }
+    }, 300000); // Check every 5 minutes
+    
+    socket.on('disconnect', (reason) => {
+        activeConnections--;
+        clearInterval(heartbeat);
+        console.log(`[WebSocket] Disconnected: ${socket.id} (${reason}) (${activeConnections}/${MAX_CONNECTIONS})`);
+    });
+    
+    socket.on('error', (error) => {
+        console.error(`[WebSocket] Error for ${socket.id}:`, error);
+        socket.disconnect(true);
+    });
+    
     // ... existing socket event handlers remain below ...
```

## File 2: packages/core/src/hooks/use-drawing.ts

### Change: Add interval cleanup (lines 99, 151)

```diff
--- a/packages/core/src/hooks/use-drawing.ts
+++ b/packages/core/src/hooks/use-drawing.ts
@@ -95,8 +95,14 @@ export function useDrawing(drawingId: string) {
         }
     };
     
-    syncIntervalRef.current = setInterval(checkStatus, 2000);
-    
+    useEffect(() => {
+        syncIntervalRef.current = setInterval(checkStatus, 2000);
+        
+        return () => {
+            if (syncIntervalRef.current) {
+                clearInterval(syncIntervalRef.current);
+                syncIntervalRef.current = null;
+            }
+        };
+    }, []);
     // ... rest of the effect
 }, []);
 
@@ -147,8 +153,13 @@ export function useDrawing(drawingId: string) {
         }
     };
     
-    const interval = setInterval(checkAndSave, 5000);
-    
+    useEffect(() => {
+        const interval = setInterval(checkAndSave, 5000);
+        
+        return () => {
+            clearInterval(interval);
+        };
+    }, []);
     // ... rest of the effect
 }, []);
```

## File 3: packages/core/src/hooks/use-app-setting.ts

### Change: Add interval cleanup (line 104)

```diff
--- a/packages/core/src/hooks/use-app-setting.ts
+++ b/packages/core/src/hooks/use-app-setting.ts
@@ -100,8 +100,13 @@ export function useAppSetting(key: string, defaultValue: any) {
         }
     };
     
-    const interval = setInterval(fetchSetting, pollIntervalMs);
-    
+    useEffect(() => {
+        const interval = setInterval(fetchSetting, pollIntervalMs);
+        
+        return () => {
+            clearInterval(interval);
+            if (saveTimeoutRef.current) {
+                clearTimeout(saveTimeoutRef.current);
+            }
+        };
+    }, [pollIntervalMs]);
     // ... rest of the effect
 }, [pollIntervalMs]);
```

## File 4: packages/core/src/hooks/use-hibernation-streak.ts

### Change: Add interval cleanup (line 112)

```diff
--- a/packages/core/src/hooks/use-hibernation-streak.ts
+++ b/packages/core/src/hooks/use-hibernation-streak.ts
@@ -108,8 +108,13 @@ export function useHibernationStreak() {
         }
     };
     
-    const interval = setInterval(checkStreak, 60 * 60 * 1000);
-    
+    useEffect(() => {
+        const interval = setInterval(checkStreak, 60 * 60 * 1000);
+        
+        return () => {
+            clearInterval(interval);
+        };
+    }, []);
     // ... rest of the effect
 }, []);
```

## New Files to Add

### packages/backend/rate-limiter.js

(Already created - see file content)

### packages/backend/env-validator.js

(Already created - see file content)

### .env.example

(Already created - see file content)

### scripts/cleanup-test-artifacts.sh

(Already created - see file content)

## package.json Changes

### packages/backend/package.json

```diff
--- a/packages/backend/package.json
+++ b/packages/backend/package.json
@@ -14,6 +14,9 @@
   "type": "module",
   "dependencies": {
     "chokidar": "^4.0.3",
+    "cors": "^2.8.5",
+    "dotenv": "^16.3.1",
     "express": "^5.1.0",
+    "express-rate-limit": "^7.1.5",
     "multer": "^2.0.2",
     "node-ical": "^0.25.6"
+    "zod": "^3.22.4"
   },
```

## Summary of Changes

**Files Modified**:
- `packages/backend/server.js` - 3 major changes
- `packages/core/src/hooks/use-drawing.ts` - 2 interval cleanups
- `packages/core/src/hooks/use-app-setting.ts` - 1 interval cleanup
- `packages/core/src/hooks/use-hibernation-streak.ts` - 1 interval cleanup
- `packages/backend/package.json` - Add 3 dependencies

**Files Added**:
- `packages/backend/rate-limiter.js` - Rate limiting middleware
- `packages/backend/env-validator.js` - Environment validation
- `.env.example` - Environment template
- `scripts/cleanup-test-artifacts.sh` - Cleanup automation

**Total Lines Changed**: ~150 lines modified, ~200 lines added

**Estimated Implementation Time**: 4-6 hours (including testing)

---

## Application Instructions

### Option 1: Manual Application (Recommended)

1. Open each file mentioned above
2. Find the lines indicated by the diff
3. Replace the old code with the new code
4. Test after each change
5. Commit incrementally

### Option 2: Patch Application

Save this file as `security-improvements.patch` and apply:

```bash
# Test the patch first (dry run)
git apply --check security-improvements.patch

# Apply the patch
git apply security-improvements.patch

# Verify changes
git status
git diff --stat
```

### Option 3: Use Implementation Guide

Follow the step-by-step instructions in `IMPROVEMENTS_IMPLEMENTATION_GUIDE.md` for detailed walkthrough with explanations.

---

## Testing After Application

```bash
# 1. Install new dependencies
cd packages/backend
npm install

# 2. Start backend
npm run backend

# 3. Test rate limiting
for i in {1..105}; do
    curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/api/test
done

# 4. Check WebSocket connections
wscat -c ws://localhost:4100

# 5. Monitor logs for errors
tail -f logs/backend.log
```

---

## Rollback Instructions

If issues occur:

```bash
# 1. Revert changes
git revert HEAD

# 2. Remove dependencies
cd packages/backend
npm uninstall express-rate-limit dotenv zod

# 3. Restore old .env
mv .env.backup .env

# 4. Restart
npm run backend
```

---

**Note**: All new files have already been created in the repository. Only the modifications to existing files need to be applied manually or via patch.
