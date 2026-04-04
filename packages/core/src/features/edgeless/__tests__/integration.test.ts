import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getCanvasDB, appendOp, appendOps, getUnsyncedOps, markOpsSynced, saveCheckpoint, getLatestCheckpoint } from '../storage/canvas-db'
import { SpatialIndex } from '../spatial/spatial-index'
import { canvasSync } from '../sync/canvas-sync'

describe('edgeless canvas integration', () => {
  let drawingId: string

  beforeEach(() => {
    drawingId = `test-${Date.now()}`
  })

  afterEach(async () => {
    // cleanup
    const db = await getCanvasDB()
    await db.clear('oplog')
    await db.clear('checkpoints')
  })

  describe('storage layer', () => {
    it('should append and retrieve operations', async () => {
      const op = {
        type: 'path' as const,
        targetId: 'path-1',
        layerId: 'default',
        pathData: [['M', 0, 0], ['L', 100, 100]],
        stroke: '#f6b012',
        strokeWidth: 2,
        left: 0,
        top: 0,
      }

      const entry = await appendOp(drawingId, op)
      expect(entry.id).toContain(drawingId)
      expect(entry.op).toEqual(op)
      expect(entry.synced).toBe(false)

      const unsynced = await getUnsyncedOps(drawingId)
      expect(unsynced).toHaveLength(1)
      expect(unsynced[0].id).toBe(entry.id)
    })

    it('should allow appending pre-built oplog entries (buffered persistence)', async () => {
      const op = {
        type: 'path' as const,
        targetId: 'path-pre',
        layerId: 'default',
        pathData: [['M', 0, 0], ['L', 50, 50]],
        stroke: '#00ff00',
        strokeWidth: 2,
        left: 0,
        top: 0,
      }
      const fakeEntry = {
        id: `${drawingId}-prebuilt-1`,
        drawingId,
        timestamp: Date.now(),
        op,
        synced: false,
      }

      const entries = await appendOps(drawingId, [fakeEntry])
      expect(entries[0].id).toBe(fakeEntry.id)

      const unsynced = await getUnsyncedOps(drawingId)
      expect(unsynced.map((e) => e.id)).toContain(fakeEntry.id)
    })

    it('should append multiple operations in a single transaction', async () => {
      const op1 = {
        type: 'path' as const,
        layerId: 'default',
        pathData: [['M', 0, 0], ['L', 10, 10]],
        stroke: '#ffffff',
        strokeWidth: 1,
        left: 0,
        top: 0,
      }
      const op2 = {
        type: 'path' as const,
        layerId: 'default',
        pathData: [['M', 10, 10], ['L', 20, 20]],
        stroke: '#000000',
        strokeWidth: 2,
        left: 0,
        top: 0,
      }

      const entries = await appendOps(drawingId, [op1, op2])
      expect(entries).toHaveLength(2)
      const unsynced = await getUnsyncedOps(drawingId)
      const ids = unsynced.map(e => e.id)
      expect(ids).toEqual(expect.arrayContaining(entries.map(e => e.id)))
    })

    it('should mark operations as synced', async () => {
      const op = {
        type: 'path' as const,
        layerId: 'default',
        pathData: [['M', 0, 0]],
        stroke: '#f6b012',
        strokeWidth: 2,
        left: 0,
        top: 0,
      }

      const entry = await appendOp(drawingId, op)
      await markOpsSynced([entry.id])

      const unsynced = await getUnsyncedOps(drawingId)
      expect(unsynced).toHaveLength(0)
    })

    it('should save and retrieve checkpoints', async () => {
      const state = { objects: [{ id: 'test', type: 'path' }] }
      await saveCheckpoint(drawingId, state)

      const checkpoint = await getLatestCheckpoint(drawingId)
      expect(checkpoint).toBeDefined()
      expect(checkpoint?.state).toEqual(state)
      expect(checkpoint?.drawingId).toBe(drawingId)
    })
  })

  describe('spatial index', () => {
    it('should insert and query objects', () => {
      const index = new SpatialIndex(100)

      index.insert({
        id: 'obj-1',
        bounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 },
        layerId: 'default',
        visible: true,
      })

      index.insert({
        id: 'obj-2',
        bounds: { minX: 200, minY: 200, maxX: 250, maxY: 250 },
        layerId: 'default',
        visible: true,
      })

      // query near first object
      const results = index.queryRadius(25, 25, 30)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('obj-1')

      // query both
      const allResults = index.queryRadius(125, 125, 200)
      expect(allResults).toHaveLength(2)
    })

    it('should respect layer filters', () => {
      const index = new SpatialIndex(100)

      index.insert({
        id: 'obj-1',
        bounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 },
        layerId: 'layer-1',
        visible: true,
      })

      index.insert({
        id: 'obj-2',
        bounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 },
        layerId: 'layer-2',
        visible: true,
      })

      index.setLayerFilter('layer-1')
      const results = index.queryRadius(25, 25, 30)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('obj-1')
    })

    it('should query viewport with 20% buffer', () => {
      const index = new SpatialIndex(100)
      // Screen 1000x1000, 20% buffer = 200px
      // World bounds: (0,0) to (1000,1000)
      // Buffered bounds: (-200,-200) to (1200,1200)

      index.insert({
        id: 'visible',
        bounds: { minX: 100, minY: 100, maxX: 200, maxY: 200 },
        layerId: 'default',
        visible: true,
      })

      index.insert({
        id: 'in-buffer',
        bounds: { minX: -150, minY: -150, maxX: -50, maxY: -50 },
        layerId: 'default',
        visible: true,
      })

      index.insert({
        id: 'outside',
        bounds: { minX: -300, minY: -300, maxX: -250, maxY: -250 },
        layerId: 'default',
        visible: true,
      })

      const visibleIds = index.queryViewportIds(0, 0, 1, 1000, 1000, 0.2)
      expect(visibleIds.has('visible')).toBe(true)
      expect(visibleIds.has('in-buffer')).toBe(true)
      expect(visibleIds.has('outside')).toBe(false)
    })
  })

  describe('sync service', () => {
    it('should track sync state', () => {
      const state = canvasSync.getSyncState('test-drawing')
      expect(state.isSyncing).toBe(false)
      expect(state.pendingCount).toBe(0)
      expect(state.lastSyncAt).toBe(0)
    })
  })
})
