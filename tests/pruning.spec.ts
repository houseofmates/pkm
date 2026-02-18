import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pruneOldOps } from '@/features/edgeless/storage/canvas-db'
import { getCanvasDB } from '@/features/edgeless/storage/canvas-db'
import 'fake-indexeddb/auto'

describe('Pruning', () => {
  beforeEach(async () => {
    const db = await getCanvasDB()
    const tx = db.transaction('oplog', 'readwrite')
    await tx.store.clear()
    await tx.done
  })

  it('prunes old synced ops', async () => {
    const drawingId = 'prune-test-1'

    const db = await getCanvasDB()
    const tx = db.transaction('oplog', 'readwrite')

    for (let i = 0; i < 1000; i++) {
      await tx.store.put({
        id: `op-${i}`,
        drawingId,
        timestamp: 1000 + i,
        op: { type: 'rect' },
        synced: true
      })
    }
    await tx.done

    const deleted = await pruneOldOps(drawingId, 500)
    expect(deleted).toBe(500)

    const remaining = await db.getAllFromIndex('oplog', 'by-drawing', drawingId)
    expect(remaining.length).toBe(500)
    const oldest = remaining.sort((a, b) => a.timestamp - b.timestamp)[0]
    expect(oldest.timestamp).toBe(1500)
  })

  it('does not prune unsynced ops even if old', async () => {
    const drawingId = 'prune-test-2'
    const db = await getCanvasDB()
    const tx = db.transaction('oplog', 'readwrite')

    for (let i = 0; i < 600; i++) {
      await tx.store.put({
        id: `op-${i}`,
        drawingId,
        timestamp: 1000 + i,
        op: { type: 'rect' },
        synced: i >= 100 // first 100 unsynced
      })
    }
    await tx.done

    const deleted = await pruneOldOps(drawingId, 500)
    expect(deleted).toBe(0)

    const remaining = await db.getAllFromIndex('oplog', 'by-drawing', drawingId)
    expect(remaining.length).toBe(600)
  })

  it('prunes mixed synced/unsynced correctly', async () => {
    const drawingId = 'prune-test-3'
    const db = await getCanvasDB()
    const tx = db.transaction('oplog', 'readwrite')

    for (let i = 0; i < 600; i++) {
      await tx.store.put({
        id: `op-${i}`,
        drawingId,
        timestamp: 1000 + i,
        op: { type: 'rect' },
        synced: (i < 50) || (i >= 100)
      })
    }
    await tx.done

    const deleted = await pruneOldOps(drawingId, 500)
    expect(deleted).toBe(50)

    const remaining = await db.getAllFromIndex('oplog', 'by-drawing', drawingId)
    expect(remaining.length).toBe(550)
  })
})
