# gamified pkm journal hub implementation todo

status: approved by user. voice input added (whisper + qwen2.5-coder:7b-instruct-q4_K_S local post-processing).

## phase 1: gamify core journal (today)
- [ ] edit src/components/journal/journal.tsx: add sidebar (daily quests, exercise, finances, pets, world), xp bar/badge, achievement wall
- [ ] implement daily quests grid (4x4 oral-b style: drag-complete, row bonuses)
- [ ] recharts stats dashboard (mood heatmap, xp trends, completion pie)
- [ ] new zustand store: useGamification (xp, levels, streaks, daily reset @midnight)

## phase 2: new trackers (tomorrow)
- [ ] create src/components/journal/exercise-tracker.tsx (body heatmap, muscle levels, charts)
- [ ] create src/components/journal/financial-hub.tsx (dashboards: balance pie/tree, wealth levels, budget bars)
- [ ] create src/components/journal/gamified-pets.tsx (adopt/feed/evolve, streak reactions)
- [ ] create src/components/journal/world-builder.tsx (procedural map, quest spawns, unlocks)

## phase 3: voice input (day after)
- [ ] create src/components/journal/voice-input.tsx: detect platform (pixel/grapheneos vs ubuntu), web speech api fallback, whisper model prompt if offline
- [ ] ollama client integration: post-whisper to qwen2.5-coder:7b-instruct-q4_K_S@192.168.4.233:11434 (lowercase/clean umms/reformat)
- [ ] integrate into journal notes/quests (mic button)

## phase 4: integrations & polish
- [ ] new nocobase collections: daily_quests/exercises/finances/pets/world_progress/user_levels (via setup-life-os-schema.cjs)
- [ ] dashboard widgets: JournalGamifiedHub, ExerciseSummaryCard, FinanceBalanceCard
- [ ] responsive mobile/desktop, pwa notifications, tests (vitest)
- [ ] animations (confetti unlocks, pet dances), sensory optimizations

## completion criteria
- localhost:3000 → journal tab → full gamified hub with voice working online/offline
- daily reset persists via localstorage/nocobase
- all ui lowercase, canvas-draggable
- attempt_completion with demo command

