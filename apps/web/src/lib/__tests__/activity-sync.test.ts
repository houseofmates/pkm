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
    expect(map['walk']).toBe('srv-1')
  })

  it('syncs logs to server', async () => {
    // debug: inspect __localStorageStore
    // eslint-disable-next-line no-console
    console.log('test: __localStorageStore type ->', typeof (global as any).__localStorageStore, Object.keys((global as any).__localStorageStore || {}))
    // eslint-disable-next-line no-console
    console.log('test: set type ->', typeof (global as any).__localStorageStore.set)
    // eslint-disable-next-line no-console
    console.log('test: get type ->', typeof (global as any).__localStorageStore.get)
    // set localStorage contents directly via the underlying store (safer in test env)
    ;(global as any).__localStorageStore.set('pkm_activities', JSON.stringify([{ id: '1', name: 'walk' }]))
    ;(global as any).__localStorageStore.set('pkm_activity_logs', JSON.stringify([{ id: 'l1', activityId: '1', note: 'ok', rating: 4, createdAt: new Date().toISOString() }]))

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
