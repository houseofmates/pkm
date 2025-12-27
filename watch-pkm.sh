#!/bin/bash

# configuration
TARGET_DIR="/home/house/pkm"
SYNC_SCRIPT="/home/house/pkm/sync.sh"

echo "active monitoring started on $TARGET_DIR"

# watch for changes, excluding the .git folder to prevent loops
inotifywait -m -r -e modify,create,delete,move --exclude '\.git/' "$TARGET_DIR" |
while read -r directory events filename; do
    echo "change detected: $filename ($events)"
    /bin/bash "$SYNC_SCRIPT"
done
