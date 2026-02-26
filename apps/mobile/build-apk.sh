#!/bin/bash
# build signed APK for PKM with live update and offline support

set -e

echo "=========================================="
echo "  PKM Android APK Builder"
echo "=========================================="

# colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # no color

# check if running from correct directory
if [ ! -f "capacitor.config.ts" ]; then
    echo -e "${RED}error: must run from apps/mobile directory${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}step 1: generating app icons...${NC}"
node generate-icons.cjs

echo ""
echo -e "${YELLOW}step 2: syncing capacitor configuration...${NC}"
npx cap sync android

echo ""
echo -e "${YELLOW}step 3: building release APK...${NC}"
cd android
./gradlew assembleRelease

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  APK build complete!${NC}"
echo -e "${GREEN}=========================================="
echo ""
echo "output: android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "features configured:"
echo "  ✓ database icon on black background"
echo "  ✓ live update from http://pkm.houseofmates.space:3010"
echo "  ✓ offline mode (200 records cached)"
echo "  ✓ auto-sync when back online"
echo ""
echo "to install on device:"
echo "  adb install -r android/app/build/outputs/apk/release/app-release.apk"
echo ""
