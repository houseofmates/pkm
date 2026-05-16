# pocketbase pkm schema
**created**: april 2026
**reason**: replaced nocobase after data loss incident. simpler, single-binary backend for single-user pkm.

## instance info
- **location**: `~/pocketbase/` on 192.168.4.233
- **admin**: house@houseofmates.space / pkm2024secure!
- **api**: http://localhost:8090/api/
- **dashboard**: http://localhost:8090/_/

## collections (15 total)

### 1. habits
daily habit tracking with streaks
| field | type | notes |
|-------|------|-------|
| name | text | required |
| description | text | |
| category | select | health/creative/social/learning/chores/self_care |
| target_frequency | number | times per week (1-7) |
| points_per_completion | number | |
| streak | number | current streak |
| best_streak | number | all-time best |
| active | bool | |
| icon | text | emoji or icon name |
| color | text | hex color |

### 2. habit_completions
logs of habit completions
| field | type | notes |
|-------|------|-------|
| habit | relation | -> habits (cascade delete) |
| completed_at | datetime | |
| notes | text | |
| points_earned | number | |

### 3. tasks
todo items with gamification
| field | type | notes |
|-------|------|-------|
| title | text | required |
| description | text | |
| status | select | todo/in_progress/done/blocked |
| priority | select | low/medium/high/urgent |
| points_value | number | |
| due_date | datetime | |
| completed_at | datetime | |
| project | relation | -> projects |
| headmate | relation | -> headmates |
| tags | json | array of strings |

### 4. journal_entries
longer-form journaling
| field | type | notes |
|-------|------|-------|
| content | text | required |
| mood | number | 1-10 |
| energy | number | 1-10 |
| anxiety | number | 1-10 |
| headmate | relation | -> headmates |
| tags | json | |
| created_at | datetime | |

### 5. mood_logs
quick mood check-ins
| field | type | notes |
|-------|------|-------|
| mood | number | 1-10, required |
| energy | number | 1-10 |
| anxiety | number | 1-10 |
| motivation | number | 1-10 |
| notes | text | |
| headmate | relation | -> headmates |
| logged_at | datetime | |

### 6. activities
time tracking for activities
| field | type | notes |
|-------|------|-------|
| name | text | required |
| category | select | gaming/creative/social/learning/exercise/media/self_care/work/rest |
| started_at | datetime | |
| ended_at | datetime | |
| notes | text | |
| headmate | relation | -> headmates |
| points_earned | number | |

### 7. notes
knowledge base entries
| field | type | notes |
|-------|------|-------|
| title | text | required |
| content | text | |
| category | select | idea/reference/knowledge/personal/project |
| tags | json | |
| related_project | relation | -> projects |
| created_at | datetime | |
| updated_at | datetime | |

### 8. projects
grouping for tasks/notes
| field | type | notes |
|-------|------|-------|
| name | text | required |
| description | text | |
| status | select | active/paused/completed/abandoned |
| color | text | hex |
| icon | text | |
| created_at | datetime | |

### 9. rewards
gamification rewards to redeem
| field | type | notes |
|-------|------|-------|
| name | text | required |
| description | text | |
| cost | number | points required |
| category | select | treat/activity/purchase/break/experience |
| icon | text | |
| available | bool | |

### 10. points_log
audit trail for points
| field | type | notes |
|-------|------|-------|
| amount | number | required, can be negative |
| reason | text | |
| source_type | select | habit/task/activity/manual/reward_redemption |
| source_id | text | id of source record |
| balance_after | number | |
| logged_at | datetime | |

### 11. headmates (auth collection)
identity tracking for plural system
| field | type | notes |
|-------|------|-------|
| display_name | text | |
| pronouns | text | |
| avatar_url | url | |
| color | text | hex |
| bio | text | |
| is_fronter | bool | currently fronting |
| fronting_since | datetime | |
| (auth fields) | | email, password (built-in) |

### 12. sleep_logs
sleep quality tracking
| field | type | notes |
|-------|------|-------|
| started_at | datetime | when sleep started |
| ended_at | datetime | when woke up |
| quality | number | 1-10 |
| notes | text | |
| dreams | text | dream journal |
| headmate | relation | -> headmates |

### 13. captures
web clippings/bookmarks
| field | type | notes |
|-------|------|-------|
| title | text | |
| url | url | |
| content | text | extracted content |
| summary | text | ai summary |
| source | text | where from |
| tags | json | |
| created_at | datetime | |

### 14. finances
basic money tracking
| field | type | notes |
|-------|------|-------|
| description | text | required |
| amount | number | required |
| type | select | income/expense/transfer |
| category | text | |
| occurred_at | datetime | |
| notes | text | |

### 15. gamification_state
global state keys
| field | type | notes |
|-------|------|-------|
| key | text | required, unique |
| value | number | |
| updated_at | datetime | |

**initial keys**: total_points, current_level, xp_to_next_level, tasks_completed_today, habits_completed_today, longest_streak_days

## relations summary
- habit_completions.habit -> habits (cascade delete)
- tasks.project -> projects
- tasks.headmate -> headmates
- journal_entries.headmate -> headmates
- mood_logs.headmate -> headmates
- activities.headmate -> headmates
- notes.related_project -> projects
- sleep_logs.headmate -> headmates

## initial data
- headmate: john (john@houseofmates.space, primary fronter, color: #ffb10f)
- reward: "15 minute break" (cost: 50 points)
- gamification_state: total_points=0, current_level=1, xp_to_next_level=100

## backup
```bash
# single file backup
cp -r ~/pocketbase/pb_data ~/pocketbase_backup_$(date +%y%m%d)

# restore
rm -rf ~/pocketbase/pb_data
cp -r ~/pocketbase_backup_yymmdd ~/pocketbase/pb_data
```

## start/stop
```bash
# start
cd ~/pocketbase && ./pocketbase serve --http=0.0.0.0:8090

# stop
pkill -f pocketbase
```

## mcp integration
use `@fadlee/pocketbase-mcp` for ai agent access:
```json
{
  "mcpServers": {
    "pocketbase": {
      "command": "npx",
      "args": ["@fadlee/pocketbase-mcp"],
      "env": {
        "POCKETBASE_URL": "http://localhost:8090"
      }
    }
  }
}
```

## design philosophy
this schema is designed for:
- **single user** - no multi-tenancy concerns
- **depression/asd friendly** - minimal friction, gamification for motivation
- **identity-aware** - headmate tracking for plural system
- **comprehensive tracking** - habits, tasks, mood, sleep, activities, notes, finances
- **offline-first** - sqlite embedded, no external db dependency
- **easy backup** - single directory to copy
