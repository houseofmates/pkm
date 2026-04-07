import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  appendOps,
  appendOp,
  getUnsyncedOps,
  markOpsSynced,
  saveCheckpoint,
  getLatestCheckpoint,
  getDrawingMeta,
  updateDrawingMeta,
  listPendingDrawings,
  deleteDrawing,
  getToken,
  setToken,
  clearToken,
  clearMemoryTokens,
  getRecentOps,
  pruneOldOps,
} from '../storage/canvas-db'

const testDrawingId = `test-drawing-${Date.now()}`

const createTestOp = (id: string) => ({
  type: 'path' as const,
  targetId: `target-${id}`,
  layerId: 'default',
  pathData: [['M', 0, 0], ['L', 10, 10]] as [string, number, number][],
  stroke: '#000',
  strokeWidth: 2,
  left: 0,
  top: 0,
})

describe('canvas-db oplog operations', () => {
  beforeEach(() => {
    clearMemoryTokens()
  })

  afterEach(async () => {
    // cleanup test data
    try {
      const pending = await listPendingDrawings()
      for (const drawing of pending) {
        if (drawing.id.startsWith('test-')) {
          await deleteDrawing(drawing.id)
        }
      }
    } catch {
      // ignore cleanup errors
    }
  })

  describe('appendOp', () => {
    it('should append a single operation', async () => {
      const drawingId = `${testDrawingId}-single`
      const op = createTestOp('single')
      const entry = await appendOp(drawingId, op)

      expect(entry.id).toContain(drawingId)
      expect(entry.drawingId).toBe(drawingId)
      expect(entry.op).toEqual(op)
      expect(entry.synced).toBe(false)
      expect(typeof entry.timestamp).toBe('number')
    })

    it('should generate unique ids for each operation', async () => {
      const drawingId = `${testDrawingId}-unique`
      const op1 = createTestOp('a')
      const op2 = createTestOp('b')

      const entry1 = await appendOp(drawingId, op1)
      const entry2 = await appendOp(drawingId, op2)

      expect(entry1.id).not.toBe(entry2.id)
    })
  })

  describe('appendOps (batch)', () => {
    it('should append multiple operations in one transaction', async () => {
      const drawingId = `${testDrawingId}-batch`
      const opA = createTestOp('a')
      const opB = createTestOp('b')

      const entries = await appendOps(drawingId, [opA, opB])

      expect(entries).toHaveLength(2)
      expect(entries[0].id).toContain(drawingId)
      expect(entries[0].drawingId).toBe(drawingId)
    })

    it('should return empty array for empty input', async () => {
      const res = await appendOps(`${testDrawingId}-empty`, [])
      expect(res).toEqual([])
    })

    it('should set correct synced status for new entries', async () => {
      const drawingId = `${testDrawingId}-sync-status`
      const entries = await appendOps(drawingId, [createTestOp('x')])

      expect(entries[0].synced).toBe(false)
    })
  })

  describe('getUnsyncedOps', () => {
    it('should return only unsynced operations', async () => {
      const drawingId = `${testDrawingId}-unsynced`
      const entries = await appendOps(drawingId, [
        createTestOp('u1'),
        createTestOp('u2'),
      ])

      const unsynced = await getUnsyncedOps(drawingId)
      expect(unsynced.length).toBeGreaterThanOrEqual(2)

      const unsyncedIds = unsynced.map(e => e.id)
      expect(unsyncedIds).toEqual(expect.arrayContaining(entries.map(e => e.id)))
    })

    it('should respect limit parameter', async () => {
      const drawingId = `${testDrawingId}-limit`
      await appendOps(drawingId, [
        createTestOp('l1'),
        createTestOp('l2'),
        createTestOp('l3'),
      ])

      const unsynced = await getUnsyncedOps(drawingId, 2)
      expect(unsynced.length).toBeLessThanOrEqual(2)
    })

    it('should return empty array for non-existent drawing', async () => {
      const unsynced = await getUnsyncedOps('non-existent-drawing-xyz')
      expect(unsynced).toEqual([])
    })
  })

  describe('markOpsSynced', () => {
    it('should mark operations as synced', async () => {
      const drawingId = `${testDrawingId}-mark-synced`
      const entries = await appendOps(drawingId, [
        createTestOp('ms1'),
        createTestOp('ms2'),
      ])

      const idsToMark = entries.map(e => e.id)
      await markOpsSynced(idsToMark)

      const unsynced = await getUnsyncedOps(drawingId)
      const markedIds = unsynced.map(e => e.id)
      expect(markedIds).not.toEqual(expect.arrayContaining(idsToMark))
    })

    it('should handle non-existent ids gracefully', async () => {
      await expect(markOpsSynced(['non-existent-id'])).resolves.not.toThrow()
    })

    it('should mark only specified operations', async () => {
      const drawingId = `${testDrawingId}-partial-mark`
      const entries = await appendOps(drawingId, [
        createTestOp('pm1'),
        createTestOp('pm2'),
      ])

      // mark only first operation
      await markOpsSynced([entries[0].id])

      const unsynced = await getUnsyncedOps(drawingId)
      expect(unsynced.some(e => e.id === entries[1].id)).toBe(true)
    })
  })

  describe('getRecentOps', () => {
    it('should return operations in chronological order', async () => {
      const drawingId = `${testDrawingId}-recent`
      const entries = await appendOps(drawingId, [
        createTestOp('r1'),
        createTestOp('r2'),
        createTestOp('r3'),
      ])

      const recent = await getRecentOps(drawingId)
      expect(recent.length).toBeGreaterThanOrEqual(3)

      // should be in chronological order (oldest first)
      for (let i = 1; i < recent.length; i++) {
        expect(recent[i].timestamp).toBeGreaterThanOrEqual(recent[i - 1].timestamp)
      }
    })

    it('should respect limit parameter', async () => {
      const drawingId = `${testDrawingId}-recent-limit`
      await appendOps(drawingId, [
        createTestOp('rl1'),
        createTestOp('rl2'),
        createTestOp('rl3'),
      ])

      const recent = await getRecentOps(drawingId, 2)
      expect(recent.length).toBeLessThanOrEqual(2)
    })
  })

  describe('checkpoint operations', () => {
    it('should save and retrieve checkpoint', async () => {
      const drawingId = `${testDrawingId}-checkpoint`
      const state = { objects: [{ type: 'rect' }], version: 1 }

      await saveCheckpoint(drawingId, state)
      const checkpoint = await getLatestCheckpoint(drawingId)

      expect(checkpoint).toBeDefined()
      expect(checkpoint?.drawingId).toBe(drawingId)
      expect(checkpoint?.state).toEqual(state)
    })

    it('should return undefined for non-existent drawing checkpoint', async () => {
      const checkpoint = await getLatestCheckpoint('non-existent-drawing')
      expect(checkpoint).toBeUndefined()
    })

    it('should keep only last 3 checkpoints', async () => {
      const drawingId = `${testDrawingId}-checkpoint-limit`

      for (let i = 0; i < 5; i++) {
        await saveCheckpoint(drawingId, { version: i })
      }

      const checkpoint = await getLatestCheckpoint(drawingId)
      expect(checkpoint?.state).toEqual({ version: 4 })
    })
  })

  describe('drawing metadata operations', () => {
    it('should create and retrieve drawing metadata', async () => {
      const drawingId = `${testDrawingId}-meta`

      await updateDrawingMeta(drawingId, { title: 'Test Drawing' })
      const meta = await getDrawingMeta(drawingId)

      expect(meta).toBeDefined()
      expect(meta?.id).toBe(drawingId)
      expect(meta?.title).toBe('Test Drawing')
      expect(meta?.syncState).toBe('pending')
    })

    it('should update existing metadata', async () => {
      const drawingId = `${testDrawingId}-meta-update`

      await updateDrawingMeta(drawingId, { title: 'Initial Title' })
      await updateDrawingMeta(drawingId, { title: 'Updated Title', syncState: 'synced' })

      const meta = await getDrawingMeta(drawingId)
      expect(meta?.title).toBe('Updated Title')
      expect(meta?.syncState).toBe('synced')
    })

    it('should set thumbnail', async () => {
      const drawingId = `${testDrawingId}-thumbnail`
      const thumbnail = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      await updateDrawingMeta(drawingId, { thumbnail })
      const meta = await getDrawingMeta(drawingId)

      expect(meta?.thumbnail).toBe(thumbnail)
    })
  })

  describe('listPendingDrawings', () => {
    it('should return drawings with pending sync state', async () => {
      const drawingId = `${testDrawingId}-pending`

      await updateDrawingMeta(drawingId, { title: 'Pending Drawing' })

      const pending = await listPendingDrawings()
      expect(pending.some(d => d.id === drawingId)).toBe(true)
    })
  })

  describe('token operations', () => {
    it('should set and get token', async () => {
      const key = `test-token-${Date.now()}`
      const value = 'test-token-value'

      await setToken(key, value)
      const retrieved = await getToken(key)

      expect(retrieved).toBe(value)
    })

    it('should return undefined for non-existent token', async () => {
      const retrieved = await getToken('non-existent-token-xyz')
      expect(retrieved).toBeUndefined()
    })

    it('should clear token', async () => {
      const key = `test-token-clear-${Date.now()}`
      await setToken(key, 'value')
      await clearToken(key)

      const retrieved = await getToken(key)
      expect(retrieved).toBeUndefined()
    })

    it('should use in-memory cache for tokens', async () => {
      const key = `test-token-cache-${Date.now()}`
      await setToken(key, 'cached-value')

      const retrieved1 = await getToken(key)
      expect(retrieved1).toBe('cached-value')

      clearMemoryTokens()
      const retrieved2 = await getToken(key)
      expect(retrieved2).toBe('cached-value')
    })

    it('should handle token with TTL', async () => {
      const key = `test-token-ttl-${Date.now()}`
      
      // Set token with short TTL
      await setToken(key, 'ttl-value', 0.001) // 0.001 minutes = 60ms

      const immediate = await getToken(key)
      expect(immediate).toBe('ttl-value')

      // Clear memory cache to force IDB read
      clearMemoryTokens()

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      const expired = await getToken(key)
      expect(expired).toBeUndefined()
    })
  })

  describe('pruneOldOps', () => {
    it('should delete old synced operations', async () => {
      const drawingId = `${testDrawingId}-prune`
      await appendOps(drawingId, [
        createTestOp('p1'),
        createTestOp('p2'),
      ])

      // Mark all as synced
      await markOpsSynced(entries.map(e => e.id))

      // Add a new unsynced op
      await appendOp(drawingId, createTestOp('p3'))

      const deleted = await pruneOldOps(drawingId, 1)
      expect(deleted).toBeGreaterThanOrEqual(1)
    })

    it('should not delete unsynced operations', async () => {
      const drawingId = `${testDrawingId}-prune-safe`
      const unsyncedEntry = await appendOp(drawingId, createTestOp('ps1'))

      await pruneOldOps(drawingId, 0)

      const unsynced = await getUnsyncedOps(drawingId)
      expect(unsynced.some(e => e.id === unsyncedEntry.id)).toBe(true)
    })
  })

  describe('deleteDrawing', () => {
    it('should delete drawing and its metadata', async () => {
      const drawingId = `${testDrawingId}-delete`

      await updateDrawingMeta(drawingId, { title: 'To Be Deleted' })
      await deleteDrawing(drawingId)

      const meta = await getDrawingMeta(drawingId)
      expect(meta).toBeUndefined()
    })
  })
})
