#!/bin/bash
PROJECT_DIR="/home/house/pkm"
LOG_FILE="$PROJECT_DIR/app.log"
PORT=4173

# log helper
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

cd "$PROJECT_DIR" || exit 1

log "--- deploy sequence started ---"

# step 1: build first (don't kill site yet)
log "building project..."
# install deps if package.json changed (optional, safest to skip for speed unless needed)
# npm install >> "$LOG_FILE" 2>&1 

if npm run build >> "$LOG_FILE" 2>&1; then
    log "build success."
else
    log "CRITICAL: build failed. keeping old version running."
    exit 1
fi

# step 2: kill old process only after successful build
if command -v fuser &> /dev/null; then
    fuser -k "${PORT}/tcp" >> "$LOG_FILE" 2>&1
    log "killed port $PORT."
fi

# step 3: start new process
# we use setsid to detach it completely so closing terminal doesn't kill it
setsid npm run preview -- --port "$PORT" --host >> "$LOG_FILE" 2>&1 &
PID=$!

log "app restarted with PID $PID on port $PORT."
