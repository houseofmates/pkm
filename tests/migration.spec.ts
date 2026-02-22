import { describe, it, expect, beforeEach, vi } from 'vitest'
import { migrateFromLocalStorage, hasLegacyDrawings } from '@/features/edgeless/storage/migrate'
import { getDrawingMeta, getLatestCheckpoint, listPendingDrawings, deleteDrawing, updateDrawingMeta } from '@/features/edgeless/storage'
import LZString from 'lz-string'

// Mock LZString dynamic import if needed, but real one is better.
// migrate.ts does: const LZString = await import('lz-string')

describe('Migration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('detects legacy drawings', async () => {
    localStorage.setItem('drawing-config-123', JSON.stringify({ title: 'test' }))
    expect(await hasLegacyDrawings()).toBe(true)
  })

  it('returns false if no legacy drawings', async () => {
    expect(await hasLegacyDrawings()).toBe(false)
  })

  it('migrates config and content', async () => {
    const id = 'mig-test-1'
    const config = { title: 'My Drawing', thumbnail: 'thumb-data' }
    const content = { objects: [{ type: 'rect' }] }

    const compressed = LZString.compressToUTF16(JSON.stringify(content))

    localStorage.setItem(`drawing-config-${id}`, JSON.stringify(config))
    localStorage.setItem(`drawing-content-${id}`, compressed)

    const result = await migrateFromLocalStorage()

    expect(result.migrated).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.details[0]).toEqual({ id, status: 'migrated' })

    // Verify DB
    const meta = await getDrawingMeta(id)
    expect(meta).toBeDefined()
    expect(meta?.title).toBe('My Drawing')
    expect(meta?.syncState).toBe('pending')

    const checkpoint = await getLatestCheckpoint(id)
    expect(checkpoint).toBeDefined()
    expect(checkpoint?.state).toEqual(content)

    // original keys should be removed now
    expect(localStorage.getItem(`drawing-config-${id}`)).toBeNull()
    expect(localStorage.getItem(`drawing-content-${id}`)).toBeNull()
  })

  it('handles invalid content gracefully', async () => {
    const id = 'mig-fail-1'
    localStorage.setItem(`drawing-content-${id}`, 'invalid-compressed-data')

    const result = await migrateFromLocalStorage()

    expect(result.migrated).toBe(0)
    expect(result.failed).toBe(1)
    expect(result.details[0].status).toBe('failed')
  })

  it('skips non-drawing keys', async () => {
    localStorage.setItem('some-other-key', 'value')
    const result = await migrateFromLocalStorage()
    expect(result.migrated).toBe(0)
    expect(result.failed).toBe(0)
  })

  it('can list pending drawings and delete them from the database', async () => {
    const id = 'db-test-1'
    // ensure drawing exists
    await updateDrawingMeta(id, { title: 'foo', syncState: 'pending' })
    let list = await listPendingDrawings()
    expect(list.some((d: any) => d.id === id)).toBe(true)

    // delete and ensure it no longer appears
    await deleteDrawing(id)
    list = await listPendingDrawings()
    expect(list.some((d: any) => d.id === id)).toBe(false)
  })
})
