#!/bin/bash
# directory to watch
WATCH_DIR="/home/house/pkm"
# path to your sync script
SYNC_SCRIPT="/home/house/pkm/sync.sh"

echo "watching $WATCH_DIR for changes..."

# monitor for modified, created, deleted, or moved files
# excludes the .git folder to avoid infinite loops
inotifywait -m -r -e modify,create,delete,move --exclude '\.git/' "$WATCH_DIR" |
    while read -r directory events filename; do
        echo "change detected in $filename, syncing..."
        /bin/bash "$SYNC_SCRIPT"
    done
