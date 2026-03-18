#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "building pkm wiki..."
npm ci
npm run wiki:backlinks
npm run wiki:build

DIST_DIR="content/.vitepress/dist"
PUBLIC_PKM="../packages/core/public/pkm"

echo "deploying to $PUBLIC_PKM..."
rm -rf "$PUBLIC_PKM"
cp -r "$DIST_DIR" "$PUBLIC_PKM"

echo "wiki deployed to public/pkm — vite will serve it at /pkm/"

echo "wiki deployed to houseofmates.space/pkm"

