# pkm improvements todo
status: 50/100%

## phase 1: setup (immediate)
- [x] create src/hooks/useHaptics.ts (capacitor fallback vibrate) - in packages/core/src/hooks/
- [x] update tailwind.config.js (sharp shadows, no blur/gradients)
- [x] npm i framer-motion lucide-react canvas-confetti @capacitor/haptics react-window lottie-react

## phase 2: core ui/animations (web/apk/appimage)
- [x] journal.tsx: framer-motion tab transitions (fadeSlide, no blur)
- [x] gamified-pets.tsx: pet wiggle/bounce microinteractions
- [x] add streak-widget.tsx (flame + canvas-ready)

## phase 3: haptics (apk/mobile)
- [ ] capacitor.config.ts: add haptics plugin
- [ ] earnXp/completeQuest: Haptics.impact('light'/'success')
- [x] mobile gestures: long-press emotion picker haptic (implemented as tap haptic)

## phase 4: perf (all)
- [ ] lib/perf-utils.ts: react.lazy + react-window virtualization
- [ ] journal past-entries: pagination (perPage=20)
- [ ] canvas: virtual widgets, debounce drags

## phase 5: ux/gestures/electron
- [ ] global spotlight (cmd-k semantic search)
- [ ] electron/main.js: tray notifications level-ups
- [ ] test/deploy: npm run build:releases + lighthouse 100

## phase 6: test/audit
- [ ] bundle analyzer, lighthouse-ci
- [ ] a/b retention test
- [ ] 100%