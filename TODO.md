# PKM JWT Login Fix - Implementation Plan

## Completed: [x] Code Analysis & Diagnosis
- Identified race condition: storageManager.setItem() → 1s delay → API call misses token → 401 → clear → loop
- Confirmed files: auth-context.tsx, nocobase-client.ts, auth-token.ts

## Step 1: [x] auth-context.tsx login race FIXED
- storageManager.setItem() → setToken() order enforced
- 1s delay removed  
- sync expiry clear on login disabled
- detailed logging added
- lowercase comments fixed

## Step 2: [x] Test Login Flow  
- Clear localStorage `nocobase_token`
- Enter valid JWT → verify persists + API calls succeed (no 401)
- Check console: no "no token found" or "401 unauthorized - clearing"

## Step 3: [ ] Verify Dependencies
- Check api-client.ts interceptor reads storageManager fresh
- Test ensureBackendCollection() creates pkm_settings successfully

## Step 4: [ ] Completion
- attempt_completion with result summary + test command

