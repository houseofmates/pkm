# journal features expansion plan

## overview
add robust gamification and journaling features from top apps like daylio, habitica, finch, and notion.

## current features (already implemented)
- mood tracking (6 moods)
- emotion tracking (40+ emotions)
- activity tracking (28 activities)
- free-form notes
- daily prompts
- motivational quotes
- streak counter
- entry count
- 10 achievements
- color customization
- quick mood check-in
- stats panel (basic)
- calendar button (placeholder)

## new features to implement

### phase 1: calendar & history (high impact)
1. **mood calendar view**
   - display calendar with mood-colored dots for each day
   - click day to view/edit entry
   -

2. ** navigate monthspast entries browser**
   - list view of all past entries
   - filter by date, mood, tags
   - search entries

### phase 2: statistics & insights (high impact)
3. **mood trend chart**
   - line chart showing mood over time (weekly/monthly)
   - using recharts library

4. **emotion frequency chart**
   - bar chart of most used emotions

5. **activity breakdown chart**
   - pie/bar chart of activities

6. **mood distribution**
   - pie chart of mood frequency

### phase 3: gamification (engagement)
7. **xp/points system**
   - earn xp for: entry (10xp), streak day (5xp), achieving goal (15xp)
   - level up every 100xp
   - display level badge

8. **daily goals**
   - set goals: log mood, add emotions, write note, complete activities
   - track completion with checkmarks

9. **streak milestones**
   - visual celebration for 7, 14, 30, 60, 90, 100, 365 day streaks

### phase 4: organization
10. **tag system**
    - add custom tags to entries
    - filter by tags
    - popular tags suggestions

### phase 5: wellness
11. **breathing exercise**
    - 4-7-8 breathing technique modal
    - animated circle

12. **reflection timer**
    - timed journaling prompts (3min, 5min, 10min)
    - countdown timer

## implementation notes
- all new features must be fully production-ready
- use existing recharts library
- use localStorage for persistence of new features
- maintain lowercase for all UI text and comments
- ensure responsive design
- no placeholders - full implementation

