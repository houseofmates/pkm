#!/bin/bash
echo "🧹 PKM Frontend Update Tool 🧹"

# 1. Fix Permissions (Crucial step)
echo "1. Fixing file permissions (claiming ownership)..."
sudo chown -R $USER:$USER /home/house/pkm/dist
sudo chown -R $USER:$USER /home/house/pkm/node_modules

# 2. Build Frontend
echo "2. Building frontend assets..."
cd /home/house/pkm
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build Successful!"
else
    echo "❌ Build Failed. Checking why..."
    exit 1
fi

# 3. Restart Service
echo "3. Restarting Frontend Service..."
sudo systemctl restart pkm-frontend

echo "✅ DONE! Refresh the page now."
