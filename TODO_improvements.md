# pkm improvements todo
status: 0/100%

## phase 1: setup (immediate)
- [ ] create src/hooks/useHaptics.ts (capacitor fallback vibrate)
- [ ] update tailwind.config.js (sharp shadows, no blur/gradients)
- [ ] npm i framer-motion lucide-react canvas-confetti @capacitor/haptics react-window lottie-react-lite

## phase 2: core ui/animations (web/apk/appimage)
- [ ] journal.tsx: framer-motion tab transitions (fadeSlide, no blur)
- [ ] gamified-pets.tsx: pet wiggle/bounce microinteractions
- [ ] add streak-widget.tsx (flame + canvas-ready)

## phase 3: haptics (apk/mobile)
- [ ] capacitor.config.ts: add haptics plugin
- [ ] earnXp/completeQuest: Haptics.impact('light'/'success')
- [ ] mobile gestures: long-press emotion picker haptic

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
