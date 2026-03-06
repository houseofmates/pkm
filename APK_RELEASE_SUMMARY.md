# pkm android apk - release summary

## build completed successfully

**apk location:** `releases/pkm-v1.0-release.apk`  
**size:** 9.4mb  
**version:** 1.0 (versioncode 1)  
**package:** com.houseofmates.pkm

---

## features implemented

### 1. database icon on black background
- source: `pkm-extension/icon-database-transparent.png`
- background: `#050505` (black)
- generated icons for all densities:
  - mipmap-mdpi: 48x48px
  - mipmap-hdpi: 72x72px
  - mipmap-xhdpi: 96x96px
  - mipmap-xxhdpi: 144x144px
  - mipmap-xxxhdpi: 192x192px
- both `ic_launcher.png` and `ic_launcher_round.png` updated

### 2. auto-update (live dev server)
the apk loads app code from remote server on each launch:

```json
{
  "server": {
    "url": "https://pkm.houseofmates.space",
    "allowNavigation": ["pkm.houseofmates.space", "*.houseofmates.space"],
    "cleartext": true,
    "androidscheme": "http"
  }
}
```

**how it works:**
- apk acts as a "shell" that loads your web app from the server
- when you update code on `pkm.houseofmates.space`, the apk gets the new version automatically
- no need to rebuild/reinstall the apk for code changes
- only need new apk for native plugin changes or config updates

### 3. offline mode support
- webview caching enabled for offline use
- background color set to `#050505` (matches your dark theme)
- cleartext enabled for local network access
- mixed content allowed for flexibility

---

## installation

```bash
# install to connected android device
adb install releases/pkm-v1.0-release.apk

# or copy to device and install manually
```

---

## requirements for auto-update to work

1. **your dev server must be running** at `https://pkm.houseofmates.space`
2. **device must have network access** to that server (same wifi or accessible network)
3. **server must allow cors** and serve the app properly

---

## troubleshooting

### if app shows blank screen
- check server is running: `curl https://pkm.houseofmates.space`
- verify device can reach server (same network)
- check `apps/mobile/android/app/src/main/assets/capacitor.config.json` has correct url

### if icons don't show
- icons are bundled in the apk (not loaded from server)
- if you need different icons, re-run `node generate-icons.cjs` and rebuild

### to force refresh the app
- android: settings → apps → pkm → storage → clear cache
- or uninstall and reinstall the apk

---

## build configuration

**java version:** 17 (compatible with your system)  
**gradle:** 8.5  
**compile sdk:** 34  
**target sdk:** 34  
**minsdk:** 22 (android 5.1+)

---

## next steps

1. install the apk on your android device
2. ensure your dev server is running at `pkm.houseofmates.space`
3. launch the app - it will load latest code from the server
4. make code changes → refresh app → see updates immediately
