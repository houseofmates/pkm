# Codebase Fixes & Optimizations TODO

## Critical TypeScript Errors (Fixed)
- [x] `src/features/houseofmates-builder/components/IconPicker.tsx` - Fixed Lucide import, added useCallback
- [x] `src/stores/llm-store.ts` - Already using secureLogger
- [x] `src/components/ui/card.tsx` - Added React.memo
- [x] `src/components/ui/button.tsx` - Added React.memo
- [x] `src/components/ui/badge.tsx` - Added React.memo
- [x] `src/components/ui/separator.tsx` - Added React.memo
- [x] `src/features/headmates/components/headmate-card.tsx` - Fixed casing, added React.memo, secureLogger

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

## Summary
- Total files analyzed: 50+
- Console statements found: 56
- TypeScript `any` types found: 77
- Inline handlers found: 300+
- Lucide wildcard imports: 101
