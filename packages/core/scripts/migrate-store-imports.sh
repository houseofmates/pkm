#!/bin/bash

# a script to fix misplaced zustand store imports across the components directory.
# run this from the root of the core package or root of the workspace.

TARGET_DIR="src/components"

# 1. update the 'src/src/store' -> 'src/store' or '@/src/store' -> '@/store' paths.
echo "Migrating discrete store imports in $TARGET_DIR..."
# update absolute or relative paths targeting src/src/store -> src/store
find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i -e 's/src\/src\/store/src\/store/g' {} +
# update path aliases like @/src/store -> @/store
find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i -e 's/@\/src\/store/@\/store/g' {} +

echo "Complete."
echo "--------------"

# 2. flag usage of `usepkmstore` for manual migration.
# the `usepkmstore` was split into discrete stores (e.g. `usecollectionsstore`, `usedocumentstore`, `usesearchstore`, `useuistore`).
echo "Checking for remaining and deprecated 'usePkmStore' usages..."

grep -rnw "$TARGET_DIR" -e "usePkmStore"

echo "--------------"
echo "If any usages of usePkmStore were found above, you must migrate them manually."
echo "Map the required state from usePkmStore to the equivalent new stores:"
echo "- useCollectionsStore (collections, setCollections)"
echo "- useSearchStore (searchResults, setSearchResults)"
echo "- useDocumentStore (activeDoc, setActiveDoc)"
echo "- useUiStore (headmateColor, setHeadmateColor)"
echo "Done."
