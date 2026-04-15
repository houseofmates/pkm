#!/bin/bash

# build signed apk for pkm with database icon on black background
# this script ensures:
# 1. icons are generated from the database icon with black background
# 2. the app auto-updates from the remote server (like a live dev server)

set -e

echo "🚀 Building PKM Signed APK..."
echo ""

# step 1: generate icons with database icon on black background
echo "📱 Step 1: Generating app icons..."
node generate_icons.cjs
echo "✅ Icons generated successfully"
echo ""

# step 2: build the web app
echo "🌐 Step 2: Building web app..."
npm run build
echo "✅ Web app built successfully"
echo ""

# step 3: sync capacitor with android
echo "🤖 Step 3: Syncing with Android..."
npx cap sync android
echo "✅ Android sync complete"
echo ""

# step 4: build signed apk
echo "📦 Step 4: Building signed APK..."
cd android
./gradlew assembleRelease
echo "✅ Signed APK built successfully"
echo ""

# step 5: show output location
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    echo "🎉 Success! Signed APK location:"
    echo "   $APK_PATH"
    echo ""
    ls -lh "$APK_PATH"
    echo ""
    echo "📋 Configuration Summary:"
    echo "   • Icon: Database icon on black background"
    echo "   • Auto-update: Enabled from https://pkm.houseofmates.space"
    echo "   • The app will fetch latest code on each launch"
    echo ""
    echo "🔧 To install on device:"
