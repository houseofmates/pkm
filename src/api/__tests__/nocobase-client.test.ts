import { describe, it, expect, vi, afterEach } from 'vitest'
import { api } from '../nocobase-client'

describe('nocobase client createRecord', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should inject entity_type: "note" when creating notes if missing', async () => {
    const spy = vi.spyOn(api.client, 'post').mockResolvedValue({ data: { data: { id: 'ok' } } })

    await api.createRecord('notes', { title: 'my note' } as any)

    expect(spy).toHaveBeenCalled()
    const callArgs = spy.mock.calls[0]
    expect(callArgs[0]).toBe('/notes:create')
    expect(callArgs[1]).toMatchObject({ title: 'my note', entity_type: 'note' })
  })

  it('should not overwrite existing entity_type when provided', async () => {
    const spy = vi.spyOn(api.client, 'post').mockResolvedValue({ data: { data: { id: 'ok' } } })

    await api.createRecord('notes', { title: 'x', entity_type: 'custom' } as any)

    expect(spy).toHaveBeenCalled()
    const callArgs = spy.mock.calls[0]
    expect(callArgs[1]).toMatchObject({ title: 'x', entity_type: 'custom' })
  })
})
