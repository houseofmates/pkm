# PKM Live Update Guide

this document explains how the live update system works for both the linux electron app and the android apk.

---

## How It Works

both apps are configured to load the pkm web app from a remote server (`http://pkm.houseofmates.space:3010`) instead of bundling the web assets locally. this means:

1. you deploy code changes to your server
2. the apps automatically fetch the latest version on launch/reload
3. no need to rebuild or redistribute the apps for most code changes

---

## Android APK

### Configuration
the APK is configured in `capacitor.config.ts`:
```typescript
server: {
  url: 'http://pkm.houseofmates.space:3010',
  allowNavigation: ['*'],
  cleartext: true
}
```

### How to Update
1. deploy your code changes to `http://pkm.houseofmates.space:3010`
2. close and reopen the APK
3. the APK will load the latest code from the server

### Offline Mode (New!)
the APK now supports offline functionality:

**what works offline:**
- view up to 200 recently accessed records (cached locally)
- create, edit, delete records (changes are queued)
- all changes sync automatically when back online

**how it works:**
- records are cached as you view them (LRU eviction when full)
- changes are queued and retried up to 5 times
- sync happens automatically when connection restored

### Limitations
- the APK only checks for code updates on **cold start** (fully close and reopen)
- to force a refresh: close the app completely (swipe away from recents) and reopen
- some native plugin changes may still require an APK rebuild

---

## Linux Electron App

### Configuration
the electron app has two modes:

**Live Update Mode** (default when `PKM_REMOTE_URL` is set):
```bash
export PKM_REMOTE_URL=http://pkm.houseofmates.space:3010
npm run electron:build
```

**Offline Mode** (bundled files, no live update):
```bash
# don't set PKM_REMOTE_URL
npm run electron:build
```

### How to Update

**Automatic (Every 30 seconds):**
the electron app checks `/api/version` on your backend every 30 seconds. when a new version is detected, it shows a dialog:
- click "reload now" to immediately get updates
- click "later" to keep using the current version

**Manual:**
- press `ctrl+r` (or `cmd+r` on mac) to reload
- use the menu: `view > check for updates`
- close and reopen the app

### Backend Version Endpoint
the backend exposes `/api/version` which returns:
```json
{
  "version": "2025-01-15T10:30:00.000Z",
  "buildTime": "2025-01-15T10:30:00.000Z",
  "env": "production"
}
```

the electron app compares this version string with the one it stored on first load. if different, an update is available.

---

## Deployment Checklist

when you make code changes:

1. **build and deploy the web app:**
   ```bash
   npm run build
   # deploy dist/ to your server at pkm.houseofmates.space:3010
   ```

2. **restart the backend** (if you changed backend code):
   ```bash
   # on your server
   pm2 restart pkm-backend  # or however you run it
   ```

3. **apps will auto-update:**
   - APK: close and reopen
   - Electron: will prompt you within 30 seconds, or press ctrl+r

---

## Troubleshooting

### APK not showing updates
- ensure the APK has internet access
- check that `http://pkm.houseofmates.space:3010` is reachable from the device
- try clearing the app's cache (android settings > apps > pkm > storage > clear cache)
- fully close the app (swipe away) and reopen

### Electron not detecting updates
- check the console for errors (view > toggle developer tools)
- verify `/api/version` returns a different timestamp after deployment
- ensure `PKM_REMOTE_URL` was set when building
- try manual reload with ctrl+r

### Backend version endpoint not working
- verify the backend is running: `curl http://localhost:4100/api/version`
- check that the backend was restarted after code changes
- the `BUILD_TIME` is set when the backend starts, so restarting updates the version

---

## When You Need to Rebuild

you only need to rebuild the apps when:

- changing native/capacitor plugins (android)
- changing electron main process code (linux)
- changing the app icon or native configuration
- the live update server URL changes

for all UI changes, database schema changes, and most feature additions, just deploy to the server.
