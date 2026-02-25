#!/bin/bash

# Build signed APK for PKM with database icon on black background
# This script ensures:
# 1. Icons are generated from the database icon with black background
# 2. The app auto-updates from the remote server (like a live dev server)

set -e

echo "🚀 Building PKM Signed APK..."
echo ""

# Step 1: Generate icons with database icon on black background
echo "📱 Step 1: Generating app icons..."
node generate_icons.cjs
echo "✅ Icons generated successfully"
echo ""

# Step 2: Build the web app
echo "🌐 Step 2: Building web app..."
npm run build
echo "✅ Web app built successfully"
echo ""

# Step 3: Sync capacitor with Android
echo "🤖 Step 3: Syncing with Android..."
npx cap sync android
echo "✅ Android sync complete"
echo ""

# Step 4: Build signed APK
echo "📦 Step 4: Building signed APK..."
cd android
./gradlew assembleRelease
echo "✅ Signed APK built successfully"
echo ""

# Step 5: Show output location
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    echo "🎉 Success! Signed APK location:"
    echo "   $APK_PATH"
    echo ""
    ls -lh "$APK_PATH"
    echo ""
    echo "📋 Configuration Summary:"
    echo "   • Icon: Database icon on black background"
    echo "   • Auto-update: Enabled from http://pkm.houseofmates.space:3010"
    echo "   • The app will fetch latest code on each launch"
    echo ""
    echo "🔧 To install on device:"
    echo "   adb install -r $APK_PATH"
else
    echo "❌ APK not found at expected location"
    exit 1
fi
