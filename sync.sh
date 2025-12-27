#!/bin/bash
cd /home/house/pkm

# 1. add everything
git add .

# 2. commit with current timestamp
git commit -m "pkm sync: $(date +'%Y-%m-%d %H:%M:%S')"

# 3. push to github. 
# if it fails due to history issues, we force it because local is the "brain"
git push origin main --force
