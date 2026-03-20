const { execSync } = require('child_process')

console.log('setting up enhanced gamification nocobase collections v2 on port 8091...')

// daily_goals
execSync(`
curl -X POST http://localhost:8091/api/v1/meta/collections \\
  -H "Content-Type: application/json" \\
  -d '{
    "collectionName": "daily_goals",
    "fields": [
      {"type": "uid", "name": "id"},
      {"type": "string", "name": "date"},
      {"type": "json", "name": "goals"},
      {"type": "boolean", "name": "completed"},
      {"type": "bigInt", "name": "xp_earned"},
      {"type": "pointer", "name": "user", "target": "users"}
    ],
    "titleField": "date"
  }'
`, { stdio: 'inherit' })

// reflection_sessions
execSync(`
curl -X POST http://localhost:8091/api/v1/meta/collections \\
  -H "Content-Type: application/json" \\
  -d '{
    "collectionName": "reflection_sessions",
    "fields": [
      {"type": "uid", "name": "id"},
      {"type": "string", "name": "date"},
      {"type": "number", "name": "duration_min"},
      {"type": "string", "name": "prompt"},
      {"type": "string", "name": "note"},
      {"type": "bigInt", "name": "xp_earned"},
      {"type": "pointer", "name": "user", "target": "users"}
    ],
    "titleField": "date"
  }'
`, { stdio: 'inherit' })

// custom_fixations (user obsessions → quests)
execSync(`
curl -X POST http://localhost:8091/api/v1/meta/collections \\
  -H "Content-Type: application/json" \\
  -d '{
    "collectionName": "custom_fixations",
    "fields": [
      {"type": "uid", "name": "id"},
      {"type": "string", "name": "name"},
      {"type": "string", "name": "description"},
      {"type": "string", "name": "quest_type"},
      {"type": "number", "name": "xp_reward"},
      {"type": "boolean", "name": "active"},
      {"type": "pointer", "name": "user", "target": "users"}
    ]
  }'
`, { stdio: 'inherit' })

console.log('enhanced gamification collections v2 created: daily_goals, reflection_sessions, custom_fixations')
