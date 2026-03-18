# pkm performance optimization: large db (10k+) + canvas (1k+ elements)

## current progress

- [x] 1. optimize vector-store.ts pagination (cursor-based, no paginate:false)</new_str
- [x] 2. canvas-db.ts: idb cursors for getunsyncedops/getrecentops (partial - recentops ts fix pending)
- [ ] 3. nocobase-client.ts: add keyset pagination helpers
- [ ] 4. postgres indexes: pkm_canvases(title,updatedat); notes(entity_type,updatedat)
- [ ] 5. redis caching for listrecords (if backend/packages/node middleware exists)
- [ ] 6. canvas render: layered canvases, raf, viewport cull (find edgeless render files first)
- [ ] 7. test: insert 10k notes, measure listrecords time pre/post

## notes
- all comments/ui lowercase
- thread-safe node middleware
- sub-second responses target

## completed
# Canvas Context Menu Task

## Steps:

- [x] Edit `packages/core/src/components/ui/context-menu-custom.tsx` to change the bottom button text from "delete" to "cancel"

## Status
Completed
