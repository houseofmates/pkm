# Codebase Fixes and Improvements

## Task List

### High Priority (Security & Critical Issues)
- [x] Fix App.tsx - Replace hardcoded version TODO with proper version handling
- [x] Fix apkUpdater.ts - Remove eval() usage and use safe dynamic imports
- [x] Replace alert() calls with toast notifications in components
- [ ] Fix empty catch blocks to properly handle errors

### Medium Priority (Code Quality)
- [ ] Clean up console.log statements in production code
- [ ] Add proper TypeScript types to replace `any` usage (critical files)
- [ ] Remove unused code and comments
- [ ] Fix ESLint disable comments where possible

### Low Priority (Documentation & Optimization)
- [ ] Update README with detailed architecture explanations
- [ ] Add JSDoc comments to key functions
- [ ] Optimize spatial index usage in edgeless canvas

## Progress Tracking

### Completed
- [x] Created TODO file for tracking
- [x] Fixed App.tsx - Replaced hardcoded version TODO with environment variable
- [x] Created vite-env.d.ts - Added proper TypeScript declarations for Vite environment variables
- [x] Fixed apkUpdater.ts - Removed eval() usage, replaced with safe dynamic import
- [x] Fixed navigation.tsx - Replaced alert() with toast.error() for CSV parsing errors
- [x] Fixed ai-field-button.tsx - Replaced alert() with toast.error() for AI generation errors
- [x] Fixed TableManager.tsx - Replaced alert() with toast notifications for table creation
- [x] Fixed DragHandle.tsx - Replaced alert() with toast.info() for columns extension, fixed prefer-const error
- [x] Fixed template.tsx - Fixed multiple TypeScript errors (case sensitivity, type annotations, API calls, empty catch blocks, unused imports)

### In Progress
- [x] Clean up console.log statements in production code (switched to secureLogger in offline-service)


### Pending
- [ ] Add proper TypeScript types to replace `any` usage (critical files) — in progress (oplog, store, spatial index)
- [ ] Remove unused code and comments
- [x] Fix ESLint disable comments where possible (navigation + canvas layout + encryption)
- [x] Update README with detailed architecture explanations
- [x] Add JSDoc comments to key functions (oplog/canvas-db/store)
- [ ] Optimize spatial index usage in edgeless canvas

## Summary of Changes Made

### Security Fixes
1. **App.tsx**: Removed hardcoded version string, now uses `import.meta.env.VITE_APP_VERSION`
2. **apkUpdater.ts**: Replaced dangerous `eval()` with safe dynamic import using `@ts-expect-error`
3. **vite-env.d.ts**: Created TypeScript declarations for Vite environment variables

### UX Improvements
1. **navigation.tsx**: CSV parsing errors now show toast notifications instead of alerts
2. **ai-field-button.tsx**: AI generation errors now show toast notifications instead of alerts
3. **TableManager.tsx**: Table creation success/error messages now use toast notifications
4. **DragHandle.tsx**: Columns extension message now uses toast.info() instead of alert()

### Code Quality
- All UI text remains lowercase as per project requirements
- Proper error handling with secureLogger for debugging
- Type-safe dynamic imports for optional dependencies
- Fixed empty catch blocks to use proper syntax (`catch { }` instead of `catch (e) { }`)
- Fixed prefer-const error in DragHandle.tsx (changed `let resolvedPos` to `const resolvedPos`)
- Removed unused `useMemo` import from template.tsx
- Fixed case sensitivity issues in template.tsx (function names vs state setters)

### Lint Status
- **Errors**: 0 (all fixed)
- **Warnings**: Reduced from 57 to ~20 (remaining are mostly `any` type warnings in existing code)
