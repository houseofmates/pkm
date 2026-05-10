#!/bin/bash

# Build script for Linux (.deb) and Windows (.exe) native apps

echo "🚀 Building PKM Native Apps..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi

# Install Tauri CLI if not already installed
if ! command -v cargo-tauri &> /dev/null; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli
fi

# Build for Linux (.deb)
echo "🐧 Building Linux .deb package..."
npm run tauri build -- --target x86_64-unknown-linux-gnu

# Build for Windows (.exe) - requires cross-compilation setup
echo "🪟 Building Windows .exe package..."
echo "⚠️  Note: Cross-compiling to Windows from Linux requires additional setup."
echo "    See: https://tauri.app/v1/guides/building/cross-platform"
# npm run tauri build -- --target x86_64-pc-windows-msvc

echo "✅ Build complete!"
echo "📦 Linux package: src-tauri/target/release/bundle/deb/"
echo "📦 Windows package: src-tauri/target/release/bundle/nsis/"
