const fs = require('fs');
// Load workflows
const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
const pkm = workflows.find(w => w.id === 'KytrscYDZCMhk5r9GKPWq');

if (!pkm) {
    console.error('PKM workflow not found!');
    process.exit(1);
}

// Existing PKM IDs
// Webhook: 7514d54e-b8be-4f55-bf4b-f55c681d9156 (Input)
// Create Entry: f9d567d3-35f3-4c39-9e41-83a40784b059 (PKM Action)

// Define New Nodes
const newNodes = [
    {
        "parameters": {
            "conditions": {
                "boolean": [
                    {
                        "value1": "={{ $json.body.player !== undefined }}",
                        "value2": true
                    }
                ]
            }
        },
        "id": "router-node",
        "name": "Router (Minecraft vs PKM)",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [800, 192]
    },
    {
        "parameters": {
            "rule": { "interval": [{ "field": "seconds", "secondsInterval": 30 }] }
        },
        "id": "poll-node",
        "name": "poll every 30s",
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.1,
        "position": [450, 500]
    },
    {
        "parameters": {
            "url": "https://mcapi.us/server/status?ip=dupemates.playit.pub",
            "options": {}
        },
        "id": "get-status-node",
        "name": "get server status",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.1,
        "position": [650, 500]
    },
    {
        "parameters": {
            "method": "POST",
            "url": "http://172.17.0.1:4100/api/broadcast",
            "sendHeaders": true,
            "headerParameters": {
                "parameters": [
                    { "name": "x-api-key", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc2OTY2MTcwMiwiZXhwIjozMzMyNzI2MTcwMn0.aMl0pcnaUOlmeJwkODjVjSIqYhs1OxZDtPbNKv66fnE" }
                ]
            },
            "sendBody": true,
            "contentType": "json",
            "bodyParameters": {
                "parameters": [
                    { "name": "type", "value": "={{ $json.body?.type || 'ping' }}" },
                    { "name": "player", "value": "={{ $json.body?.player || 'system' }}" },
                    { "name": "message", "value": "={{ $json.body ? JSON.stringify($json.body) : ($json.body?.message || 'external-status-poll') }}" },
                    { "name": "online", "value": "={{ $json.body?.online !== undefined ? $json.body.online : ($json.online || false) }}" },
                    { "name": "count", "value": "={{ $json.body?.count !== undefined ? $json.body.count : ($json.players?.now !== undefined ? $json.players.now : ($json.players?.online || 0)) }}" },
                    { "name": "extra", "value": "={{ $json.body?.extra || { tps: 20, motd: 'Minecraft Server', version: '1.21.10' } }}" },
                    { "name": "timestamp", "value": "={{ new Date().toISOString() }}" }
                ]
            },
            "options": {}
        },
        "id": "send-node",
        "name": "send event to website",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.1,
        "position": [1000, 400]
    }
];

// Add new nodes
pkm.nodes.push(...newNodes);

// Update Connections
pkm.connections = {}; // Reset connections to rebuild cleanly

// 1. Webhook (Original Node: webhook) -> Router
pkm.connections["webhook"] = {
    "main": [[{ "node": "Router (Minecraft vs PKM)", "type": "main", "index": 0 }]]
};

// 2. Router True (Minecraft) -> Send Event
// 3. Router False (PKM) -> Create Entry (Original Node: create entry)
pkm.connections["Router (Minecraft vs PKM)"] = {
    "main": [
        [{ "node": "send event to website", "type": "main", "index": 0 }], // True
        [{ "node": "create entry", "type": "main", "index": 0 }] // False
    ]
};

// 4. Poll -> Get Status -> Send Event
pkm.connections["poll every 30s"] = {
    "main": [[{ "node": "get server status", "type": "main", "index": 0 }]]
};
pkm.connections["get server status"] = {
    "main": [[{ "node": "send event to website", "type": "main", "index": 0 }]]
};

// Write result
fs.writeFileSync('unified_pkm.json', JSON.stringify(pkm, null, 2));
console.log('Created unified_pkm.json via Trojan Horse strategy.');
