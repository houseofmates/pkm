# PKM APK Build Guide

this guide explains how to build the signed APK with live update and the database icon.

> **note:** automated builds are now available! every push to `main` automatically builds the APK and places it in `/releases` folder. see [RELEASE_BUILD_GUIDE.md](./RELEASE_BUILD_GUIDE.md) for details.

---

## Quick Build (Automated)

APKs are automatically built on every push to `main`. find them in:
- `/releases/pkm-*.apk` in the repo
- github releases page

## Manual Build

```bash
cd apps/mobile
./build-apk.sh
```

this single command will:
1. generate icons (database icon on black background)
2. sync capacitor configuration
3. build the signed release APK

output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Features Configured

### 1. App Icon
- uses the database icon from `pkm-extension/icon-database-transparent.png`
- rendered on black background (#050505)
- generated at all required densities (mdpi through xxxhdpi)

### 2. Live Update
the APK loads code from `http://pkm.houseofmates.space:3010` on every launch. this means:
- deploy code changes to the server
- close and reopen the APK
- APK automatically gets the latest code

no need to rebuild the APK for most code changes!

### 3. Offline Mode
- caches up to 200 recently viewed records
- queues create/update/delete operations when offline
- auto-syncs when connection returns

---

## Manual Build Steps

if you prefer to run each step manually:

```bash
cd apps/mobile

# step 1: generate icons
node generate-icons.cjs

# step 2: sync capacitor
npx cap sync android

# step 3: build APK
cd android
./gradlew assembleRelease
```

---

## Installing the APK

```bash
# install on connected device
adb install -r android/app/build/outputs/apk/release/app-release.apk

# or copy to device and install manually
```

---

## Troubleshooting

### build fails with "keystore not found"
the build uses a debug keystore by default. for production, create a release keystore:

```bash
keytool -genkey -v -keystore release.keystore -alias pkm -keyalg RSA -keysize 2048 -validity 10000
```

then set environment variables:
```bash
export KEYSTORE_PASSWORD=your_password
export KEY_ALIAS=pkm
export KEY_PASSWORD=your_password
```

### APK not connecting to server
- ensure the device can reach `http://pkm.houseofmates.space:3010`
- check that the server is running
- verify capacitor.config.json has the correct URL

### icons not showing
- run `node generate-icons.cjs` to regenerate
- check that `pkm-extension/icon-database-transparent.png` exists
- ensure ffmpeg is installed

---

## When to Rebuild

you only need to rebuild the APK when:
- changing native/capacitor plugins
- changing the app icon
- changing the server URL
- updating capacitor/android dependencies

for all UI changes, just deploy to the server and restart the APK.
