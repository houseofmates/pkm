#!/usr/bin/env bash
# Purpose: Extract exactly what's needed to model your PKM's structure
# This script reads only code files and metadata; it avoids secrets.
# Output: several .txt / .json files inside ~/pkm

cd ~/pkm || exit

OUTDIR=~/pkm-exports
mkdir -p "$OUTDIR"

echo "=== Export 1: Git-tracked directory tree (JSON) ==="
cd ~/pkm
# Filter only git-tracked files, limit depth
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.service" \) \
  | grep -v "node_modules\|dist\|build\|_build" \
  | sort > "$OUTDIR/files-tracked.txt"
echo "Tracked files written to: $OUTDIR/files-tracked.txt"

cd ~/pkm
tree -J -L 3 . \
  | jq 'walk(if type == "object" then with_entries(if .key == "directory" or .key == "file" then . else empty end) else . end)' \
  > "$OUTDIR/dir-tree-clean.json" 2>/dev/null
echo "Directory tree (JSON): $OUTDIR/dir-tree-clean.json"

echo
echo "=== Export 2: Express routes from backend/server.js ==="
if [[ -f "backend/server.js" ]]; then
    awk '
    match($0, /app\.(get|post|put|delete|patch)\s*\(\s*["'"'"']([^"'"'"']+)["'"'"']/, arr) {
        method = arr[1]; path = arr[2]
        gsub(/\\/,"",path)
        print method " " path
        next
    }
    match($0, /router\.(get|post|put|delete|patch)/, m) && /"/ {
        method = m[1];
        gsub(/.*"([^"]*)".*/, "\\1", $0);
        path = $0;
        print "ROUTER " method " " path
    }
    ' backend/server.js \
    | grep -F " " \
    | sort -u \
    > "$OUTDIR/backend-routes.txt"
    echo "Express routes written to: $OUTDIR/backend-routes.txt"
else
    echo "backend/server.js not found (maybe path changed?)" > "$OUTDIR/backend-routes.txt"
fi

echo
echo "=== Export 3: NocoBase schema fields from unified_pkm.json ==="
if [[ -f "unified_pkm.json" ]]; then
    # Keep only collections and their field names/types for you
    jq -r '
        .collections[] |
            select(.quickPreview) |  # quickPreview = true = main user tables
            "COLLECTION: \(.name)" as $cname |
            (
                .fields[] | "  FIELD: \(.name) → \(.type)"
            ),
            ""  # empty line between collections
    ' unified_pkm.json > "$OUTDIR/schema-fields.txt"
    echo "Schema fields written to: $OUTDIR/schema-fields.txt"
else
    echo "NO unified_pkm.json found." > "$OUTDIR/schema-fields.txt"
fi

echo
echo "=== Export 4: Frontend pages and views (route-like structure) ==="
cd ~/pkm
find src/pages -type f -name "*.tsx" -o -name "*.ts" | \
    sed 's|src/pages/||' | \
    sed 's|\.\(tsx\|ts\)$||' \
    | sort \
    > "$OUTDIR/frontend-pages.txt"

grep -l "Route\|Page" public/index.html src/App.tsx src/components/navigation.tsx 2>/dev/null | \
    while read file ; do
        echo "=== Routes from: $file ===" >> "$OUTDIR/frontend-routes_by_file.txt"
        grep -E "Route|path=[\"'\`]|navigate.*\(" "$file" \
            | sed "s|.*path=['\"]\([^'\"]*\)|PATH: \1|" \
            | sed "s|.*'\([^']*\)'}.*|PATH: \1|" \
            | sed "s|.*context='[^']*}|CONTEXT|" \
            >> "$OUTDIR/frontend-routes_by_file.txt"
    done

echo "Frontend pages list written to: $OUTDIR/frontend-pages.txt"
echo "Route hints written to:    $OUTDIR/frontend-routes_by_file.txt"

echo
echo "=== All export files in $OUTDIR: ==="
ls -la "$OUTDIR"
