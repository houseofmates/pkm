const { execSync } = require('child_process')

console.log('creating activity collections on nocobase port 8091...')

// activities collection
execSync(`
curl -sS -X POST http://localhost:8091/api/v1/meta/collections \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "activities",
    "fields": [
      {"type": "uid", "name": "id"},
      {"type": "string", "name": "name"},
      {"type": "string", "name": "icon"},
      {"type": "string", "name": "color"},
      {"type": "datetime", "name": "createdAt"},
      {"type": "pointer", "name": "user", "target": "users"}
    ],
    "titleField": "name"
  }'
`, { stdio: 'inherit' })

// activity_logs collection
execSync(`
curl -sS -X POST http://localhost:8091/api/v1/meta/collections \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "activity_logs",
    "fields": [
      {"type": "uid", "name": "id"},
      {"type": "pointer", "name": "activity", "target": "activities"},
      {"type": "pointer", "name": "user", "target": "users"},
      {"type": "text", "name": "note"},
      {"type": "integer", "name": "rating"},
      {"type": "datetime", "name": "createdAt"}
    ],
    "titleField": "createdAt"
  }'
`, { stdio: 'inherit' })

console.log('activity collections creation finished')
