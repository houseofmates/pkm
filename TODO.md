# PKM JWT Login Fix - Implementation Plan

## Completed: [x] Code Analysis & Diagnosis
- Identified race condition: storageManager.setItem() → 1s delay → API call misses token → 401 → clear → loop
- Confirmed files: auth-context.tsx, nocobase-client.ts, auth-token.ts

## Step 1: [ ] Create & Edit auth-context.tsx
- Reorder login(): setToken() BEFORE storageManager.setItem() 
- Remove setTimeout(1000ms) delay around ensureBackendCollection()
- Add logging: confirm token before/after API call
- Lowercase all comments/UI text

## Step 2: [ ] Test Login Flow  
- Clear localStorage `nocobase_token`
- Enter valid JWT → verify persists + API calls succeed (no 401)
- Check console: no "no token found" or "401 unauthorized - clearing"

## Step 3: [ ] Verify Dependencies
- Check api-client.ts interceptor reads storageManager fresh
- Test ensureBackendCollection() creates pkm_settings successfully

## Step 4: [ ] Completion
- attempt_completion with result summary + test command

