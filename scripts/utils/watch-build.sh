#!/bin/bash

PROJECT_DIR="/home/house/pkm"
BUILD_SCRIPT="$PROJECT_DIR/daily-build.sh"
# exclude heavy folders to prevent lag/infinite loopsEXCLUDE_PATTERN="(\.git|node_modules|dist|.output|auto-build.log)"

echo "[Watchdog] Started. Watching $PROJECT_DIR for changes..."

while true; do
    # 1. block and wait for the first change event    inotifywait -r -e modify,create,delete,move \
    --exclude "$EXCLUDE_PATTERN" \
    "$PROJECT_DIR" >/dev/null 2>&1

    echo "[Watchdog] Change detected. Waiting for 5s of silence..."

    # 2. the debounce loop    # keep resetting the timer as long as changes happen within 5 seconds    while inotifywait -r -e modify,create,delete,move \
          --exclude "$EXCLUDE_PATTERN" \
          -t 5 \
          "$PROJECT_DIR" >/dev/null 2>&1; do
        echo "[Watchdog] ... more changes detected, resetting timer."
    done

    # 3. silence achieved. trigger the build.    echo "[Watchdog] 5s silence confirmed. Triggering build."
    
    # execute the build script we made earlier    bash "$BUILD_SCRIPT"
    
    echo "[Watchdog] Build routine finished. Resuming watch."
done
