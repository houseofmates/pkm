#!/bin/bash
echo "🛡️  PKM Backend Repair Tool 🛡️"

# 1. Kill any manual instances
echo "1. Killing manual instances..."
pkill -f "node backend/server.js" || true

# 2. Reset Systemd State
echo "2. Resetting systemd failure state..."
sudo systemctl reset-failed pkm-backend

# 3. Restart Service
echo "3. Restarting pkm-backend service..."
sudo systemctl enable pkm-backend
sudo systemctl restart pkm-backend

# 4. Check Status
echo "4. Checking status..."
sleep 2

if systemctl is-active --quiet pkm-backend; then
    echo "✅ SERVICE RESTORED!"
    echo "   The backend is now running as a system service."
    echo "   It will auto-start on reboot."
    systemctl status pkm-backend --no-pager
else
    echo "❌ SERVICE FAILED TO START."
    journalctl -u pkm-backend -n 20 --no-pager
fi
