#!/bin/bash
# cleanup script for test artifacts
echo "Cleaning up test artifacts..."

# remove test-notion directoriesfind packages/core -type d -name "test-notion-*" -exec rm -rf {} + 2>/dev/null
echo "✓ Removed test-notion-* directories"

# remove sample zip filesfind packages/core -name "sample-*.zip" -delete 2>/dev/null
echo "✓ Removed sample ZIP files"

# remove build artifactsrm -rf packages/core/dist 2>/dev/null
rm -rf apps/*/dist 2>/dev/null
echo "✓ Removed build artifacts"

# remove temporary filesrm -rf tmp/* 2>/dev/null
echo "✓ Cleaned tmp directory"

echo ""
echo "Cleanup complete!"
echo "Run 'git status' to see the changes"
