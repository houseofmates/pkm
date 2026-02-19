# Codebase Fixes TODO

## Phase 1: Security Hardening 🔒

### 1.1 Replace console.* with secureLogger
- [ ] src/stores/llm-store.ts - 3 console statements
- [ ] src/hide-dupemates-pages.ts - 3 console statements
- [ ] src/components/editor/slash-command.ts - 2 console statements
- [ ] src/components/editor/command-actions.ts - 1 console statement
- [ ] src/api/ollama-client.ts - 1 console statement

## Phase 2: Type Safety 📝

### 2.1 Replace any Types
- [ ] src/stores/llm-store.ts - Replace `any` types
- [ ] src/hide-dupemates-pages.ts - Add proper error types
- [ ] src/components/editor/slash-command.ts - Add types for command parameters

## Phase 3: Performance ⚡

### 3.1 Verify Event Listener Cleanup
- [ ] Check files with setInterval/setTimeout/addEventListener
- [ ] Ensure proper cleanup functions

## Progress Tracking

**Started:** In Progress
**Completed:** 0/5 files in Phase 1
