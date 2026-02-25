#!/bin/bash
# create-apk.sh: Build APK, generate version manifest, upload to server
# Requirements: Android SDK, Capacitor CLI, scp, jq

set -e

# CONFIGURATION
APK_OUTPUT_PATH="android/app/build/outputs/apk/release/app-release.apk"
APK_HOST="pkm.houseofmates.space"
APK_REMOTE_DIR="/var/www/pkm/apk"   # adjust if needed
APK_URL="https://pkm.houseofmates.space/apk/pkm-latest.apk"
VERSION_MANIFEST="version.json"

# 1. Build APK
npm run build:android

# 2. Get version from package.json
VERSION=$(jq -r .version package.json)

# 3. Copy APK to local slug
cp "$APK_OUTPUT_PATH" "pkm-latest.apk"

# 4. Generate version manifest
cat > "$VERSION_MANIFEST" <<EOF
{
  "version": "$VERSION",
  "apkUrl": "$APK_URL"
}
EOF

# 5. Upload APK and manifest via SCP
scp pkm-latest.apk "$APK_HOST:$APK_REMOTE_DIR/pkm-latest.apk"
scp "$VERSION_MANIFEST" "$APK_HOST:$APK_REMOTE_DIR/$VERSION_MANIFEST"

# 6. Clean up local files
rm pkm-latest.apk "$VERSION_MANIFEST"

echo "APK and manifest uploaded to $APK_HOST:$APK_REMOTE_DIR"
