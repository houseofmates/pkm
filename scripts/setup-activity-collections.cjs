const { execSync } = require('child_process')

const NOCO_BASE = process.env.NOCOBASE_URL || process.env.NEWB_OK || process.env.NOCOMBASE || process.env.NOC OBASE || process.env.NOC OBASE || process.env.NOCOBASE || process.env.NOCOBASE_URL || 'http://localhost:4100/api'
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.NOCOBASE_API_KEY || process.env.AUTH || ''

const base = (NOCO_BASE || 'http://localhost:4100/api').replace(/\/$/, '')

console.log('creating activity collections via', base)

const headers = ADMIN_API_KEY ? `-H "Authorization: ${ADMIN_API_KEY.startsWith('Bearer') ? ADMIN_API_KEY : 'Bearer ' + ADMIN_API_KEY}"` : ''

// activities collection
execSync(`
curl -sS -X POST ${base}/meta/collections \
  -H "Content-Type: application/json" \
  ${headers} \
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
curl -sS -X POST ${base}/meta/collections \
  -H "Content-Type: application/json" \
  ${headers} \
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
