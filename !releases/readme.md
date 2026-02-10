# pkm releases

this folder contains pre-built releases for easy installation.

## downloads

### linux (ubuntu 24.04.3 compatible)

**latest version: 1.0.0**

- [pkm_1.0.0_amd64.deb](./pkm_1.0.0_amd64.deb) - debian package for ubuntu/debian-based systems
- includes auto-update support
- requires: no additional dependencies (uses system webview)

### installation

```bash
# download the .deb file
wget https://github.com/houseofmates/pkm/raw/main/!releases/pkm_1.0.0_amd64.deb

# install
sudo dpkg -i pkm_1.0.0_amd64.deb

# if dependencies are missing
sudo apt-get install -f
```

### windows

coming soon - windows builds require cross-compilation or a windows build machine.

## building from source

if you prefer to build from source:

```bash
# clone the repository
git clone https://github.com/houseofmates/pkm.git
cd pkm

# install dependencies
npm install --legacy-peer-deps

# build linux package
npm run tauri:build:linux

# output: src-tauri/target/release/bundle/deb/
```

## auto-updates

the native apps include auto-update support. when a new version is released:

1. app checks for updates on startup
2. prompts you to download and install
3. one-click update process

no manual downloads required after initial installation.

## system requirements

- **linux**: ubuntu 24.04.3 or compatible debian-based distro
- **windows**: windows 10/11 (64-bit)
- **memory**: 512mb ram minimum, 1gb recommended
- **disk**: ~50mb for app, additional space for your data

## notes

- first launch may take a few seconds to initialize
- data is stored locally in `~/.local/share/pkm/` (linux)
- no internet connection required after installation
- all data stays on your machine

## support

having issues? open an issue on [github](https://github.com/houseofmates/pkm/issues)
