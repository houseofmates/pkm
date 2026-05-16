#!/bin/bash
set -e
cd /home/house/pkm
/usr/bin/docker compose up -d
echo "PKM services started"
