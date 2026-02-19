# Codebase Fixes TODO

## Phase 1: Security Hardening 🔒 - COMPLETED ✅

### 1.1 Replace console.* with secureLogger
- [x] src/stores/llm-store.ts - 2 console statements replaced with secureLogger
- [x] src/hide-dupemates-pages.ts - 4 console statements replaced with secureLogger
- [x] src/components/editor/slash-command.ts - 2 console statements replaced with secureLogger
- [x] src/components/editor/command-actions.ts - 1 console statement replaced with secureLogger
- [x] src/api/ollama-client.ts - 1 console statement replaced with secureLogger

## Phase 2: Type Safety & Casing Fixes 📝 - COMPLETED ✅

### 2.1 Fixed Files
- [x] src/features/edgeless/components/Toolbar.tsx - Fixed casing (startLongPress, timerRef, useEdgelessStore, handleClickOutside)
- [x] src/lib/sanitize-utils.ts - Fixed function name casing (redact, sanitizeObject, looksLikeSecret)
- [x] src/components/global-search-dialog.tsx - Fixed Array, forEach, searchResults, Separator casing

## Summary

All critical security and type safety issues have been addressed:

1. **Security**: All console.* statements replaced with secureLogger which sanitizes sensitive data (tokens, API keys, passwords) and respects privacy mode settings for DID system compliance.

2. **Type Safety**: Fixed casing inconsistencies across multiple files to ensure proper TypeScript compilation.

3. **Code Quality**: Maintained consistent naming conventions (camelCase for variables/functions, PascalCase for components/types).
