#!/bin/bash

# load user environment so cron can find 'npm' and 'node'
export HOME="/home/house"
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin"

# try to load nvm if you use it, otherwise bashrc
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc"

PROJECT_DIR="/home/house/pkm"
PORT=4173
LOG_FILE="$PROJECT_DIR/auto-build.log"

# function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "starting daily rebuild cycle."

cd "$PROJECT_DIR" || { log "error: could not find directory"; exit 1; }

# 1. kill whatever is running on port 4173
# we use fuser (standard in pop! os) to identify the process
if command -v fuser &> /dev/null; then
    fuser -k "${PORT}/tcp" 2>/dev/null
    log "killed existing process on port $PORT."
else
    log "warning: fuser not found, skipping kill step."
fi

# 2. install deps (optional safety) and build
# log "installing dependencies..."
# npm install >> "$LOG_FILE" 2>&1

log "building production bundle..."
if npm run build >> "$LOG_FILE" 2>&1; then
    log "build successful."
else
    log "build failed! check logs."
    exit 1
fi

# 3. run preview in the background (detached)
# --host 0.0.0.0 exposes it to local network if you need it
nohup npm run preview -- --port "$PORT" --host > /dev/null 2>&1 &

log "pkm restarted on port $PORT."
