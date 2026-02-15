#!/bin/bash

# pkm auto-sync script
# stages all changes, commits with a timestamped message, and pushes to houseofmates/pkm

echo "--- pkm sync starting ---"

# navigate to project root (in case run from elsewhere)
cd "$(dirname "$0")"

# stage all changes
git add .

# draft a commit message
COMMIT_MSG="pkm: auto-sync update $(date '+%Y-%m-%d %H:%M:%S')"

# commit
git commit -m "$COMMIT_MSG"

# push to origin (assumes current branch is the correct one, usually 'main' or 'master')
# we use -u to ensure tracking is set if it's the first time
git push

echo "--- pkm sync complete ---"
echo "pushed as: $COMMIT_MSG"
