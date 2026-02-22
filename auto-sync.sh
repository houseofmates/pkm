#!/bin/bash
# save this in your current directory as auto-sync.sh
# run this command to make it executable: chmod +x auto-sync.sh

while true; do
  git pull --rebase origin main

  if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "auto-sync"
    git push origin main
  fi

  sleep 60
done
