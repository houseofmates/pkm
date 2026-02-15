#!/bin/bash
cd /home/house/pkm

# add changes
git add .

# commit only if there are changes (-q for quiet)
if ! git diff-index --quiet HEAD; then
    git commit -m "auto-sync: $(date +'%Y-%m-%d %H:%M:%S')" -q
    # push only if commit was successful
    git push origin main --force -q
fi
