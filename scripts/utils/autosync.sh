#!/bin/bash

# configuration and watcher settings
REPO_URL="github.com/houseofmates/pkm.git"
BRANCH="main"
EXCLUDE="(\.git/|node_modules/|dist/|\.gemini/|_work/)"

# check requirements
if ! command -v inotifywait &> /dev/null; then
    echo "❌ Error: 'inotifywait' is not installed."
    echo "👉 Please run: sudo apt-get install inotify-tools"
    exit 1
fi

# get token from file or env
if [ -f ".github_token" ]; then
    GITHUB_TOKEN=$(cat .github_token)
elif [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN not set and .github_token file not found."
    exit 1
fi

echo "👀 Watching for changes in $(pwd)..."
echo "   (Press Ctrl+C to stop)"

while true; do
    # watch for changes (modify, create, delete, move) recursively
    # blocks until an event occurs
    change=$(inotifywait -r -e modify,create,delete,move --exclude "$EXCLUDE" --format '%w%f' .)
    
    echo "📝 Detected change in: $change"
    
    # simple debounce: wait 2 seconds for other rapid changes to finish
    sleep 2
    
    echo "🔄 Syncing to GitHub..."
    
    # git operations
    git add .
    git commit -m "Auto-save: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # push using token
    git push "https://houseofmates:$GITHUB_TOKEN@$REPO_URL" "$BRANCH"
    
    if [ $? -eq 0 ]; then
        echo "✅ Synced successfully."
    else
        echo "❌ Sync failed. Checking permissions..."
    fi
    
    # wait a bit before resuming watch to avoid loops
    sleep 1
done
