# universal activity logger & streak system

phase 1 implementation: low-friction activity tracking with streak visualization.

## architecture

uses the "activity registry + separate logs" approach:

- **activities** collection: defines what can be logged (name, category, icon, color, custom fields)
- **activity_logs** collection: individual log entries with timestamp and flexible data
- **streaks** collection: tracks consecutive days per activity

## setup

1. run the setup script to create nocobase collections:

```bash
cd /home/house/pkm
node scripts/setup-activity-logger.cjs
```

2. backend routes are already integrated into `packages/backend/server.js`

3. restart the backend:

```bash
./pkm-control.sh restart
```

## usage

### from journal

the activity log widget can be triggered inline from journal entries:

```tsx
import { ActivityLogWidget } from '@/components/activity-log-widget';

// in your journal component:
<ActivityLogWidget onLogged={() => console.log('activity logged!')} />
```

### api endpoints

**log activity**:
```bash
POST /api/activities/log
Authorization: Bearer <token>
Content-Type: application/json

{
  "activity_id": 1,
  "activity_name": "exercise",
  "values": { "reps": 10, "sets": 3 },
  "notes": "felt good today"
}
```

**get streaks**:
```bash
GET /api/activities/streaks
Authorization: Bearer <token>
```

**get history**:
```bash
GET /api/activities/history?activity_id=1&days=30
Authorization: Bearer <token>
```

## components

### ActivityLogWidget

inline widget for quick-logging activities. shows all loggable activities with current streaks.

props:
- `onClose?: () => void` - callback when widget closes
- `onLogged?: () => void` - callback after successful log

### StreakCounter

displays current and longest streak for an activity with visual feedback.

props:
- `activityId?: number` - activity to show streak for
- `activityName?: string` - display name
- `compact?: boolean` - minimal display mode

## streak logic

- consecutive days: logging on consecutive days increases streak
- same day: logging multiple times on same day doesn't affect streak
- broken streak: missing a day resets streak to 1
- record tracking: longest streak is preserved separately

## visual feedback

- 🔥 fire emoji for active streaks
- yellow highlight for current records
- milestone messages at 7, 30+ days
- toast notifications on log with streak info

## extending

to add custom fields to an activity:

1. update the activity record in nocobase with `default_fields`:
```json
{
  "default_fields": {
    "reps": { "type": "number", "label": "repetitions" },
    "duration": { "type": "number", "label": "minutes" },
    "completed": { "type": "boolean", "label": "finished" }
  }
}
```

2. the widget will automatically render form fields based on the schema

## next steps (future phases)

- gamification: xp, achievements, levels
- multiple view types: chart, kanban, calendar
- financial hub integration
- correlation insights
- ai-powered suggestions
