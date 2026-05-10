#!/bin/bash
PROJECT_DIR="/home/house/pkm"
DEPLOY_SCRIPT="$PROJECT_DIR/deploy.sh"
PORT=4173

# STRICT exclude pattern. 
# We ignore .git, node_modules, the dist output folder, and any log files.
# If these are detected, the watcher stays asleep.
EXCLUDE="(^$PROJECT_DIR/dist/|^$PROJECT_DIR/node_modules/|^$PROJECT_DIR/\.git/|\.log$)"

echo "[Supervisor] Starting strict watch..."

# 1. Start clean (run deploy once)
bash "$DEPLOY_SCRIPT"

# 2. Watch Loop
while true; do
    # Watch for changes, but IGNORE the build output folders
    change=$(inotifywait -r -e modify,create,delete,move \
        --exclude "$EXCLUDE" \
        "$PROJECT_DIR" 2>/dev/null)

    if [ -n "$change" ]; then
        echo "[Supervisor] Change detected in source files. Waiting 5s..."
        
        # Debounce: wait for silence, still ignoring dist/
        while inotifywait -r -e modify,create,delete,move \
              --exclude "$EXCLUDE" \
              -t 5 \
              "$PROJECT_DIR" >/dev/null 2>&1; do
            echo "[Supervisor] ... typing detected, resetting timer."
        done

        echo "[Supervisor] 5s silence. Triggering deploy."
        bash "$DEPLOY_SCRIPT"
    fi
done
