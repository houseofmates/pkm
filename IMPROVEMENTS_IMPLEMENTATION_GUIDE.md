# PKM Backend Improvements - Implementation Guide

This document provides step-by-step instructions for implementing the critical security and performance improvements identified in the codebase audit.

## Prerequisites

Before implementing these changes, ensure you have:
- Backup of current `.env` file
- Access to production environment variables
- Node.js >= 20.0.0
- npm >= 10.0.0

## Installation Steps

### 1. Install Required Dependencies

```bash
# Navigate to backend package
cd packages/backend

# Install new dependencies
npm install express-rate-limit dotenv zod

# Verify installation
npm list express-rate-limit dotenv zod
```

### 2. Update Backend Server (server.js)

#### Step 2a: Add imports at the top of server.js

Replace the current environment loading section (lines 36-54) with:

```javascript
// Import environment validator and rate limiters
import { loadEnvironment } from './env-validator.js';
import { createRateLimiters } from './rate-limiter.js';

// Load and validate environment variables (replaces manual .env parsing)
const env = loadEnvironment();
```

#### Step 2b: Add rate limiting after app creation

After line 64 (`const app = express();`), add:

```javascript
// Initialize rate limiters
const { generalLimiter, aiLimiter, authLimiter, uploadLimiter } = createRateLimiters();

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Apply stricter limits to specific endpoints
app.use('/api/ai/', aiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/notion-import', uploadLimiter);
app.use('/api/csv-import', uploadLimiter);
```

#### Step 2c: Update WebSocket configuration

Replace the Socket.IO initialization (around line 67-85) with:

```javascript
const MAX_CONNECTIONS = parseInt(process.env.MAX_WS_CONNECTIONS || '1000', 10);
const CONNECTION_TIMEOUT_MS = 30000;
let activeConnections = 0;

const io = new Server(server, {
    cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3010'],
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: CONNECTION_TIMEOUT_MS,
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6, // 1 MB
    perMessageDeflate: {
        threshold: 1024 // Only compress messages > 1KB
    }
});

// Connection limiting middleware
io.use((socket, next) => {
    if (activeConnections >= MAX_CONNECTIONS) {
        console.warn('[WebSocket] Connection limit reached:', activeConnections);
        return next(new Error('Connection limit exceeded'));
    }
    
    const clientIp = socket.handshake.address;
    socket.data.connectedAt = Date.now();
    socket.data.ip = clientIp;
    
    next();
});

io.on('connection', (socket) => {
    activeConnections++;
    console.log(`[WebSocket] Connected: ${socket.id} (${activeConnections}/${MAX_CONNECTIONS})`);
    
    // Disconnect stale connections (idle for > 1 hour)
    const heartbeat = setInterval(() => {
        const idleTime = Date.now() - socket.data.connectedAt;
        if (idleTime > 3600000) { // 1 hour
            console.log(`[WebSocket] Disconnecting stale connection: ${socket.id}`);
            socket.disconnect(true);
        }
    }, 300000); // Check every 5 minutes
    
    socket.on('disconnect', (reason) => {
        activeConnections--;
        clearInterval(heartbeat);
        console.log(`[WebSocket] Disconnected: ${socket.id} (${reason}) (${activeConnections}/${MAX_CONNECTIONS})`);
    });
    
    socket.on('error', (error) => {
        console.error(`[WebSocket] Error for ${socket.id}:`, error);
        socket.disconnect(true);
    });
    
    // ... existing socket event handlers remain below
});
```

### 3. Update .env File

Copy the example environment file and update with your values:

```bash
# Copy example to .env (if .env doesn't exist)
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

Required values to set:
- `ADMIN_SECRET` - Minimum 16 characters, use a strong random string
- `BROADCAST_AUTH_KEY` - Minimum 16 characters
- `NOCOBASE_URL` - Your NocoBase instance API URL
- `NOCOBASE_API_KEY` - Your NocoBase API key

### 4. Test Locally

```bash
# Start backend
npm run backend

# Verify rate limiting
for i in {1..105}; do
    curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/api/test
done
# Should see 429 status after 100 requests

# Test WebSocket connections
# In another terminal
wscat -c ws://localhost:4100
```

### 5. Deploy to Staging

```bash
# Commit changes
git add packages/backend/server.js packages/backend/env-validator.js packages/backend/rate-limiter.js .env.example
git commit -m "feat: add rate limiting and environment validation"

# Push to staging
git push origin staging

# Monitor logs
npm run logs
```

### 6. Production Deployment

```bash
# Set environment variables in production
# (Use your deployment method - Docker, systemd, etc.)

# Deploy
git push origin main

# Monitor for issues
tail -f /var/log/pkm/backend.log
```

## Rollback Plan

If issues occur:

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Remove new dependencies
cd packages/backend
npm uninstall express-rate-limit dotenv zod

# 3. Restore old .env if needed
mv .env.backup .env

# 4. Restart service
npm run backend
```

## Monitoring

### Key Metrics to Track

1. **Rate Limit Hits**
   ```bash
   # Check logs for rate limit triggers
   grep "429" /var/log/nginx/access.log | wc -l
   ```

2. **WebSocket Connections**
   ```bash
   # Monitor active connections
   grep "WebSocket" /var/log/pkm/backend.log | tail -20
   ```

3. **Error Rates**
   ```bash
   # Check for 5xx errors
   grep "5[0-9][0-9]" /var/log/nginx/access.log | wc -l
   ```

### Alert Thresholds

Set up alerts for:
- Rate limit hits > 100/hour (warning)
- Rate limit hits > 500/hour (critical)
- WebSocket rejections > 10/hour (warning)
- API 5xx errors > 1% (warning)
- API 5xx errors > 5% (critical)

## Validation Checklist

- [ ] Dependencies installed successfully
- [ ] Environment variables validated on startup
- [ ] Rate limiting working (test with curl loop)
- [ ] WebSocket connections limited properly
- [ ] No errors in logs after deployment
- [ ] API responses include rate limit headers
- [ ] Stale WebSocket connections cleaned up
- [ ] Production monitoring in place

## Support

If you encounter issues:
1. Check logs: `npm run logs`
2. Verify environment: `node -e "console.log(process.env)"`
3. Test rate limiter: `curl -I http://localhost:4100/api/test`
4. Review audit report: `cat CODEBASE_AUDIT_REPORT.md`

## Next Steps

After implementing these changes, consider:
1. Adding TypeScript to backend (medium-term)
2. Modularizing server.js into route files (medium-term)
3. Implementing comprehensive test coverage (medium-term)
4. Adding ARIA labels for accessibility (medium-term)

See `CODEBASE_AUDIT_REPORT.md` for full details.
