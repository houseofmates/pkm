# canvas gamification widgets todo
status: 0/100%

## phase 1: journal ts fixes (immediate) ✓
- [x] apps/web/src/components/journal/journal.tsx: cell import, sensory/fixation imports, toggleemotion/activity defs
- [x] apps/web/src/components/journal/fixation-trap.tsx, sensory-hub.tsx: fix '@/components/ui/*' imports
- [x] npm run lint --fix && test no ts errors

## phase 2: widgets dir (5 gamification widgets)
- [ ] streak-widget.tsx (flame badge + streak/xp/row%)
- [ ] mood-ring.tsx (emoji picker → journal quick)
- [ ] pet-status.tsx (3 pets hunger bars)
- [ ] quest-rows.tsx (4 row progress glow)
- [ ] quick-voice.tsx (mic → journal)

## phase 3: nocobase collections
- [ ] gamification_daily: date/streak/xp/mood/rows/pets
- [ ] widget_config: type/pos/size/config

## phase 4: canvas integration
- [ ] edgeless widget-layer: drag from sidebar → oplog
- [ ] realtime data sync via checkpoints

## phase 5: test/deploy
- [ ] drag widgets to canvas homepage
- [ ] responsive/persistent
- [ ] 100%

production-ready canvas gamification widgets
