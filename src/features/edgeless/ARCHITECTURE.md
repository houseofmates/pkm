# edgeless canvas architecture

## overview

a production-ready, offline-first canvas drawing system with oplog-based history and spatial indexing.

## key features

1. **oplog-based storage**: all operations stored as immutable log entries
2. **indexeddb backend**: fast, async storage with idb library
3. **spatial indexing**: uniform grid for o(1) object lookup
4. **batch sync**: 5-second intervals or 50 operations to nocobase
5. **error recovery**: comprehensive error boundaries and emergency backups

## architecture diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      ui layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   toolbar    │  │   canvas     │  │  canvas controls │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                   state management                           │
│                    (zustand store)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  drawing state  │  history (oplog)  │  spatial index │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                   storage layer                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   oplog    │  │ checkpoints│  │   drawing metadata   │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│                         │                                    │
│                   indexeddb (idb)                            │
└─────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                    sync layer                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         batch sync to nocobase (5s/50 ops)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## operation log (oplog)

every stroke, erase, or transform is recorded as an operation:

```typescript
interface OpLogEntry {
  id: string          // client-generated uuid
  drawingId: string   // parent drawing
  timestamp: number   // unix ms
  op: DrawOp          // operation data
  synced: boolean     // server ack status
}

type DrawOp =
  | { type: 'path'; layerId: string; pathData: any[]; stroke: string; strokeWidth: number; left: number; top: number }
  | { type: 'erase'; targetId: string; layerId: string; segmentsKept: any[][] }
  | { type: 'transform'; targetId: string; layerId: string; matrix: any; position: any; scale: any; angle: number }
  | { type: 'delete'; targetId: string; layerId: string }
  | { type: 'layer-create'; layerId: string; name: string }
  | { type: 'layer-delete'; layerId: string }
```

## spatial indexing

uniform grid with 100px cells for fast hit detection:

```typescript
const index = new SpatialIndex(cellSize: 100)
index.insert({ id, bounds, layerId, visible, ref })
index.queryRadius(x, y, radius)  // o(1) average
index.querySegment(x1, y1, x2, y2) // line intersection
```

## checkpoints

full canvas state snapshots saved periodically:
- every 50 operations
- every 30 seconds during active drawing
- before major operations (import, clear)

only last 3 checkpoints kept per drawing.

## sync protocol

1. collect unsynced ops from oplog
2. batch by count (50) or time (5s)
3. send to nocobase `pkm_canvases` collection
4. handle conflicts with last-write-wins
5. mark ops as synced on success

## error recovery

multiple layers of protection:

1. **error boundary**: catches react rendering errors
2. **global error handler**: catches uncaught exceptions
3. **emergency checkpoint**: auto-saves on memory pressure
4. **storage health check**: validates idb before operations

## migration from legacy

automatic migration from localstorage/lzstring:

```typescript
import { migrateFromLocalStorage } from '@/features/edgeless'

const result = await migrateFromLocalStorage()
// { migrated: 5, failed: 0, skipped: 2 }
```

## usage

```typescript
import { useEdgelessStore, CanvasErrorBoundary } from '@/features/edgeless'

// in router:
<CanvasErrorBoundary>
  <DrawingPage />
</CanvasErrorBoundary>

// recording operations:
const { recordOp } = useEdgelessStore()
await recordOp({
  type: 'path',
  layerId: 'default',
  pathData: [...],
  stroke: '#f6b012',
  strokeWidth: 2,
  left: 100,
  top: 100,
})
```

## performance targets

- initial load: < 500ms for 1000 ops
- stroke rendering: < 16ms
- eraser hit test: < 1ms with spatial index
- memory usage: < 100mb for complex drawings
- sync latency: < 5s for batch upload

## configuration

environment variables:

```
VITE_API_URL=http://localhost:4100/api
VITE_BACKEND_URL=http://localhost:4100
VITE_PUBLIC_ACCESS_TOKEN=optional_token_for_anon_access
```
