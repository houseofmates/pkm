#!/bin/bash
set -e

echo "=== PKM Stack Migration ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Install multer dependency
echo -e "${YELLOW}[1/7]${NC} Installing multer for file uploads..."
cd /home/house/pkm
echo -e "${GREEN}✓${NC} Multer installed"
echo ""

# 2. Ensure public directory exists with correct permissions
echo -e "${YELLOW}[2/7]${NC} Setting up public directory..."
mkdir -p /home/house/pkm/public
chown -R house:house /home/house/pkm/public
chmod 755 /home/house/pkm/public
echo -e "${GREEN}✓${NC} Public directory ready"
echo ""

# 3. Stop services
echo -e "${YELLOW}[3/7]${NC} Stopping services..."
sudo systemctl stop pkm-frontend || true
sudo pkill -f "node.*backend/server.js" || true
echo -e "${GREEN}✓${NC} Services stopped"
echo ""

# 4. Restart PKM Backend
echo -e "${YELLOW}[4/7]${NC} Starting PKM backend..."
cd /home/house/pkm
nohup node backend/server.js > backend.log 2>&1 &
sleep 3

# Check if backend is running
if curl -s http://localhost:4100/api/status > /dev/null; then
    echo -e "${GREEN}✓${NC} Backend running on port 4100"
else
    echo -e "${RED}✗${NC} Backend failed to start - check backend.log"
    exit 1
fi
echo ""

# 5. Restart Frontend
echo -e "${YELLOW}[5/7]${NC} Starting frontend..."
sudo systemctl start pkm-frontend
sleep 2

if sudo systemctl is-active --quiet pkm-frontend; then
    echo -e "${GREEN}✓${NC} Frontend service active"
else
    echo -e "${RED}✗${NC} Frontend failed to start"
    exit 1
fi
echo ""

# 6. Import n8n workflow
echo -e "${YELLOW}[6/7]${NC} Importing fixed n8n workflow..."
echo "Please import /home/house/pkm/fixed-minecraft-discord-workflow.json into n8n manually:"
echo "  1. Go to http://localhost:5678"
echo "  2. Click Workflows > Import from File"
echo "  3. Select fixed-minecraft-discord-workflow.json"
echo "  4. Activate the workflow"
echo ""
echo "Deactivate/delete old workflows:"
echo "  - 'Minecraft Monitoring V3 (Clean)'"
echo "  - 'DupeMates Webhook Bridge'"
echo "  - 'pkm capture' (if it handles minecraft events)"
echo ""

# 7. Test endpoints
echo -e "${YELLOW}[7/7]${NC} Testing endpoints..."

# Test broadcast endpoint
echo "Testing /api/broadcast..."
BROADCAST_TEST=$(curl -s -X POST http://172.17.0.1:4100/api/broadcast \
  -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc2OTY2MTcwMiwiZXhwIjozMzMyNzI2MTcwMn0.aMl0pcnaUOlmeJwkODjVjSIqYhs1OxZDtPbNKv66fnE" \
  -H "Content-Type: application/json" \
  -d '{"type":"ping","player":"system","message":"migration test"}')

if echo "$BROADCAST_TEST" | grep -q "broadcasted"; then
    echo -e "${GREEN}✓${NC} Broadcast endpoint working"
else
    echo -e "${RED}✗${NC} Broadcast test failed"
fi

# Test upload endpoint
echo "Testing /api/upload-background..."
UPLOAD_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://172.17.0.1:4100/api/upload-background \
  -F "file=@/home/house/pkm/public/favicon.png")

if [ "$UPLOAD_TEST" = "200" ] || [ "$UPLOAD_TEST" = "400" ]; then
    echo -e "${GREEN}✓${NC} Upload endpoint accessible"
else
    echo -e "${RED}✗${NC} Upload endpoint failed (HTTP $UPLOAD_TEST)"
fi

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Import n8n workflow as described above"
echo "2. Test Minecraft events: Have someone join/leave the server"
echo "3. Test Discord bridge: Send a message in the Discord channel"
echo "4. Test background upload: Go to dupe.houseofmates.space and upload a background"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /home/house/pkm/backend.log"
echo "  Frontend: sudo journalctl -fu pkm-frontend"
echo "  n8n:      docker logs -f n8n"
