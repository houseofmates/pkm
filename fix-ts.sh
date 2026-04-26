#!/bin/bash
mv packages/core/src/lib/perf-utils.ts packages/core/src/lib/perf-utils.tsx
mv packages/core/src/plugin-system/example-plugin.ts packages/core/src/plugin-system/example-plugin.tsx
sed -i 's/    # /    /g' packages/core/src/plugin-system/plugin-manager.ts
sed -i 's/# This is a placeholder/\/\/ This is a placeholder/g' packages/core/src/plugin-system/plugin-manager.ts
