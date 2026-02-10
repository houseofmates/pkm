#!/bin/bash
# Quick test script for the fixed stack

echo "=== Testing PKM Stack ==="
echo ""

# Test Backend
echo "[Backend Status]"
curl -s http://localhost:4100/api/status | jq '.' || echo "Backend not responding"
echo ""

# Test Broadcast
echo "[Broadcast Test]"
curl -s -X POST http://172.17.0.1:4100/api/broadcast \
  -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc2OTY2MTcwMiwiZXhwIjozMzMyNzI2MTcwMn0.aMl0pcnaUOlmeJwkODjVjSIqYhs1OxZDtPbNKv66fnE" \
  -H "Content-Type: application/json" \
  -d '{"type":"chat","player":"TestUser","message":"test message from script"}' | jq '.'
echo ""

# Check server-data.json
echo "[server-data.json]"
if [ -f /home/house/pkm/server-data.json ]; then
    echo "Last updated: $(stat -c %y /home/house/pkm/server-data.json)"
    echo "Online status: $(cat /home/house/pkm/server-data.json | jq -r '.lastServerStats.online')"
    echo "Player count: $(cat /home/house/pkm/server-data.json | jq -r '.lastServerStats.players')"
else
    echo "File not found"
fi
echo ""

# List recent background uploads
echo "[Recent Background Uploads]"
ls -lht /home/house/pkm/public/bg-* 2>/dev/null | head -5 || echo "No background images yet"
echo ""

# Check active n8n webhooks
echo "[n8n Webhooks]"
echo "Check these URLs are registered in n8n:"
echo "  - POST http://localhost:5678/webhook/minecraft-events"
echo "  - POST http://localhost:5678/webhook/discord-chat"
echo ""
echo "Test minecraft webhook:"
echo 'curl -X POST http://localhost:5678/webhook/minecraft-events -H "Content-Type: application/json" -d '"'"'{"type":"join","player":"TestPlayer","count":1,"online":true}'"'"''
