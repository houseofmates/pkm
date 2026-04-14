# pkm-hermes bridge

bidirectional bridge between pkm app and hermes agent via mcp.

## components

### mcp_server.js

mcp server that exposes three tools to hermes:

- `get_pkm_state` - returns current active note, tags, metadata from context-server (port 3100)
- `capture_ui_context` - screenshots the pkm window for multimodal analysis
- `manage_nocobase` - execute sql or structured commands against the nocobase postgres db

hermes connects via stdio transport (configured in `~/.hermes/config.yaml`).

### chat_bridge.js

websocket server (port 3101) that routes pkm chat messages to hermes.

protocol:
```
client -> { type: 'start' }
server -> { type: 'ready', sessionId }
client -> { type: 'message', content: '...' }
server -> { type: 'stream', content: '...' } (multiple)
server -> { type: 'end', reason: 'complete' }
```

### useHermesBridge.ts

react hook for the pkm frontend to connect to the chat bridge.

```tsx
import { useHermesBridge } from '@/bridge/useHermesBridge';

function MyChat() {
  const { connected, sendMessage, streamingContent, messages } = useHermesBridge({ enabled: true });
  // ...
}
```

## setup

1. install dependencies:
   ```bash
   cd /home/house/pkm/bridge
   npm install
   ```

2. start the chat bridge (optional, for pkm chat integration):
   ```bash
   npm run start-bridge
   ```

3. the mcp server is automatically started by hermes when configured.

4. hermes config already includes the pkm mcp server:
   ```yaml
   mcp_servers:
     pkm:
       command: node
       args:
         - /home/house/pkm/bridge/mcp_server.js
       env:
         NODE_NO_WARNINGS: "1"
   ```

## usage

once hermes has the pkm mcp server connected, you can:

```
# get current pkm state
hermes> use the get_pkm_state tool

# capture what's on screen
hermes> capture the pkm ui and describe what you see

# modify the database
hermes> use manage_nocobase to list collections
hermes> create a new field called 'priority' in the notes collection
```

## postgres connection

the mcp server reads the database password from `/home/house/pkm/.env`:
- looks for `DB_PASSWORD` or `NOCOBASE_DB_PASSWORD`
- connects to `192.168.4.233:5432` database `nocobase`

## ports

- 3100 - electron context-server (existing)
- 3101 - chat bridge websocket
- 3102 - chat bridge health check http
