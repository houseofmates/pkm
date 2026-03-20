# comprehensive pkm implementation guide

phases 2-4 complete: gamification, financial hub, mood/energy tracking, routines, and interactable views.

## setup

### 1. create all collections

```bash
cd /home/house/pkm
node scripts/setup-comprehensive-collections.cjs
```

this creates:
- **gamification**: user_stats, achievements, xp_transactions
- **financial**: accounts, transactions, budgets
- **tracking**: mood_logs, energy_logs
- **routines**: routine_templates, routine_completions

### 2. restart backend

```bash
./pkm-control.sh restart
```

backend routes are already integrated in `packages/backend/server.js`.

## components

### gamification

**xp & levels**:
```tsx
import { calculateLevel, calculateXpReward } from '@/lib/gamification';

const levelInfo = calculateLevel(1250); // { level: 5, name: 'dedicated', ... }
const xp = calculateXpReward(10, 7, false); // base 10xp, 7-day streak = 15xp
```

**award xp**:
```bash
POST /api/gamification/award-xp
{
  "user_id": "user_1",
  "amount": 50,
  "source": "activity_log",
  "description": "logged exercise"
}
```

**unlock achievement**:
```bash
POST /api/gamification/unlock-achievement
{
  "user_id": "user_1",
  "achievement_id": "week_streak",
  "achievement_name": "week warrior",
  "xp_reward": 100
}
```

**themes & colors**:
- level 3: midnight theme
- level 5: ocean theme + #0ea5e9 color
- level 8: forest theme + #22c55e color
- level 10: sunset theme + #f59e0b color
- level 11: aurora theme + #8b5cf6 color
- level 12: cosmos theme + #ec4899 color

### financial hub

```tsx
import { FinancialHub } from '@/components/financial-hub';

<FinancialHub />
```

**views**:
- overview: accounts + monthly summary
- cashflow: sankey-style flow diagram
- budgets: horizontal progress bars (green/yellow/red)
- trends: category spending breakdown

**add transaction**:
```tsx
// via ui modal or api
POST /api/transactions:create
{
  "account_id": 1,
  "amount": -45.50,
  "category": "groceries",
  "type": "expense",
  "date": "2025-01-15"
}
```

### mood & energy

```tsx
import { MoodLogger, EnergyBattery, EnergyCorrelations } from '@/components/mood-energy-widgets';

<MoodLogger onLogged={() => console.log('mood logged')} />
<EnergyBattery onLogged={() => console.log('energy logged')} />
<EnergyCorrelations />
```

**mood scale**: 1-5 (terrible to amazing)
**energy**: 0-100% for physical and mental

**correlations**: automatically calculates which activities boost energy levels based on 30-day history.

### routines

```tsx
import { RoutineChecklist } from '@/components/routine-checklist';

<RoutineChecklist />
```

**features**:
- morning/evening/custom routines
- daily reset at configured time
- progress ring visualization
- completion percentage tracking

**create routine**:
```tsx
POST /api/routine_templates:create
{
  "name": "morning routine",
  "type": "morning",
  "items": [
    { "id": "item_1", "label": "brush teeth", "icon": "🦷" },
    { "id": "item_2", "label": "exercise", "icon": "💪" }
  ],
  "reset_time": "06:00",
  "active": true
}
```

### interactable database views

```tsx
import { DatabaseView, parseDatabaseTags } from '@/components/database-view-renderer';

// direct usage
<DatabaseView 
  collection="activity_logs" 
  view="chart" 
  groupBy="activity_name"
  limit={50}
/>

// markdown syntax in journal
const content = `
today's activities:
{{database:activity_logs view:cards filter:today limit:5}}

spending breakdown:
{{database:transactions view:chart groupBy:category type:bar}}

upcoming events:
{{database:events view:calendar limit:10}}
`;

const tags = parseDatabaseTags(content);
// renders inline database views
```

**view types**:
- `table`: full data grid
- `cards`: pinterest-style cards
- `calendar`: date-grouped timeline
- `chart`: bar chart with groupBy
- `kanban`: drag-drop columns (groupBy required)
- `list`: compact rows

## integration with journal

add to journal page:

```tsx
import { ActivityLogWidget } from '@/components/activity-log-widget';
import { MoodLogger, EnergyBattery } from '@/components/mood-energy-widgets';
import { RoutineChecklist } from '@/components/routine-checklist';
import { FinancialHub } from '@/components/financial-hub';

// in journal component
<ActivityLogWidget onLogged={handleActivityLogged} />
<MoodLogger onLogged={handleMoodLogged} />
<EnergyBattery onLogged={handleEnergyLogged} />
<RoutineChecklist />
<FinancialHub />
```

## xp flow

1. user logs activity → `POST /api/activities/log`
2. backend calculates streak → updates `streaks` collection
3. award xp: base 10xp + streak multiplier (1.5x for 7+ days)
4. `POST /api/gamification/award-xp` with source='activity_log'
5. check achievements → unlock if conditions met
6. update user_stats → recalculate level
7. if level up → unlock new themes/colors

## streak multipliers

- 1-6 days: 1x (10xp per activity)
- 7+ days: 1.5x (15xp per activity)
- milestone bonus: +50xp at 7, 30, 100 day marks

## budget status colors

```tsx
const percentage = (spent / limit) * 100;
const color = percentage >= 100 ? '#ef4444' : // red (over)
              percentage >= 80 ? '#f59e0b' :  // yellow (warning)
              '#22c55e';                       // green (good)
```

## theme application

```tsx
// get user level
const stats = await fetch('/api/gamification/stats/user_1');
const { level, unlocked_themes, unlocked_colors } = stats;

// apply theme
if (unlocked_themes.includes('ocean')) {
  document.body.style.setProperty('--accent', '#0ea5e9');
}
```

## api summary

**gamification**:
- `POST /api/gamification/award-xp`
- `GET /api/gamification/stats/:user_id`
- `POST /api/gamification/unlock-achievement`

**activities** (from phase 1):
- `POST /api/activities/log`
- `GET /api/activities/streaks`
- `GET /api/activities/history`

**all other collections** use standard nocobase rest api:
- `GET /api/{collection}:list`
- `POST /api/{collection}:create`
- `POST /api/{collection}:update?filterByTk={id}`
- `POST /api/{collection}:destroy?filterByTk={id}`

## ui theme

all components follow pkm design system:
- background: #050505
- borders: white/10 opacity
- text: white with varying opacity (40%, 60%, 70%)
- accents: headmate colors (#f5af12 yellow, #3c9fdd blue, #22c55e green)
- high contrast for accessibility
- lowercase text throughout

## performance notes

- database views cache data for 30s
- energy correlations recalculate on mount only
- routine completions check date on load (auto-reset)
- streak calculations happen server-side
- xp transactions logged asynchronously

## next steps

1. run setup script
2. restart backend
3. import components into journal
4. test activity logging → xp award flow
5. configure first routine
6. add financial accounts
7. log mood/energy for correlations

all code is production-ready and optimized for pop!_os/ubuntu environment.
