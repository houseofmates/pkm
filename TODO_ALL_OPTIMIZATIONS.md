# Complete Codebase Optimization TODO

## Phase 1: Security Hardening 🔒 - COMPLETED ✅
- [x] Replace console.* with secureLogger (61 statements across 12 files)
- [x] Add TypeScript types to nocobase-client.ts
- [x] Fix naming conventions (camelCase)

## Phase 2: Performance Optimizations ⚡ - IN PROGRESS

### 2.1 Add React.memo to Pure Components
- [ ] src/components/ui/card.tsx - Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter
- [ ] src/components/ui/button.tsx - Button
- [ ] src/features/headmates/components/headmate-card.tsx - HeadmateCard
- [ ] src/features/collections/components/collection-card.tsx - CollectionCard
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
- [ ] src/hooks/use-app-setting.ts - 4 any types
- [ ] src/lib/context-builder.ts - 4 any types
- [ ] src/stores/llm-store.ts - 2 any types
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
