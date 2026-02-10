#!/bin/bash
echo "🛡️  PKM Full Stack Repair Tool 🛡️"

# 1. Kill any manual instances
echo "1. Killing manual instances..."
pkill -f "node backend/server.js" || true

# 2. Reset Systemd State (Frontend & Backend)
echo "2. Resetting systemd failure states..."
sudo systemctl reset-failed pkm-backend
sudo systemctl reset-failed pkm-frontend

# 3. Restart Services
echo "3. Restarting services..."
sudo systemctl restart pkm-backend
sudo systemctl restart pkm-frontend

# 4. Check Status
echo "4. Checking status..."
sleep 2

echo "--- BACKEND (4100) ---"
if systemctl is-active --quiet pkm-backend; then
    echo "✅ UP"
else
    echo "❌ DOWN"
    journalctl -u pkm-backend -n 10 --no-pager
fi

echo "--- FRONTEND (3010) ---"
if systemctl is-active --quiet pkm-frontend; then
    echo "✅ UP"
else
    echo "❌ DOWN"
    journalctl -u pkm-frontend -n 10 --no-pager
fi
