import { describe, it, expect } from 'vitest'
import { appendOps, appendOp, getUnsyncedOps, markOpsSynced, saveCheckpoint, getLatestCheckpoint } from '../storage/canvas-db'

describe('canvas-db appendops', () => {
  it('should append multiple operations in one transaction', async () => {
    const drawingId = `test-multi-${Date.now()}`

    const opA = {
      type: 'path' as const,
      layerId: 'default',
      pathData: [['M', 0, 0], ['L', 10, 10]],
      stroke: '#000',
      strokeWidth: 2,
      left: 0,
      top: 0,
    }

    const opB = {
      type: 'path' as const,
      layerId: 'default',
      pathData: [['M', 1, 1], ['L', 11, 11]],
      stroke: '#111',
      strokeWidth: 3,
      left: 0,
      top: 0,
    }

    const entries = await appendOps(drawingId, [opA, opB])
    expect(entries).toHaveLength(2)
    expect(entries[0].id).toContain(drawingId)

    const unsynced = await getUnsyncedOps(drawingId)
    expect(unsynced.length).toBeGreaterThanOrEqual(2)
    const ids = unsynced.map((e) => e.id)
    expect(ids).toEqual(expect.arrayContaining(entries.map((e) => e.id)))
  })

  it('appendOps with empty array returns empty list', async () => {
    const res = await appendOps(`test-empty-${Date.now()}`, [])
    expect(res).toEqual([])
  })
})
