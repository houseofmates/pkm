#!/bin/bash
# auto-sync.sh: commit first, then pull

while true; do
  # 1. save local state immediately. 
  # if there are changes, lock them into the git database.
  if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "auto-sync: $(date)"
  fi

  # 2. bring in remote changes.
  # using --rebase stacks your local 'auto-sync' on top of the remote changes.
  # if this fails (conflict), the script waits for you to fix it.
  git pull --rebase origin main

  # 3. push the result.
  # only runs if the pull was successful or if you have local commits to send.
  git push origin main

  sleep 60
done
