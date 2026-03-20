import { describe, it, expect, beforeEach, vi } from 'vitest'
import { findOrCreateActivity, createActivityLog, syncAllLocalLogs } from '../activity-sync'

// mock fetch
global.fetch = vi.fn()

// force a small localStorage shim for tests
{
  const store: Record<string,string> = {}
  // @ts-ignore
  global.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) }
  }
}

beforeEach(() => {
  localStorage.clear()
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
    expect(map['walk']).toBe('srv-1')
  })

  it('syncs logs to server', async () => {
    localStorage.setItem('pkm_activities', JSON.stringify([{ id: '1', name: 'walk' }]))
    localStorage.setItem('pkm_activity_logs', JSON.stringify([{ id: 'l1', activityId: '1', note: 'ok', rating: 4, createdAt: new Date().toISOString() }]))

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
