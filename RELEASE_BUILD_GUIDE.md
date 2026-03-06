# release build guide

this guide explains how automated builds work and how to manually trigger builds.

## overview

every time code is pushed to `main` or `master`, github actions automatically builds:
- ✅ `.AppImage` - linux portable
- ✅ `.deb` - debian/ubuntu package
- ✅ `.exe` - windows installer
- ✅ `.apk` - android app

all builds are saved to `/releases` folder and attached to github releases.

## automated builds (github actions)

### trigger conditions

builds automatically trigger on:
- push to `main` or `master` branch
- manual trigger via `workflow_dispatch`

builds are skipped for:
- changes to `releases/**` folder
- markdown file changes
- workflow file changes

### build process

```
1. build web assets (vite)
        ↓
2. build electron apps (linux, windows)
   - linux runner → .appimage + .deb
   - windows runner → .exe
        ↓
3. build android apk
   - setup java 17
   - setup android sdk
   - gradle assembleRelease
        ↓
4. combine and release
   - download all artifacts
   - copy to /releases folder
   - create version.json
   - commit to repo
   - create github release
```

### build status

check build status in github actions tab:
`https://github.com/yourusername/pkm/actions`

## manual builds

### build everything (local)

```bash
# build all platforms available on current os
npm run build:releases

# build with clean (delete old releases first)
npm run build:releases:clean

# build only linux (appimage + deb)
npm run build:linux

# build only android apk
npm run build:apk
```

### platform limitations

| platform | can build | notes |
|----------|-----------|-------|
| linux | .appimage, .deb, .apk | full builds |
| macos | .dmg, .apk | no .exe |
| windows | .exe, .apk | no linux builds |

for cross-platform builds, use github actions.

## releases folder structure

```
releases/
├── pkm-0.0.0-20250305-abc1234-linux.AppImage   (portable linux)
├── pkm-0.0.0-20250305-abc1234.deb              (debian package)
├── pkm-0.0.0-20250305-abc1234.exe              (windows installer)
├── pkm-0.0.0-20250305-abc1234.apk              (android app)
└── version.json                                (metadata)
```

### version.json format

```json
{
  "version": "0.0.0-20250305-abc1234",
  "buildDate": "2025-03-05T12:00:00Z",
  "commit": "abc1234...",
  "shortCommit": "abc1234",
  "releases": {
    "appimage": "pkm-0.0.0-20250305-abc1234-linux.AppImage",
    "deb": "pkm-0.0.0-20250305-abc1234.deb",
    "exe": "pkm-0.0.0-20250305-abc1234.exe",
    "apk": "pkm-0.0.0-20250305-abc1234.apk"
  }
}
```

## installation

### appimage

```bash
# download and make executable
chmod +x pkm-*-linux.AppImage

# run
./pkm-*-linux.AppImage
```

### deb

```bash
# install
sudo dpkg -i pkm-*.deb

# fix dependencies if needed
sudo apt-get install -f

# run
pkm
```

### exe

1. download `.exe` file
2. double-click to run installer
3. follow installation wizard

### apk

1. download `.apk` file to android device
2. enable "install from unknown sources" in settings
3. tap apk to install

## configuration

### environment variables

| variable | description | default |
|----------|-------------|---------|
| `VITE_API_URL` | backend api url | `https://pkm.houseofmates.space/api` |
| `NODE_VERSION` | node version for builds | `20` |
| `JAVA_VERSION` | java version for android | `17` |

### secrets (github)

set in repository settings → secrets and variables → actions:

| secret | description | required |
|--------|-------------|----------|
| `VITE_API_URL` | your backend url | no (has default) |
| `GITHUB_TOKEN` | auto-generated | yes (auto) |

## troubleshooting

### builds not triggering

1. check if push was to `main` or `master`
2. check if files were in `paths-ignore`
3. check actions tab for errors

### build failures

```bash
# check logs in github actions
# or run locally to debug:

cd apps/desktop-electron
npm run build

# for android
cd apps/mobile/android
./gradlew assembleRelease --stacktrace
```

### releases folder not updating

1. check if github token has write permissions
2. check if branch protection allows commits
3. manually run workflow to test

### clean releases folder

```bash
# preview what will be deleted
npm run releases:clean

# actually delete
node scripts/clean-releases.cjs --force
```

## development

### modifying build scripts

main build scripts:
- `scripts/build-all.cjs` - local build orchestrator
- `.github/workflows/build-releases.yml` - ci/cd workflow

### adding new platforms

edit `.github/workflows/build-releases.yml`:

```yaml
jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      # ... setup steps
      - name: build electron (mac)
        run: npm run electron:build
      # ... upload artifacts
```

### testing builds locally

```bash
# test electron build
cd apps/desktop-electron
npm run build
ls release/

# test capacitor sync
cd apps/mobile
npx cap sync android
cd android
./gradlew assembleDebug
```

## workflow file reference

`.github/workflows/build-releases.yml`

| job | runner | outputs | description |
|-----|--------|---------|-------------|
| `build-linux` | ubuntu-latest | .appimage, .deb | linux electron builds |
| `build-windows` | windows-latest | .exe | windows electron build |
| `build-android` | ubuntu-latest | .apk | capacitor android build |
| `combine-and-release` | ubuntu-latest | - | combines, commits, releases |
| `cleanup` | ubuntu-latest | - | deletes temp artifacts |

## related files

```
.github/workflows/
├── build-releases.yml      # main build workflow
├── lowercase-autofix.yml   # lowercase check
└── lowercase-check.yml     # pr check

scripts/
├── build-all.cjs           # local build script
└── clean-releases.cjs      # cleanup utility

apps/
├── desktop-electron/       # electron app
├── desktop-tauri/          # tauri app (alternative)
└── mobile/                 # capacitor android

releases/                   # build outputs (auto-generated)
```
