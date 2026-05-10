# pkm comprehensive features - quick reference

## setup (one-time)

```bash
# 1. create all collections
node scripts/setup-comprehensive-collections.cjs

# 2. restart backend
./pkm-control.sh restart

# 3. add to journal page
import { UnifiedDashboard } from '@/components/unified-dashboard';
<UnifiedDashboard />
```

## gamification

**xp system**:
- base: 10xp per activity
- streak bonus: 1.5x multiplier at 7+ days
- milestone: +50xp at 7, 30, 100 days

**levels**: 1-12 (beginner → eternal)
- level 3: midnight theme
- level 5: ocean theme + blue accent
- level 8: forest theme + green accent
- level 10: sunset theme + orange accent
- level 11: aurora theme + purple accent
- level 12: cosmos theme + pink accent

**achievements**:
- first_log: 25xp
- week_streak: 100xp
- month_streak: 500xp
- hundred_logs: 250xp
- level_5: 200xp
- level_10: 1000xp

## activity logging

```tsx
<ActivityLogWidget onLogged={() => console.log('logged')} />
```

- quick-log from journal
- automatic streak tracking
- xp awarded on log
- custom fields per activity

## financial hub

```tsx
<FinancialHub />
```

**views**:
- overview: accounts + monthly summary
- cashflow: sankey flow diagram
- budgets: progress bars (green/yellow/red)
- trends: category breakdown

**budget colors**:
- green: 0-79% spent
- yellow: 80-99% spent
- red: 100%+ spent (over budget)

## mood & energy

```tsx
<MoodLogger onLogged={() => {}} />
<EnergyBattery onLogged={() => {}} />
<EnergyCorrelations />
```

**mood scale**: 1-5
- 1: terrible (red)
- 2: bad (orange)
- 3: okay (yellow)
- 4: good (green)
- 5: amazing (cyan)

**energy**: 0-100% for physical & mental
- 0-39%: red
- 40-69%: yellow
- 70-100%: green

**correlations**: shows which activities boost energy (requires 3+ logs per activity)

## routines

```tsx
<RoutineChecklist />
```

- morning/evening/custom types
- daily auto-reset
- progress ring visualization
- completion tracking

## database views

**inline syntax**:
```markdown
{{database:activity_logs view:cards limit:5}}
{{database:transactions view:chart groupBy:category}}
{{database:events view:calendar limit:10}}
```

**view types**:
- table: full grid
- cards: pinterest layout
- calendar: date timeline
- chart: bar chart (requires groupBy)
- kanban: columns (requires groupBy)
- list: compact rows

## api endpoints

**gamification**:
```bash
POST /api/gamification/award-xp
GET /api/gamification/stats/:user_id
POST /api/gamification/unlock-achievement
```

**activities**:
```bash
POST /api/activities/log
GET /api/activities/streaks
GET /api/activities/history?days=30
```

**standard nocobase**:
```bash
GET /api/{collection}:list
POST /api/{collection}:create
POST /api/{collection}:update?filterByTk={id}
POST /api/{collection}:destroy?filterByTk={id}
```

## collections

**gamification**:
- user_stats
- achievements
- xp_transactions

**activities** (phase 1):
- activities
- activity_logs
- streaks

**financial**:
- accounts
- transactions
- budgets

**tracking**:
- mood_logs
- energy_logs

**routines**:
- routine_templates
- routine_completions

## ui theme

- background: #050505
- borders: white/10
- text: white (40%, 60%, 70% opacity)
- accents: #f5af12 (yellow), #3c9fdd (blue), #22c55e (green)
- all lowercase
- high contrast

## keyboard shortcuts

none yet - add as needed

## data flow

1. log activity → streak updated → xp awarded
2. check achievements → unlock if met → award bonus xp
3. update user_stats → recalculate level
4. if level up → unlock themes/colors

## performance

- views cache 30s
- correlations calculate on mount
- routines check date on load
- streaks calculate server-side
- xp logs async

## troubleshooting

**collections not found**:
```bash
node scripts/setup-comprehensive-collections.cjs
```

**backend not responding**:
```bash
./pkm-control.sh restart
./pkm-control.sh logs
```

**xp not awarding**:
- check user_id matches
- verify authorization header
- check backend logs

**streaks not updating**:
- verify date format (yyyy-mm-dd)
- check timezone consistency
- ensure activity_id exists

## example workflow

1. open journal
2. click dashboard button (bottom-right)
3. log activity → xp awarded, streak updated
4. log mood → track emotional state
5. log energy → see correlations
6. check routines → complete items
7. view financial → track spending
8. close dashboard → continue journaling

## integration with journal

```tsx
import { UnifiedDashboard } from '@/components/unified-dashboard';
import { DatabaseView } from '@/components/database-view-renderer';

function JournalPage() {
  return (
    <>
      {/* floating dashboard button */}
      <UnifiedDashboard />
      
      {/* inline database views in markdown */}
      <DatabaseView 
        collection="activity_logs" 
        view="cards" 
        limit={5}
      />
    </>
  );
}
```

## next features (future)

- ai-powered insights
- habit predictions
- goal tracking
- social sharing
- export reports
- mobile app sync

all features production-ready for pop!_os/ubuntu environment.
