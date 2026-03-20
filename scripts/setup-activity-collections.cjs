const { execSync } = require('child_process')


const NOCO_BASE = process.env.NOCOBASE_URL || process.env.NOCOBASE || 'http://localhost:4100/api'
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.NOCOBASE_API_KEY || process.env.AUTH || ''

const candidateBases = [
  process.env.NOCOBASE_URL || 'http://localhost:8091/api/v1',
  'http://localhost:8091/api/v1',
  'http://localhost:4100/api',
  'http://localhost:1337/api'
].map(s => String(s).replace(/\/$/, ''))

function findWorkingBase() {
  for (const b of candidateBases) {
    try {
      const code = execSync(`curl -s -o /dev/null -w '%{http_code}' ${b}/collections:list`, { encoding: 'utf8' }).trim()
      if (code === '200') return b
    } catch (e) {
      // ignore
    }
  }
  return null
}

const working = findWorkingBase()
if (!working) {
  console.error('could not find a reachable nocobase base among candidates. set NOCOBASE_URL and ADMIN_API_KEY env vars and retry')
  process.exit(2)
}

console.log('creating activity collections via', working)

const headers = ADMIN_API_KEY ? `-H "Authorization: ${ADMIN_API_KEY.startsWith('Bearer') ? ADMIN_API_KEY : 'Bearer ' + ADMIN_API_KEY}"` : ''

// activities collection
execSync(`
curl -sS -X POST ${working}/meta/collections \
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
curl -sS -X POST ${working}/meta/collections \
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
