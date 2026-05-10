# journal features expansion plan v2

## overview
add robust gamification and journaling features from top apps like daylio, habitica, finch, notion.

## current state (analyzed from journal.tsx)
- mood tracking: 6 moods with emoji
- emotion tracking: 40+ emotions, searchable, color customizable
- activity tracking: 28 activities, searchable, color customizable
- notes: free-form text
- daily prompts: 30 prompts, random daily
- quotes: 15 motivational quotes
- gamification: streak counter, entry count, 15 achievements defined
- calendar: basic month view with mood emoji
- stats: minimal (streak + entry count)
- breathing exercise: component exists but not accessible in UI

## new features to implement

### phase 1: xp & leveling system (high engagement)
1. **xp system**
   - earn 10xp for each journal entry
   - earn 5xp for maintaining streak
   - earn 15xp for completing daily goals
   - level up every 100xp
   - display current level and progress bar

2. **level badges**
   - level 1-5: beginner (🌱🌿🌳🌸🍎)
   - level 6-10: intermediate (⭐🌟💫✨🔆)
   - level 11-20: advanced (🔥💥🌈🦋🦅)
   - level 21-50: master (👑🏆💎🎖️🎯)
   - level 50+: legend (🚀🌌✨👁️‍🗨️💫)

### phase 2: daily goals system
3. **daily goals**
   - default goals: log mood, add emotions (3+), write note (50+ chars), complete activities (3+)
   - custom goals: add your own daily intentions
   - visual checkmarks for completion
   - progress percentage
   - goals reset each day at midnight

### phase 3: tag system
4. **tag system**
   - add custom tags to entries (e.g., "work", "personal", "health", "gratitude")
   - predefined suggestions based on common journaling tags
   - filter past entries by tags
   - tag cloud showing most used tags
   - autocomplete from existing tags

### phase 4: past entries browser
5. **past entries list**
   - scrollable list of all past entries
   - grouped by month
   - filter by: date range, mood, tags
   - search within entries
   - quick preview on hover
   - edit/delete actions

### phase 5: detailed statistics (recharts)
6. **mood trend chart**
   - line chart showing mood over time
   - toggle: weekly / monthly / yearly view
   - average mood display
   - best/worst days highlighted

7. **emotion frequency chart**
   - bar chart of most logged emotions
   - top 10 emotions
   - emotion word cloud

8. **activity breakdown chart**
   - pie chart of activities distribution
   - bar chart for daily/weekly comparison
   - most productive day analysis

9. **mood distribution**
   - pie/donut chart of mood frequency
   - percentage breakdown
   - mood patterns by day of week

10. **streak statistics**
    - current streak
    - longest streak ever
    - streak calendar heatmap
    - streak milestones (7, 14, 30, 60, 90, 100, 365 days)

### phase 6: reflection timer
11. **journaling timer**
    - preset options: 3min, 5min, 10min, 15min, custom
    - countdown display with progress ring
    - gentle notification when time's up
    - optional writing prompt countdown
    - pause/resume functionality

### phase 7: achievements system
12. **achievement unlocks**
    - real achievement tracking and unlocking
    - celebration animation on unlock
    - achievement progress indicators
    - categories: consistency, creativity, exploration, wellness

### phase 8: wellness features
13. **breathing exercise access**
    - add breathing button to main UI
    - 4-7-8 technique (already exists)
    - box breathing option (4-4-4-4)
    - session history tracking

14. **mood reminder notifications**
    - schedule daily check-in reminders
    - morning/afternoon/evening options

### phase 9: export & backup
15. **enhanced export**
    - csv export (already exists)
    - json backup
    - date range selection for export
    - include/exclude fields option

## implementation priorities

### must have (phase 1-3):
- xp & leveling system
- daily goals
- tag system
- past entries browser
- detailed stats with charts

### should have (phase 4-6):
- reflection timer
- achievement system
- breathing exercise access

### nice to have (phase 7-9):
- mood reminders
- enhanced export options

## implementation notes
- all new features must be fully production-ready
- use existing recharts library (already imported)
- use localStorage for persistence of new features
- maintain lowercase for all UI text and comments
- ensure responsive design
- no placeholders - full implementation
- integrate smoothly with existing UI
- add proper loading states and error handling

