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

  describe('listRecords normalization', () => {
    afterEach(() => vi.restoreAllMocks());

    const shapes = [
      // plain array response
      { raw: { data: [{ id: 1 }] }, expected: [{ id: 1 }] },
      // nested data
      { raw: { data: { data: [{ id: 2 }], meta: { total: 1 } } }, expected: [{ id: 2 }] },
      // list style
      { raw: { data: { list: [{ id: 3 }], total: 1 } }, expected: [{ id: 3 }] },
      // even flatter list
      { raw: { list: [{ id: 4 }], count: 1 } as any, expected: [{ id: 4 }] },
      // payload itself is array
      { raw: [{ id: 5 }] as any, expected: [{ id: 5 }] },
    ];

    shapes.forEach(({ raw, expected }, idx) => {
      it(`should normalize response shape #${idx + 1}`, async () => {
        vi.spyOn(api.client, 'get').mockResolvedValueOnce({ data: raw });
        const res: any = await api.listRecords('foo');
        expect(res.data).toEqual(expected);
      });
    });
  });
});
