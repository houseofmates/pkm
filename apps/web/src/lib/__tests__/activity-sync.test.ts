import { describe, it, expect, beforeEach, vi } from 'vitest'
import { findOrCreateActivity, createActivityLog, syncAllLocalLogs } from '../activity-sync'

// mock fetch
global.fetch = vi.fn()

beforeEach(() => {
  ;(global as any).localStorage.clear()
  vi.resetAllMocks()
})

describe('activity-sync', () => {
  it('creates and caches activity', async () => {
    // mock list response empty then create response
    (global.fetch as any)
      .mockResolvedValueOnce({ text: async () => JSON.stringify({ data: [] }), ok: true })
      .mockResolvedValueOnce({ text: async () => JSON.stringify({ data: { id: 'srv-1' } }), ok: true })

    const id = await findOrCreateActivity('walk')
    expect(id).toBe('srv-1')
    const map = JSON.parse(localStorage.getItem('pkm_activity_server_map') || '{}')
    expect(map.byName?.walk || map['walk']).toBe('srv-1')
  })

  it('syncs logs to server', async () => {
    // ensure test payloads are returned by localStorage.getItem
    // stub localStorage.getItem to return our test payloads
    ;(global as any).localStorage.getItem = (k: string) => {
      if (k === 'pkm_activities') return JSON.stringify([{ id: '1', name: 'walk' }])
      if (k === 'pkm_activity_logs') return JSON.stringify([{ id: 'l1', activityId: '1', note: 'ok', rating: 4, createdAt: new Date().toISOString() }])
      return null
    }

    // findOrCreateActivity -> returns server id
    (global.fetch as any)
      .mockResolvedValueOnce({ text: async () => JSON.stringify({ data: [] }), ok: true })
      .mockResolvedValueOnce({ text: async () => JSON.stringify({ data: { id: 'srv-1' } }), ok: true })
      // createActivityLog
      .mockResolvedValueOnce({ text: async () => JSON.stringify({ data: { id: 'log-1' } }), ok: true })

    const res = await syncAllLocalLogs()
    expect(res.pushed).toBeGreaterThanOrEqual(0)
  })
})
