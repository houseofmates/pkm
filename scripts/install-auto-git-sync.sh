#!/usr/bin/env bash
set -euo pipefail
SERVICE_PATH="/etc/systemd/system/auto-git-sync.service"
SRC="$(pwd)/scripts/auto-git-sync.service"

if [ $(id -u) -ne 0 ]; then
  echo "This script must be run as root. Use sudo."
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "Service file not found: $SRC"
  exit 1
fi

cp "$SRC" "$SERVICE_PATH"
systemctl daemon-reload
systemctl enable --now auto-git-sync.service

echo "auto-git-sync.service installed and started."