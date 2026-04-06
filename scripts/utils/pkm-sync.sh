#!/bin/bash

# pkm auto-sync script# stage changes, commit with a timestamped message, and push to the repo
echo "--- pkm sync starting ---"

# navigate to project root (in case run from elsewhere)cd "$(dirname "$0")"

# stage all changesgit add .

# draft a commit messageCOMMIT_MSG="pkm: auto-sync update $(date '+%Y-%m-%d %H:%M:%S')"

# commitgit commit -m "$COMMIT_MSG"

# push to origin (assumes current branch is the correct one, usually 'main' or 'master')# we use -u to ensure tracking is set if it's the first timegit push

echo "--- pkm sync complete ---"
echo "pushed as: $COMMIT_MSG"
