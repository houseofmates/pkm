#!/bin/bash
# update backend api key script# 1. get your new api key from nocobase (users > root > api keys)# 2. replace paste_your_new_nocobase_api_key_here below with the actual key# 3. run: chmod +x update-api-key.sh && ./update-api-key.sh
set -e

# ===== edit this line =====NEW_KEY="${NEW_KEY}"
# ==========================
OLD_KEY="${OLD_KEY}"

# validationif [ "$NEW_KEY" = "PASTE_YOUR_NEW_NOCOBASE_API_KEY_HERE" ]; then
    echo "❌ Error: You need to edit this script and paste your NocoBase API key"
    echo ""
    echo "Steps:"
    echo "1. Go to NocoBase → Users → root → API keys"
    echo "2. Generate a new API key"
    echo "3. Edit this script and replace PASTE_YOUR_NEW_NOCOBASE_API_KEY_HERE"
    echo "4. Run again"
    exit 1
fi

if [ ${#NEW_KEY} -lt 20 ]; then
    echo "❌ Error: API key looks too short. Did you paste the full key?"
    exit 1
fi

echo "🔄 Updating API key in all files..."
echo ""

# update backend/server.jsif [ -f packages/backend/server.js ]; then
    sed -i "s|$OLD_KEY|$NEW_KEY|g" packages/backend/server.js
    echo "✅ Updated packages/backend/server.js"
fi

# update pkm-control.shif [ -f pkm-control.sh ]; then
    sed -i "s|$OLD_KEY|$NEW_KEY|g" pkm-control.sh
    echo "✅ Updated pkm-control.sh"
fi

# update n8n_setup.mdif [ -f N8N_SETUP.md ]; then
    sed -i "s|$OLD_KEY|$NEW_KEY|g" N8N_SETUP.md
    echo "✅ Updated N8N_SETUP.md"
fi

# update services_ready.mdif [ -f SERVICES_READY.md ]; then
    sed -i "s|$OLD_KEY|$NEW_KEY|g" SERVICES_READY.md
    echo "✅ Updated SERVICES_READY.md"
fi

echo ""
echo "✅ API key updated successfully!"
echo ""
echo "🔄 Restarting backend service..."
sudo systemctl restart pkm-server

sleep 2

echo ""
echo "🧪 Testing new API key..."
RESPONSE=$(curl -s -X POST http://172.17.0.1:4100/api/broadcast \
    -H "x-api-key: $NEW_KEY" \
    -H "Content-Type: application/json" \
    -d '{"type":"test","player":"system","message":"api-key-test","online":true,"count":0}')

if echo "$RESPONSE" | grep -q "broadcasted"; then
    echo "✅ Backend is working with new API key!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update your n8n workflow 'send to website' node"
    echo "2. Change the x-api-key header to: $NEW_KEY"
    echo ""
    echo "🔒 Old API key has been replaced everywhere."
else
    echo "❌ Backend test failed. Response:"
    echo "$RESPONSE"
    echo ""
    echo "Check backend logs: sudo journalctl -u pkm-server -n 20"
fi
