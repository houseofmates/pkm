const { execSync } = require('child_process')

console.log('setting up gamification nocobase collections...')

// gamification_daily
execSync(`
curl -X POST http://localhost:13000/api/v1/meta/collections \\
  -H "Content-Type: application/json" \\
  -d '{
    "collectionName": "gamification_daily",
    "fields": [
      {"type": "uid", "name": "id"},
      {"type": "string", "name": "date"},
      {"type": "bigInt", "name": "streak"},
      {"type": "bigInt", "name": "xp_earned"},
      {"type": "json", "name": "mood"},
      {"type": "json", "name": "row_progress"},
      {"type": "json", "name": "pet_hunger"},
      {"type": "pointer", "name": "user", "target": "users"}
    ],
    "titleField": "date"
  }'
`, { stdio: 'inherit' })

// widget_config
execSync(`
curl -X POST http://localhost:13000/api/v1/meta/collections \\
  -H "Content-Type: application/json" \\
  -d '{
    "collectionName": "widget_config",
    "fields": [
      {"type": "uid", "name": "id"},
      {"type": "string", "name": "widget_type"},
      {"type": "json", "name": "position"},
      {"type": "string", "name": "size"},
      {"type": "json", "name": "config"},
      {"type": "pointer", "name": "user", "target": "users"},
      {"type": "pointer", "name": "canvas", "target": "drawings"}
    ]
  }'
`, { stdio: 'inherit' })

console.log('gamification collections created')
