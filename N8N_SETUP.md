# N8N Minecraft Bridge Setup

## Backend API Configuration

The PKM backend listens on **port 4100** and receives Minecraft events from n8n.

### n8n HTTP Request Node Settings

**URL:**
```
http://172.17.0.1:4100/api/broadcast
```

**Method:** POST

**Authentication:** Custom Header

**Headers:**
```
x-api-key: BROADCAST_AUTH_KEY
```

**Body (JSON):**
```json
{
  "type": "{{ $json.body?.type || 'ping' }}",
  "player": "{{ $json.body?.player || 'system' }}",
  "message": "{{ $json.body?.message || 'external-status-poll' }}",
  "online": "{{ $json.body?.online !== undefined ? $json.body.online : ($json.online || false) }}",
  "count": "{{ $json.body?.count !== undefined ? $json.body.count : ($json.players?.now !== undefined ? $json.players.now : ($json.players?.online || 0)) }}",
  "extra": "{{ $json.body?.extra || { tps: 20, motd: $json.motd || 'Minecraft Server', version: $json.server?.name || '1.21.10', favicon: $json.favicon || '' } }}",
  "timestamp": "{{ new Date().toISOString() }}"
}
```

### Testing the Connection

Test from command line:
```bash
curl -X POST http://172.17.0.1:4100/api/broadcast \
  -H "x-api-key: BROADCAST_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","player":"system","message":"test","online":true,"count":0}'
```

Or use the control script:
```bash
./pkm-control.sh test
```

### Common Issues

**403 Forbidden**
- Wrong API key. Must use the JWT token shown above, NOT "CENSOREDAPIKEY"

**Connection Refused**
- Backend not running. Start it: `sudo systemctl start pkm-server`

**Network Timeout**
- n8n running in Docker? Use `172.17.0.1` (Docker host IP), not `localhost`
- Check backend is listening: `sudo lsof -i:4100`

## Service Management

See [SERVICE_MANAGEMENT.md](SERVICE_MANAGEMENT.md) for details on controlling the services.
