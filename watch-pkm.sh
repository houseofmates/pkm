#!/bin/bash
TARGET_DIR="/home/house/pkm"
SYNC_SCRIPT="/home/house/pkm/sync.sh"

echo "active monitoring started on $TARGET_DIR (debounced)"

# monitor changes, but use a while loop with a timeout for debouncing
inotifywait -m -r -e modify,create,delete,move --exclude '\.git/' "$TARGET_DIR" |
while read -r directory events filename; do
    # clear existing timeout/wait for more events
    while read -t 2 -r directory events filename; do
        : # do nothing, just draining the buffer
    done
    
    echo "changes settled, syncing..."
    /bin/bash "$SYNC_SCRIPT"
done
