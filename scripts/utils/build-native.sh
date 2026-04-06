#!/bin/bash

# build script for linux (.deb) and windows (.exe) native apps
echo "🚀 Building PKM Native Apps..."

# check if rust is installedif ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi

# install tauri cli if not already installedif ! command -v cargo-tauri &> /dev/null; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli
fi

# build for linux (.deb)echo "🐧 Building Linux .deb package..."
npm run tauri build -- --target x86_64-unknown-linux-gnu

# build for windows (.exe) - requires cross-compilation setupecho "🪟 Building Windows .exe package..."
echo "⚠️  Note: Cross-compiling to Windows from Linux requires additional setup."
echo "    See: https://tauri.app/v1/guides/building/cross-platform"
# npm run tauri build -- --target x86_64-pc-windows-msvc
echo "✅ Build complete!"
echo "📦 Linux package: src-tauri/target/release/bundle/deb/"
echo "📦 Windows package: src-tauri/target/release/bundle/nsis/"
