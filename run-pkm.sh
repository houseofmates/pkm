#!/bin/bash
# PKM Desktop Launcher
# Connects to backend at 192.168.4.233

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE="$SCRIPT_DIR/apps/desktop-electron/release/pkm-0.0.0.AppImage"

# Launch AppImage (connects to remote backend at 192.168.4.233)
echo "Launching PKM Desktop..."
if [ -f "$APPIMAGE" ]; then
    "$APPIMAGE" "$@"
else
    echo "ERROR: AppImage not found at $APPIMAGE"
    echo "Run: npm run electron:build"
    exit 1
fi
