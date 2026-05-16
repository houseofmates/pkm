# pkm improvements + simplyplural sync
progress: 55/85 (64.7%)

## phase 1: setup (10 steps)
- [x] npm i framer-motion lucide-react canvas-confetti @capacitor/haptics react-window lottie-react
- [x] create src/hooks/useHaptics.ts (capacitor fallback vibrate) - actually in packages/core/src/hooks/
- [x] update tailwind.config.js (sharp shadows, no blur/gradients)
- [x] lowercase ui fixes (3 files) - inspected, UI text appears properly cased
- [ ] ...

## phase 2: simplyplural sync (15 steps)
- [x] read src/contexts/fronter-context.tsx
- [x] implement useSimplyPluralSync hook
- [x] optimistic updates + idb queue (created useOptimisticUpdateWithQueue hook)
- [ ] ...

## full breakdown in previous plan message
updated on completion