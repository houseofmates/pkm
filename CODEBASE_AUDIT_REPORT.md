# Codebase Audit Report - PKM (Personal Knowledge Manager)

## Executive Summary

**Project**: PKM Monorepo - Self-hosted personal knowledge management system  
**Architecture**: React/TypeScript frontend (Vite), Node.js/Express backend, multi-platform (Web, Desktop Electron/Tauri, Mobile Capacitor)  
**Audit Date**: 2026-04-04  
**Codebase Size**: ~2,000 lines backend, ~15,000+ lines frontend, 61 test files

### Overall Health Assessment

| Category | Score | Status |
|----------|-------|--------|
| Security | 6/10 | ⚠️ Needs Attention |
| Performance | 7/10 | ✓ Good |
| Maintainability | 5/10 | ⚠️ Needs Attention |
| Accessibility | 6/10 | ⚠️ Needs Attention |
| User Experience | 7/10 | ✓ Good |
| Scalability | 6/10 | ⚠️ Needs Attention |

---

## Critical Findings

### 1. SECURITY ISSUES

#### 1.1 Environment Variable Management (HIGH RISK)
**Location**: `packages/backend/server.js:37-54`

**Issue**: Custom dotenv parser with security vulnerabilities
- Manual parsing of `.env` file without validation
- No sanitization of environment variables
- Allows overwriting `ALLOWED_ORIGINS` through concatenation
- Secrets like `ADMIN_SECRET`, `BROADCAST_AUTH_KEY` loaded without encryption

**Risk**: Environment variable injection, secret exposure, CORS bypass

**Current Code**:
```javascript
if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) {
            const name = key.trim();
            const value = val.join('=').trim();
            if (name === 'ALLOWED_ORIGINS' && process.env[name]) {
                process.env[name] = process.env[name] + ',' + value;
            } else if (!(name in process.env)) {
                process.env[name] = value;
            }
        }
    });
}
```

**Impact**: 
- Potential for malicious environment variable injection
- No validation of URL formats in ALLOWED_ORIGINS
- Secrets stored in plaintext files

---

#### 1.2 Hardcoded API Keys and URLs (MEDIUM RISK)
**Location**: Multiple files

**Issues Found**:
- `packages/core/src/lib/vertex-image.ts`: Hardcoded Google API endpoints
- `packages/core/src/lib/llm-config.ts`: Hardcoded default Ollama URL `http://192.168.4.250:11434`
- `packages/core/src/hooks/use-semantic-search.ts`: Hardcoded `http://localhost:11434`
- `packages/core/src/utils/apkUpdater.ts`: Hardcoded `https://pkm.houseofmates.space/apk/version.json`

**Risk**: Information disclosure, inflexible configuration, potential MITM attacks on hardcoded HTTP endpoints

---

#### 1.3 Inadequate Error Handling (MEDIUM RISK)
**Location**: `packages/backend/server.js:418-420, 576-578`

**Issue**: Silent error swallowing without proper logging
```javascript
emitter.on('error', (err) => console.error('[NotionImport] emitter error event', err));
// ...
console.error('[NotionImport] saved failed archive to', debugPath);
```

**Risk**: Debugging difficulty, silent failures in production, data loss without notification

---

#### 1.4 Excessive Console Logging (LOW RISK)
**Location**: Throughout codebase (20+ instances in server.js alone)

**Issue**: Console statements in production code expose internal state
```javascript
console.log('[NotionImport] request received, auth=', req.headers.authorization);
console.log('[NotionImport] creating task', taskId);
console.log('[NotionImport] uploaded file path', req.file.path, 'size', req.file.size);
```

**Risk**: Information leakage in logs, performance degradation, log file bloat

---

### 2. PERFORMANCE ISSUES

#### 2.1 Missing Rate Limiting (HIGH IMPACT)
**Location**: `packages/backend/server.js:153-155`

**Issue**: Rate limiting constants defined but not implemented
```javascript
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const RATE_LIMIT_AI_MAX = parseInt(process.env.RATE_LIMIT_AI_MAX || '20', 10);
```

**Impact**: Vulnerable to DoS attacks, API abuse, resource exhaustion

---

#### 2.2 Inefficient Interval Timers (MEDIUM IMPACT)
**Location**: Multiple hooks

**Issues**:
- `use-drawing.ts:99`: `setInterval(checkStatus, 2000)` - 2 second polling
- `use-drawing.ts:151`: `setInterval(checkAndSave, 5000)` - 5 second autosave
- `use-hibernation-streak.ts:112`: `setInterval(checkStreak, 60 * 60 * 1000)` - hourly check
- `use-app-setting.ts:104`: Polling without cleanup verification

**Impact**: Battery drain on mobile, unnecessary network requests, memory leaks if intervals not cleared

---

#### 2.3 Large Monolithic Backend (MEDIUM IMPACT)
**Location**: `packages/backend/server.js` - 1,939 lines

**Issue**: Single file contains all routes, middleware, and business logic

**Impact**: 
- Slow cold starts
- Difficult to test individual features
- High coupling between components
- Memory inefficiency (entire file loaded even for simple requests)

---

### 3. MAINTAINABILITY ISSUES

#### 3.1 Missing Type Safety (HIGH IMPACT)
**Location**: Throughout codebase

**Issues**:
- Backend server.js is plain JavaScript (no TypeScript)
- 157 instances of localStorage usage without type guards
- Multiple `any` types in critical paths
- No interface definitions for API request/response objects

**Impact**: Runtime errors, refactoring difficulty, poor IDE support

---

#### 3.2 Test Coverage Gaps (MEDIUM IMPACT)
**Location**: Test suite

**Issues**:
- 61 test files but many are skipped or incomplete
- No E2E tests running (Playwright configured but not integrated)
- Backend has minimal test coverage
- No integration tests for critical paths (auth, data sync)

**Current State**:
```bash
npm run test  # Fails - vitest not found in workspace
```

**Impact**: Regression risk, deployment confidence issues

---

#### 3.3 Inconsistent Code Organization (MEDIUM IMPACT)
**Location**: File structure

**Issues**:
- Mixed file extensions (.js, .ts, .tsx, .cjs)
- Inconsistent naming (camelCase vs kebab-case)
- 100+ test-notion-* directories in packages/core (test artifacts not cleaned)
- Sample ZIP files (860 bytes each) scattered in source tree

**Impact**: Navigation difficulty, onboarding friction, repository bloat

---

### 4. ACCESSIBILITY ISSUES

#### 4.1 Missing ARIA Labels (MEDIUM IMPACT)
**Location**: UI components

**Issues**:
- No ARIA labels found in component searches
- Canvas elements lack keyboard navigation
- Custom drag-and-drop without accessibility fallbacks

**Impact**: Screen reader incompatibility, keyboard-only users excluded

---

#### 4.2 Insufficient Color Contrast (LOW IMPACT)
**Location**: Tailwind config, custom styles

**Issue**: Custom color palette not validated for WCAG compliance

---

### 5. USER EXPERIENCE ISSUES

#### 5.1 Alert() Usage (Recently Fixed)
**Status**: ✅ Already addressed per TODO_FIXES.md

---

#### 5.2 Loading States (LOW IMPACT)
**Location**: Lazy-loaded components

**Issue**: Generic loading fallbacks without progress indication
```tsx
const Spotlight = lazy(() => import("@/components/Spotlight").then(m => ({ default: m.Spotlight })));
// No Suspense fallback specified
```

---

### 6. SCALABILITY ISSUES

#### 6.1 No Database Connection Pooling (HIGH IMPACT)
**Location**: Backend architecture

**Issue**: Direct NocoBase API calls without connection management
```javascript
const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
```

**Impact**: Connection exhaustion under load, no retry logic, single point of failure

---

#### 6.2 WebSocket Connection Management (MEDIUM IMPACT)
**Location**: `packages/backend/server.js:67-100`

**Issue**: Socket.IO configured but no connection limits or cleanup
```javascript
const io = new Server(server, {
    cors: { origin: allowedOrigins },
    pingTimeout: 60000,
    pingInterval: 25000,
    // No maxHttpBufferSize, no connection limits
});
```

**Impact**: Memory leaks from stale connections, vulnerability to connection flooding

---

## Priority Matrix

### P0 - CRITICAL (Implement Immediately)

1. **Implement Rate Limiting** (Security + Performance)
   - Impact: HIGH
   - Effort: LOW (2-4 hours)
   - Risk: LOW

2. **Fix Environment Variable Management** (Security)
   - Impact: HIGH
   - Effort: LOW (1-2 hours)
   - Risk: LOW

3. **Add TypeScript to Backend** (Maintainability)
   - Impact: HIGH
   - Effort: MEDIUM (1-2 days)
   - Risk: LOW

### P1 - HIGH (Implement Soon)

4. **Clean Up Test Artifacts** (Maintainability)
   - Impact: MEDIUM
   - Effort: LOW (30 minutes)
   - Risk: NONE

5. **Implement Proper Error Boundaries** (UX + Maintainability)
   - Impact: MEDIUM
   - Effort: LOW (2-3 hours)
   - Risk: LOW

6. **Add Interval Cleanup** (Performance)
   - Impact: MEDIUM
   - Effort: LOW (1-2 hours)
   - Risk: LOW

### P2 - MEDIUM (Plan for Next Sprint)

7. **Modularize Backend** (Maintainability + Scalability)
   - Impact: HIGH
   - Effort: HIGH (3-5 days)
   - Risk: MEDIUM

8. **Add WebSocket Connection Limits** (Scalability)
   - Impact: MEDIUM
   - Effort: LOW (1 hour)
   - Risk: LOW

9. **Implement ARIA Labels** (Accessibility)
   - Impact: MEDIUM
   - Effort: MEDIUM (1-2 days)
   - Risk: LOW

---

## Detailed Implementation Plans

### Improvement #1: Implement Rate Limiting

**Rationale**: Constants are defined but unused. Without rate limiting, the API is vulnerable to brute force attacks and resource exhaustion.

**Expected Benefits**:
- Prevent API abuse
- Protect against DoS attacks
- Ensure fair resource usage
- Meet security best practices

**Potential Risks**:
- Legitimate users might hit limits during heavy usage
- Need to tune thresholds based on actual usage patterns

**Implementation**:

Before (current state):
```javascript
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const RATE_LIMIT_AI_MAX = parseInt(process.env.RATE_LIMIT_AI_MAX || '20', 10);

// ... constants defined but never used
```

After (with rate limiting middleware):
```javascript
import rateLimit from 'express-rate-limit';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const RATE_LIMIT_AI_MAX = parseInt(process.env.RATE_LIMIT_AI_MAX || '20', 10);

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown'
});

// Stricter rate limit for AI endpoints
const aiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_AI_MAX,
    message: { error: 'AI rate limit exceeded, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply general rate limiter to all routes
app.use('/api/', generalLimiter);

// Apply stricter limits to AI endpoints
app.use('/api/ai/', aiLimiter);

// Auth endpoints get even stricter limits
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many authentication attempts' },
    skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
```

**Dependencies**:
```bash
npm install express-rate-limit
```

**Environment Variables** (add to .env.example):
```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AI_MAX=20
```

---

### Improvement #2: Fix Environment Variable Management

**Rationale**: Custom dotenv parser is error-prone and lacks validation. Using the standard `dotenv` package provides better security and reliability.

**Expected Benefits**:
- Standard, well-tested solution
- Type validation for critical variables
- Better error messages
- Support for variable interpolation

**Potential Risks**:
- Need to add dotenv dependency
- Existing .env files might need format adjustments

**Implementation**:

Before (current state):
```javascript
// Load environment variables if .env exists
if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) {
            const name = key.trim();
            const value = val.join('=').trim();
            if (name === 'ALLOWED_ORIGINS' && process.env[name]) {
                process.env[name] = process.env[name] + ',' + value;
            } else if (!(name in process.env)) {
                process.env[name] = value;
            }
        }
    });
}
```

After (with dotenv):
```javascript
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
const result = dotenv.config();
if (result.error && process.env.NODE_ENV === 'production') {
    console.warn('[Backend] Warning: .env file not found in production');
}

// Validate critical environment variables
const envSchema = z.object({
    PORT: z.string().default('4100'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ADMIN_SECRET: z.string().min(16, 'ADMIN_SECRET must be at least 16 characters'),
    BROADCAST_AUTH_KEY: z.string().min(16).optional(),
    NOCOBASE_URL: z.string().url(),
    NOCOBASE_API_KEY: z.string().min(1),
    ALLOWED_ORIGINS: z.string().default('http://localhost:3010'),
    RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
    RATE_LIMIT_AI_MAX: z.string().default('20')
});

try {
    const env = envSchema.parse(process.env);
    // Re-assign validated values
    Object.assign(process.env, env);
} catch (error) {
    console.error('[Backend] Environment validation failed:', error.errors);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}
```

**Dependencies**:
```bash
npm install dotenv zod
```

**Create `.env.example`**:
```env
# Server Configuration
PORT=4100
NODE_ENV=development

# Security (REQUIRED in production)
ADMIN_SECRET=your-secret-key-min-16-chars
BROADCAST_AUTH_KEY=your-broadcast-key-min-16-chars

# NocoBase Integration
NOCOBASE_URL=https://your-nocobase-instance.com/api
NOCOBASE_API_KEY=your-nocobase-api-key

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3011

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AI_MAX=20
```

---

### Improvement #3: Clean Up Test Artifacts

**Rationale**: 100+ test-notion-* directories and sample ZIP files clutter the repository, increase clone time, and confuse developers.

**Expected Benefits**:
- Smaller repository size
- Faster git operations
- Cleaner project structure
- Reduced confusion for new developers

**Potential Risks**:
- None (these are test artifacts already in .gitignore)

**Implementation**:

Create cleanup script:
```bash
#!/bin/bash
# scripts/cleanup-test-artifacts.sh

echo "Cleaning up test artifacts..."

# Remove test-notion directories
find packages/core -type d -name "test-notion-*" -exec rm -rf {} + 2>/dev/null
echo "✓ Removed test-notion-* directories"

# Remove sample ZIP files
find packages/core -name "sample-*.zip" -delete 2>/dev/null
echo "✓ Removed sample ZIP files"

# Remove build artifacts
rm -rf packages/core/dist 2>/dev/null
rm -rf apps/*/dist 2>/dev/null
echo "✓ Removed build artifacts"

# Remove temporary files
rm -rf tmp/* 2>/dev/null
echo "✓ Cleaned tmp directory"

# Update .gitignore to be more explicit
cat >> .gitignore << 'EOF'

# Test artifacts
packages/core/test-notion-*/
packages/core/sample-*.zip
EOF

echo "Cleanup complete!"
```

Run cleanup:
```bash
chmod +x scripts/cleanup-test-artifacts.sh
./scripts/cleanup-test-artifacts.sh
git add .gitignore
git commit -m "chore: clean up test artifacts and improve gitignore"
```

---

### Improvement #4: Add Interval Cleanup

**Rationale**: Multiple hooks use setInterval/setTimeout without proper cleanup, causing memory leaks and unnecessary background operations.

**Expected Benefits**:
- Prevent memory leaks
- Reduce battery drain on mobile
- Eliminate phantom network requests
- Better component lifecycle management

**Potential Risks**:
- Need to verify all interval usage
- May affect existing behavior if intervals were intentionally left running

**Implementation**:

Before (current state in `use-drawing.ts`):
```typescript
useEffect(() => {
    syncIntervalRef.current = setInterval(checkStatus, 2000);
    // No cleanup function
}, []);

useEffect(() => {
    const interval = setInterval(checkAndSave, 5000);
    // No cleanup
}, []);
```

After (with proper cleanup):
```typescript
useEffect(() => {
    const checkStatus = async () => {
        // ... existing logic
    };
    
    syncIntervalRef.current = setInterval(checkStatus, 2000);
    
    // Cleanup on unmount
    return () => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    };
}, []);

useEffect(() => {
    const checkAndSave = async () => {
        // ... existing logic
    };
    
    const interval = setInterval(checkAndSave, 5000);
    
    // Cleanup on unmount
    return () => {
        clearInterval(interval);
    };
}, []);
```

For `use-app-setting.ts`:
```typescript
useEffect(() => {
    const fetchSetting = async () => {
        // ... existing logic
    };
    
    const interval = setInterval(fetchSetting, pollIntervalMs);
    
    return () => {
        clearInterval(interval);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
}, [pollIntervalMs]);
```

---

### Improvement #5: Add WebSocket Connection Limits

**Rationale**: Socket.IO server has no connection limits, making it vulnerable to connection flooding attacks.

**Expected Benefits**:
- Prevent connection flooding
- Better memory management
- Graceful degradation under load
- Improved security posture

**Potential Risks**:
- Need to monitor actual connection counts to set appropriate limits

**Implementation**:

Before:
```javascript
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
});
```

After:
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
    
    // Disconnect stale connections
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
});

// Export for monitoring
export { activeConnections, MAX_CONNECTIONS };
```

**Environment Variables**:
```env
MAX_WS_CONNECTIONS=1000
```

---

## Validation Plan

### Testing Each Improvement

#### 1. Rate Limiting
```bash
# Local testing
npm run backend

# Test rate limiting with curl
for i in {1..120}; do
    curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/api/test
done
# Should see 429 after 100 requests

# Test AI endpoint rate limit
for i in {1..25}; do
    curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $ADMIN_SECRET" \
        http://localhost:4100/api/ai/chat
done
# Should see 429 after 20 requests
```

**Staging Validation**:
- Monitor rate limit headers in responses
- Check logs for rate limit triggers
- Verify legitimate users aren't affected

---

#### 2. Environment Variables
```bash
# Test with missing required variables
unset ADMIN_SECRET
npm run backend
# Should fail with validation error

# Test with invalid values
echo "ADMIN_SECRET=short" > .env.test
NODE_ENV=production npm run backend
# Should fail with validation error

# Test with valid configuration
cp .env.example .env
# Fill in valid values
npm run backend
# Should start successfully
```

**Staging Validation**:
- Verify all environment variables loaded correctly
- Check logs for validation warnings
- Test CORS with different origins

---

#### 3. Test Artifact Cleanup
```bash
# Before cleanup
du -sh packages/core
find packages/core -name "test-notion-*" | wc -l
find packages/core -name "sample-*.zip" | wc -l

# Run cleanup
./scripts/cleanup-test-artifacts.sh

# After cleanup
du -sh packages/core
find packages/core -name "test-notion-*" | wc -l  # Should be 0
find packages/core -name "sample-*.zip" | wc -l   # Should be 0

# Verify git status
git status  # Should show deleted files
```

---

#### 4. Interval Cleanup
```bash
# Test with React DevTools
# 1. Navigate to page with intervals
# 2. Observe intervals running
# 3. Navigate away from page
# 4. Verify intervals cleared in Performance tab

# Memory leak test
npm run dev
# Use Chrome DevTools Memory tab
# Take heap snapshot before navigation
# Navigate between pages 10 times
# Take another heap snapshot
# Compare - should not see growing interval refs
```

**Automated Test**:
```typescript
// tests/interval-cleanup.test.tsx
import { render, unmount } from '@testing-library/react';
import { useDrawing } from '@/hooks/use-drawing';

test('clears intervals on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const { unmount } = render(<DrawingComponent />);
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
});
```

---

#### 5. WebSocket Limits
```bash
# Test connection limiting
npm run backend

# Simulate multiple connections
for i in {1..1005}; do
    wscat -c ws://localhost:4100 &
done

# Should see connection rejected after 1000
# Monitor logs for limit warnings

# Test stale connection cleanup
wscat -c ws://localhost:4100
# Leave connection idle for 1+ hours
# Should be automatically disconnected
```

---

## Deployment Considerations

### Environment Variables Required
```env
# New variables to add
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AI_MAX=20
MAX_WS_CONNECTIONS=1000
```

### Dependencies to Install
```bash
npm install express-rate-limit dotenv zod
```

### Migration Steps

1. **Pre-deployment**
   ```bash
   # 1. Backup current .env
   cp .env .env.backup
   
   # 2. Update .env with new variables
   cat .env.example >> .env
   
   # 3. Install dependencies
   npm install
   
   # 4. Run cleanup script
   ./scripts/cleanup-test-artifacts.sh
   ```

2. **Deploy to Staging**
   ```bash
   # 1. Deploy code
   git push origin staging
   
   # 2. Monitor logs for errors
   npm run logs
   
   # 3. Run validation tests
   npm run test
   ```

3. **Production Deployment**
   ```bash
   # 1. Deploy during low-traffic window
   git push origin main
   
   # 2. Monitor connection counts
   # 3. Watch for rate limit triggers
   # 4. Verify WebSocket connections stable
   ```

### Rollback Plan
If issues occur:
```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Remove new dependencies
npm uninstall express-rate-limit dotenv zod

# 3. Restore .env backup
mv .env.backup .env

# 4. Restart services
npm run restart
```

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Rate Limiting**
   - Number of 429 responses per hour
   - Affected endpoints
   - User complaints

2. **WebSocket Connections**
   - Active connection count
   - Connection duration
   - Rejection rate

3. **Performance**
   - API response times (p50, p95, p99)
   - Memory usage
   - CPU utilization

4. **Error Rates**
   - 5xx errors
   - WebSocket disconnections
   - Environment validation failures

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Rate limit hits | >100/hour | >500/hour |
| WebSocket rejections | >10/hour | >50/hour |
| API 5xx errors | >1% | >5% |
| Memory usage | >80% | >90% |

---

## Conclusion

The PKM codebase has solid foundations with modern technologies and good architectural patterns. However, several critical security and maintainability issues need immediate attention:

**Immediate Actions (This Week)**:
1. Implement rate limiting (2-4 hours)
2. Fix environment variable management (1-2 hours)
3. Clean up test artifacts (30 minutes)

**Short-term Actions (Next Sprint)**:
4. Add interval cleanup (1-2 hours)
5. Add WebSocket connection limits (1 hour)
6. Begin TypeScript migration for backend (1-2 days)

**Medium-term Actions (Next Month)**:
7. Modularize backend into separate route files
8. Add comprehensive test coverage
9. Implement ARIA labels for accessibility

These improvements will significantly enhance security, performance, and maintainability while maintaining backward compatibility and following modern engineering best practices.
