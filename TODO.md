# Fix displayname update bug and improve table header styling

## Files with Console Statements to Replace (Phase 1 Security)
- [ ] `src/hooks/use-canvas-layout.ts` - 3 console statements
- [ ] `src/hooks/use-theme-reactor.ts` - 2 console statements
- [ ] `src/hooks/use-semantic-search.ts` - 2 console statements
- [ ] `src/hooks/use-socket.ts` - 3 console statements
- [ ] `src/hooks/use-collections.ts` - 3 console statements
- [ ] `src/hooks/use-app-setting.ts` - 3 console statements
- [ ] `src/api/sync-service.ts` - 1 commented console
- [ ] `src/api/nocobase-client.ts` - 1 console.log
- [ ] `src/api/ollama-client.ts` - 1 console.error
- [ ] `src/lib/api-client-refactored.ts` - 1 console.error
- [ ] `src/lib/context-builder.ts` - 1 console.error
- [ ] `src/lib/secure-logger.ts` - Uses console internally (expected)
- [ ] `src/lib/link-registry.ts` - 2 console.error
- [ ] `src/lib/sanitize-utils.ts` - 1 console.warn
- [ ] `src/lib/utils.ts` - 1 console.warn
- [ ] `src/hide-dupemates-pages.ts` - 3 console statements
- [ ] `src/components/editor/command-actions.ts` - 1 console.warn
- [ ] `src/components/editor/slash-command.ts` - 2 console.error/warn

## Performance Optimizations (Phase 2)
- [ ] Add React.memo to remaining pure UI components
- [ ] Replace inline arrow functions in JSX with useCallback
- [ ] Optimize Lucide imports (tree-shaking) in remaining files
- [ ] Add useMemo for expensive computations

## Type Safety Improvements (Phase 3)
- [ ] Replace `: any` types with proper interfaces (77 instances found)
- [ ] Fix implicit any parameters
- [ ] Add proper return types to functions

## Memory Leak Prevention (Phase 4)
- [ ] Review useEffect cleanup functions
- [ ] Ensure socket connections are properly closed
- [ ] Clear timeouts/intervals on unmount

## Bundle Size Optimizations (Phase 5)
- [ ] Replace `* as LucideIcons` with named imports
- [ ] Dynamic import for heavy components
- [ ] Code splitting opportunities

## Developer Experience (Phase 6)
- [ ] Add JSDoc comments to public APIs
- [ ] Standardize error handling patterns
- [ ] Add loading states for async operations

## Complex Files to Restore (Too Many Errors)
- [x] `src/pages/template.tsx` - Restored from git
- [x] `src/features/houseofmates-builder/components/WidgetPropertyEditor.tsx` - Restored from git
- [x] `src/features/houseofmates-builder/components/WebsiteElements.tsx` - Restored from git

# Complete Codebase Optimization TODO

- [ ] src/features/blog-builder/components/BlogPostCard.tsx - BlogPostCard
- [ ] src/components/ui/badge.tsx - Badge
- [ ] src/components/ui/avatar.tsx - Avatar, AvatarImage, AvatarFallback
- [ ] src/components/ui/separator.tsx - Separator
- [ ] src/components/ui/skeleton.tsx - Skeleton

### 2.2 Implement Dynamic Imports for Heavy Features
- [ ] src/App.tsx - Lazy load Canvas, Editor, Charts
- [ ] src/pages/template.tsx - Lazy load Monaco Editor
- [ ] src/features/edgeless/components/EdgelessCanvas.tsx - Dynamic import fabric.js
- [ ] src/components/editor/ - Dynamic import TipTap extensions

### 2.3 Add Virtual Scrolling for Large Lists
- [ ] src/features/records/components/record-gallery.tsx - Add react-window
- [ ] src/features/blog-builder/components/BlogGallery.tsx - Add react-window
- [ ] src/features/houseofmates-builder/components/WebsiteElements.tsx - Add virtualization

## Phase 3: Bundle Size Optimizations 📦 - IN PROGRESS

### 3.1 Optimize Lucide Icon Imports
- [ ] src/pages/template.tsx - Remove unused icons
- [ ] src/pages/root-layout.tsx - Remove unused icons
- [ ] src/pages/moodboard.tsx - Remove unused icons
- [ ] src/pages/databases.tsx - Remove unused icons
- [ ] src/features/houseofmates-builder/HouseofmatesBuilder.tsx - Remove unused icons
- [ ] Create dynamic icon loader utility

### 3.2 Remove Duplicate Dependencies
- [ ] Audit date-fns vs native Date usage
- [ ] Consolidate lodash imports (use specific functions)

## Phase 4: Memory & Reliability 🛡️ - IN PROGRESS

### 4.1 Fix Event Listener Cleanup
- [ ] src/pages/drawing-page.tsx - Fix setInterval cleanup
- [ ] src/pages/drawing-page-refactored.tsx - Fix setInterval cleanup
- [ ] src/contexts/llm-context.tsx - Fix setInterval cleanup
- [ ] src/features/houseofmates-builder/HouseofmatesBuilder.tsx - Fix window event listeners
- [ ] src/features/blog-builder/components/BlogCanvas.tsx - Fix window event listeners
- [ ] src/features/edgeless/components/EdgelessCanvas.tsx - Add fabric canvas disposal

### 4.2 Add Error Boundaries
- [ ] src/App.tsx - Add top-level ErrorBoundary
- [ ] src/features/edgeless/components/EdgelessCanvas.tsx - Add CanvasErrorBoundary
- [ ] src/components/editor/ - Add EditorErrorBoundary
- [ ] src/features/dashboard/ - Add DashboardErrorBoundary

### 4.3 Add Request Cancellation
- [ ] src/api/nocobase-client.ts - Add AbortController support
- [ ] src/hooks/use-records.ts - Cancel pending requests
- [ ] src/hooks/use-collections.ts - Cancel pending requests

## Phase 5: Type Safety Improvements 📝 - IN PROGRESS

### 5.1 Replace any Types
- [ ] src/hooks/use-records.ts - 5 any types
- [ ] src/hooks/use-collections.ts - 3 any types
- [ ] src/lib/context-builder.ts - 4 any types
- [ ] src/components/editor/slash-command.ts - 15 any types

### 5.2 Add Strict Null Checks
- [ ] src/api/nocobase-client.ts - Add null checks for API responses
- [ ] src/hooks/use-auth.ts - Add null checks for user
- [ ] src/contexts/fronter-context.tsx - Add null checks for fronter data

## Phase 6: Developer Experience 🛠️ - IN PROGRESS

### 6.1 Standardize Imports
- [ ] Convert all relative imports to @/ alias
- [ ] Sort imports consistently (React, external, internal, types)

### 6.2 Add Loading States
- [ ] Create LoadingSkeleton component
- [ ] Add to all async operations
- [ ] Add error state handling

### 6.3 Add Development Guards
- [ ] Add __DEV__ checks for debug code
- [ ] Remove console.* in production builds

---

## Progress Tracking

**Total Tasks:** 75
**Completed:** 12 (Phase 1)
**In Progress:** 63 (Phases 2-6)

**Last Updated:** 2024

### Implementation Order:
1. ✅ Phase 1: Security (COMPLETE)
2. 🔄 Phase 2: Performance (STARTING)
3. ⏳ Phase 3: Bundle Size
4. ⏳ Phase 4: Memory & Reliability
5. ⏳ Phase 5: Type Safety
6. ⏳ Phase 6: Developer Experience

# Codebase Optimizations TODO

## Phase 1: Security Hardening 🔒

### 1.1 Replace console.* with secureLogger
- [ ] src/stores/llm-store.ts - 3 console statements
- [ ] src/hide-dupemates-pages.ts - 3 console statements
- [ ] src/components/editor/slash-command.ts - 2 console statements
- [ ] src/components/editor/command-actions.ts - 1 console statement
- [ ] src/api/ollama-client.ts - 1 console statement

### 1.2 Enforce safeStorage Wrapper
- [ ] Audit all localStorage.getItem calls
- [ ] Audit all localStorage.setItem calls
- [ ] Audit all localStorage.removeItem calls
- [ ] Replace with safeStorage wrapper

### 1.3 Add API Interceptor Sanitization
- [ ] Add request/response sanitization to api-client.ts
- [ ] Ensure tokens are never logged

## Phase 2: Type Safety 📝

### 2.1 Create Strict API Types
- [ ] Define Collection interface
- [ ] Define Record interface
- [ ] Define Field interface
- [ ] Define API Error types

### 2.2 Replace any Types
- [ ] src/hooks/use-records.ts - 5 any types
- [ ] src/hooks/use-collections.ts - 3 any types
- [ ] src/hooks/use-app-setting.ts - 4 any types
- [ ] src/lib/context-builder.ts - 4 any types
- [ ] src/lib/api-client-refactored.ts - 3 any types

## Phase 3: Performance ⚡

### 3.1 Add React.memo
- [ ] Identify pure components
- [ ] Add memo to list items
- [ ] Add memo to card components
- [ ] Add memo to icon components

### 3.2 Optimize useEffect
- [ ] Fix missing dependency arrays
- [ ] Remove unnecessary effects
- [ ] Add proper cleanup functions
- [ ] Debounce expensive operations

### 3.3 API Optimization
- [ ] Add request deduplication
- [ ] Implement response caching
- [ ] Add request batching
- [ ] Optimize polling intervals

## Phase 4: Reliability 🛡️

### 4.1 Error Boundaries
- [ ] Add ErrorBoundary to App.tsx
- [ ] Add feature-level boundaries
- [ ] Add graceful fallbacks

### 4.2 Retry Logic
- [ ] Add exponential backoff to API calls
- [ ] Add circuit breaker pattern
- [ ] Add offline detection

### 4.3 Naming Conventions
- [ ] Standardize to camelCase for variables
- [ ] Standardize to PascalCase for components
- [ ] Fix inconsistent function names

### 4.4 Loading States
- [ ] Create consistent loading skeletons
- [ ] Add loading state to all async operations
- [ ] Add error state handling

---

## Progress Tracking

**Current Phase:** Phase 1 - Security Hardening

**Completed:** 12/50 tasks

**Last Updated:** 2024

### Summary of Changes Made:

1. **src/api/sync-service.ts** - Replaced 15 console.* calls with secureLogger
2. **src/api/nocobase-client.ts** - Replaced 12 console.* calls with secureLogger, removed @ts-nocheck, added proper TypeScript types
3. **src/api/member-service.ts** - Replaced 8 console.* calls with secureLogger
4. **src/api/setup-public-collections.ts** - Replaced 10 console.* calls with secureLogger
5. **src/utils/sync-headmates.ts** - Replaced 5 console.* calls with secureLogger
6. **src/utils/subdomain-router.ts** - Replaced 5 console.* calls with secureLogger, fixed bug: GetSubdomain -> getSubdomain
7. **src/App.tsx** - Replaced 6 console.* calls with secureLogger

### Total Console Statements Replaced: 61

### Security Improvements:
- All sensitive logging now goes through secureLogger which:
  - Sanitizes messages to remove tokens, API keys, passwords
  - Only logs when user is authenticated or in debug mode
  - Maintains privacy-first approach for DID system
  - Redacts sensitive patterns automatically

### Type Safety Improvements:
- Removed @ts-nocheck from nocobase-client.ts
- Added proper interfaces: Collection, Field, CollectionResponse, ApiError, RequestParams
- Added explicit types to all function parameters and return values
- Fixed implicit 'any' types throughout the client

### Bug Fixes:
- Fixed naming inconsistency in subdomain-router.ts (GetSubdomain -> getSubdomain)

### Next Steps:
- Continue with remaining console.* replacements (5 files remaining)
- Enforce safeStorage wrapper usage
- Add API interceptor sanitization
- Move to Phase 2: Type Safety improvements
- [ ] Run browser tests at `/rag-test` and tune chunk size/overlap
- [ ] Optimize prompts for knowledge work vs chat
- [ ] Test cross-collection references
- formula runtime engine with sandboxed js/dsl
- visual blocks (charts, tables) with inline editing
- realtime collaboration with crdts

### Vulnerability Categories Detected:
1. **Console Logging** - console.log statements that may leak data
2. **Token Storage** - API tokens in localStorage
3. **Missing Headers** - CSP, X-Frame-Options, HSTS
4. **Dependencies** - Outdated packages with known vulnerabilities

- [ ] Open browser dev tools (F12) without logging in - console should be empty/clean
- [ ] Log in with nocobase API key - logs should appear with [PKM] prefix
- [ ] Check Security Widget on dashboard - should show "secure" when authenticated
- [ ] Toggle privacy mode - logs should be suppressed when enabled
- [ ] Click vulnerability in Security Widget - should expand with details
- [ ] Copy LLM prompt - should copy to clipboard
- [ ] Verify no headmate data in console - check fronter-context operations

### Security Verification:
- [ ] No API keys visible in console
- [ ] No tokens in error messages
- [ ] No stack traces with file paths
- [ ] All logs show [sanitized] tag
- [ ] Risk level shows 🔴 when not authenticated
- [ ] Risk level shows 🟢 when authenticated + privacy on

- [ ] verify all if/then color changes work together
- [ ] test value color rules dialog with select and text fields
- [ ] test right-click on url fields
- [ ] test image editor enhancements

1. Complete localStorage optimization
2. Run final verification checks
3. Test in production environment