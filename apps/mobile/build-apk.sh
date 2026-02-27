#!/bin/bash
# build signed APK for PKM with bundled web assets

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

MONOREPO_ROOT="$(cd ../.. && pwd)"

echo ""
echo -e "${YELLOW}step 1: building web assets...${NC}"
# build the web app from monorepo root, injecting VITE_API_URL via .env.production.local
echo "VITE_API_URL=https://pkm.houseofmates.space/api" > "$MONOREPO_ROOT/packages/core/.env.production.local"
(cd "$MONOREPO_ROOT" && npm run build)
rm -f "$MONOREPO_ROOT/packages/core/.env.production.local"

echo ""
echo -e "${YELLOW}step 2: copying build output to capacitor webDir...${NC}"
# the vite build outputs to packages/core/dist (via apps/web -> @pkm/core)
# capacitor.config.ts has webDir: 'dist', so copy there
rm -rf dist
if [ -d "$MONOREPO_ROOT/packages/core/dist" ]; then
    cp -r "$MONOREPO_ROOT/packages/core/dist" dist
    echo "  copied from packages/core/dist"
elif [ -d "$MONOREPO_ROOT/dist" ]; then
    cp -r "$MONOREPO_ROOT/dist" dist
    echo "  copied from root dist"
else
    echo -e "${RED}error: no build output found. check that 'npm run build' produces output.${NC}"
    exit 1
fi

# verify index.html exists
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}error: dist/index.html not found after build${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ dist/index.html present${NC}"

echo ""
echo -e "${YELLOW}step 3: generating app icons...${NC}"
node generate-icons.cjs

echo ""
echo -e "${YELLOW}step 4: syncing capacitor configuration...${NC}"
npx cap sync android

echo ""
echo -e "${YELLOW}step 4.5: patching java version...${NC}"
# Capacitor 6 defaults to Java 21, but system has Java 17. Patching the generated configs.
find android -type f -name "*.gradle" -exec sed -i 's/JavaVersion.VERSION_21/JavaVersion.VERSION_17/g' {} +

echo ""
echo -e "${YELLOW}step 5: building release APK...${NC}"
cd android
./gradlew assembleRelease

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  APK build complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "output: android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "features configured:"
echo "  ✓ database icon on black background"
echo "  ✓ bundled web assets (works offline)"
echo ""
echo "to install on device:"
echo "  adb install -r android/app/build/outputs/apk/release/app-release.apk"
echo ""
