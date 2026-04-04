#!/bin/bash
# Cleanup script for test artifacts

echo "Cleaning up test artifacts..."

# Remove test-notion directories
find packages/core -type d -name "test-notion-*" -exec rm -rf {} + 2>/dev/null
echo "✓ Removed test-notion-* directories"

# Remove sample ZIP files
find packages/core -name "sample-*.zip" -delete 2>/dev/null
echo "✓ Removed sample ZIP files"

# Remove build artifacts
rm -rf packages/core/dist 2>/dev/null
rm -rf apps/*/dist 2>/dev/null
echo "✓ Removed build artifacts"

# Remove temporary files
rm -rf tmp/* 2>/dev/null
echo "✓ Cleaned tmp directory"

echo ""
echo "Cleanup complete!"
echo "Run 'git status' to see the changes"
