# PKM Security Improvements - Implementation Checklist

Use this checklist to track implementation of the critical security and performance improvements.

## Pre-Implementation

- [ ] Read `AUDIT_EXECUTIVE_SUMMARY.md` for overview
- [ ] Read `CODEBASE_AUDIT_REPORT.md` for detailed analysis
- [ ] Backup current `.env` file: `cp .env .env.backup`
- [ ] Ensure git working directory is clean: `git status`
- [ ] Create feature branch: `git checkout -b feature/security-improvements`

---

## Phase 1: Immediate Improvements (Week 1)

### 1.1 Install Dependencies

- [ ] Navigate to backend package: `cd packages/backend`
- [ ] Install required packages:
  ```bash
  npm install express-rate-limit dotenv zod
  ```
- [ ] Verify installation: `npm list express-rate-limit dotenv zod`
- [ ] Update package.json: `git add package.json`

**Status**: ⏳ Pending  
**Estimated Time**: 15 minutes

---

### 1.2 Add Environment Validation

- [ ] Copy `packages/backend/env-validator.js` (already created)
- [ ] Update `packages/backend/server.js` lines 36-54:
  - Remove manual .env parsing (lines 37-54)
  - Add import: `import { loadEnvironment } from './env-validator.js';`
  - Add call: `const env = loadEnvironment();`
- [ ] Copy `.env.example` to root
- [ ] Update `.env` with required values:
  - [ ] Set `ADMIN_SECRET` (min 16 chars)
  - [ ] Set `BROADCAST_AUTH_KEY` (min 16 chars)
  - [ ] Set `NOCOBASE_URL`
  - [ ] Set `NOCOBASE_API_KEY`
- [ ] Test validation:
  ```bash
  unset ADMIN_SECRET
  npm run backend
  # Should fail with clear error
  ```

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour  
**Risk**: LOW

---

### 1.3 Add Rate Limiting

- [ ] Copy `packages/backend/rate-limiter.js` (already created)
- [ ] Update `packages/backend/server.js` after line 64:
  - Add import: `import { createRateLimiters } from './rate-limiter.js';`
  - Initialize limiters: `const { generalLimiter, aiLimiter, authLimiter, uploadLimiter } = createRateLimiters();`
  - Apply middleware:
    ```javascript
    app.use('/api/', generalLimiter);
    app.use('/api/ai/', aiLimiter);
    app.use('/api/auth/', authLimiter);
    app.use('/api/notion-import', uploadLimiter);
    app.use('/api/csv-import', uploadLimiter);
    ```
- [ ] Test rate limiting:
  ```bash
  for i in {1..105}; do
      curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/api/test
  done
  # Should see 429 after 100 requests
  ```
- [ ] Verify rate limit headers in response:
  ```bash
  curl -I http://localhost:4100/api/test
  # Should see X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  ```

**Status**: ⏳ Pending  
**Estimated Time**: 2 hours  
**Risk**: LOW

---

### 1.4 Add WebSocket Connection Limits

- [ ] Update `packages/backend/server.js` Socket.IO initialization:
  - Add constants: `MAX_CONNECTIONS`, `CONNECTION_TIMEOUT_MS`, `activeConnections`
  - Add `maxHttpBufferSize` and `perMessageDeflate` options
  - Add connection limiting middleware: `io.use((socket, next) => { ... })`
  - Add connection tracking in `io.on('connection', ...)`
  - Add stale connection cleanup with `setInterval`
  - Add disconnect handler to decrement counter
  - Add error handler
- [ ] Test connection limiting:
  ```bash
  # Monitor connection count
  grep "WebSocket" logs/backend.log | tail -20
  
  # Test with multiple connections
  for i in {1..1005}; do
      wscat -c ws://localhost:4100 &
  done
  # Should reject after 1000
  ```

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour  
**Risk**: LOW

---

### 1.5 Clean Up Test Artifacts

- [ ] Make cleanup script executable:
  ```bash
  chmod +x scripts/cleanup-test-artifacts.sh
  ```
- [ ] Run cleanup script:
  ```bash
  ./scripts/cleanup-test-artifacts.sh
  ```
- [ ] Verify cleanup:
  ```bash
  find packages/core -name "test-notion-*" | wc -l  # Should be 0
  find packages/core -name "sample-*.zip" | wc -l   # Should be 0
  ```
- [ ] Commit changes:
  ```bash
  git add .gitignore
  git commit -m "chore: clean up test artifacts"
  ```

**Status**: ⏳ Pending  
**Estimated Time**: 30 minutes  
**Risk**: NONE

---

## Phase 2: Short-term Improvements (Week 2)

### 2.1 Fix Interval Cleanup in use-drawing.ts

- [ ] Open `packages/core/src/hooks/use-drawing.ts`
- [ ] Add cleanup to first interval (line 99):
  ```typescript
  useEffect(() => {
      syncIntervalRef.current = setInterval(checkStatus, 2000);
      
      return () => {
          if (syncIntervalRef.current) {
              clearInterval(syncIntervalRef.current);
              syncIntervalRef.current = null;
          }
      };
  }, []);
  ```
- [ ] Add cleanup to second interval (line 151):
  ```typescript
  useEffect(() => {
      const interval = setInterval(checkAndSave, 5000);
      
      return () => {
          clearInterval(interval);
      };
  }, []);
  ```
- [ ] Test for memory leaks:
  - Open Chrome DevTools Memory tab
  - Navigate to drawing page
  - Take heap snapshot
  - Navigate away and back 10 times
  - Take another heap snapshot
  - Compare - should not see growing interval refs

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour  
**Risk**: LOW

---

### 2.2 Fix Interval Cleanup in use-app-setting.ts

- [ ] Open `packages/core/src/hooks/use-app-setting.ts`
- [ ] Add cleanup to interval (line 104):
  ```typescript
  useEffect(() => {
      const interval = setInterval(fetchSetting, pollIntervalMs);
      
      return () => {
          clearInterval(interval);
          if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
          }
      };
  }, [pollIntervalMs]);
  ```

**Status**: ⏳ Pending  
**Estimated Time**: 30 minutes  
**Risk**: LOW

---

### 2.3 Fix Interval Cleanup in use-hibernation-streak.ts

- [ ] Open `packages/core/src/hooks/use-hibernation-streak.ts`
- [ ] Add cleanup to interval (line 112):
  ```typescript
  useEffect(() => {
      const interval = setInterval(checkStreak, 60 * 60 * 1000);
      
      return () => {
          clearInterval(interval);
      };
  }, []);
  ```

**Status**: ⏳ Pending  
**Estimated Time**: 30 minutes  
**Risk**: LOW

---

## Phase 3: Testing & Validation

### 3.1 Local Testing

- [ ] Start backend: `npm run backend`
- [ ] Verify no startup errors
- [ ] Test rate limiting (see 1.3)
- [ ] Test environment validation (see 1.2)
- [ ] Test WebSocket limits (see 1.4)
- [ ] Monitor console for errors
- [ ] Check memory usage over 30 minutes

**Status**: ⏳ Pending

---

### 3.2 Staging Deployment

- [ ] Commit all changes:
  ```bash
  git add .
  git commit -m "feat: add rate limiting and security improvements"
  ```
- [ ] Push to staging: `git push origin staging`
- [ ] Monitor staging logs for 24 hours
- [ ] Check for rate limit triggers: `grep "429" logs/access.log | wc -l`
- [ ] Verify WebSocket connections stable
- [ ] Test all API endpoints
- [ ] Get user feedback

**Status**: ⏳ Pending

---

### 3.3 Production Deployment

- [ ] Schedule maintenance window
- [ ] Notify users (if needed)
- [ ] Deploy to production: `git push origin main`
- [ ] Monitor logs closely for 1 hour
- [ ] Check error rates: `grep "5[0-9][0-9]" logs/access.log | wc -l`
- [ ] Verify rate limit headers in production
- [ ] Monitor memory usage
- [ ] Check WebSocket connection counts
- [ ] Keep monitoring for 48 hours

**Status**: ⏳ Pending

---

## Phase 4: Post-Implementation

### 4.1 Monitoring Setup

- [ ] Set up alerts for:
  - Rate limit hits > 100/hour (warning)
  - Rate limit hits > 500/hour (critical)
  - WebSocket rejections > 10/hour (warning)
  - API 5xx errors > 1% (warning)
  - API 5xx errors > 5% (critical)
  - Memory usage > 80% (warning)
  - Memory usage > 90% (critical)

**Status**: ⏳ Pending

---

### 4.2 Documentation

- [ ] Update README with new environment variables
- [ ] Document rate limiting behavior for API users
- [ ] Add monitoring dashboard
- [ ] Create runbook for rate limit issues
- [ ] Update API documentation with rate limits

**Status**: ⏳ Pending

---

### 4.3 Team Training

- [ ] Review changes with team
- [ ] Explain rate limiting strategy
- [ ] Show how to adjust limits if needed
- [ ] Demonstrate monitoring tools
- [ ] Review rollback procedure

**Status**: ⏳ Pending

---

## Rollback Plan (If Issues Occur)

- [ ] Revert code changes:
  ```bash
  git revert HEAD
  ```
- [ ] Remove new dependencies:
  ```bash
  cd packages/backend
  npm uninstall express-rate-limit dotenv zod
  ```
- [ ] Restore old .env:
  ```bash
  mv .env.backup .env
  ```
- [ ] Restart service:
  ```bash
  npm run backend
  ```
- [ ] Verify service is running
- [ ] Monitor for 1 hour

---

## Success Criteria

Implementation is successful when:

- [x] All dependencies installed without errors
- [ ] Environment validation passes on startup
- [ ] Rate limiting working (429 after limit)
- [ ] WebSocket connections limited to 1000
- [ ] No memory leaks from intervals
- [ ] Zero test artifacts in repository
- [ ] Production error rate < 1%
- [ ] No user complaints about rate limiting
- [ ] Monitoring alerts configured
- [ ] Team trained on new features

---

## Timeline

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Install dependencies | 15 min | P0 |
| Environment validation | 1 hour | P0 |
| Rate limiting | 2 hours | P0 |
| WebSocket limits | 1 hour | P0 |
| Test artifact cleanup | 30 min | P0 |
| Interval cleanup (drawing) | 1 hour | P1 |
| Interval cleanup (app-setting) | 30 min | P1 |
| Interval cleanup (hibernation) | 30 min | P1 |
| Local testing | 2 hours | P0 |
| Staging deployment | 24 hours monitoring | P0 |
| Production deployment | 48 hours monitoring | P0 |
| **Total** | **~35 hours** | |

**Recommended Schedule**:
- Day 1: Phase 1 (4.5 hours)
- Day 2: Phase 2 (2 hours) + local testing
- Day 3-4: Staging deployment and monitoring
- Day 5: Production deployment (if staging successful)

---

## Notes

- All new files have been created and are ready to use
- Follow implementation guide for detailed code examples
- Keep rollback plan handy during deployment
- Monitor closely for 48 hours after production deployment
- Adjust rate limits based on actual usage patterns

---

## Sign-off

- [ ] Developer: _________________ Date: _______
- [ ] Code Reviewer: _________________ Date: _______
- [ ] QA Tester: _________________ Date: _______
- [ ] DevOps: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______

---

**Last Updated**: 2026-04-04  
**Next Review**: 2026-04-11 (after implementation)
