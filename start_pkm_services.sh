#!/bin/bash
# PKM Services Startup Script
# Run this on boot to ensure backend and frontend are running

echo "Starting PKM services..."

# Check if backend is running on port 4100
if ! lsof -Pi :4100 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Starting PKM Backend..."
    cd /home/house/pkm
    PORT=4100 nohup /home/house/.nvm/versions/node/v24.12.0/bin/node backend/server.js > backend.log 2>&1 &
    echo "Backend started (PID: $!)"
else
    echo "Backend already running on port 4100"
fi

# Check if frontend is running on port 3010
if ! lsof -Pi :3010 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Starting PKM Frontend..."
    cd /home/house/pkm
    nohup /home/house/.nvm/versions/node/v24.12.0/bin/node node_modules/.bin/vite dev --port 3010 --host 0.0.0.0 --strictPort > frontend.log 2>&1 &
    echo "Frontend started (PID: $!)"
else
    echo "Frontend already running on port 3010"
fi

echo "PKM services startup complete!"
