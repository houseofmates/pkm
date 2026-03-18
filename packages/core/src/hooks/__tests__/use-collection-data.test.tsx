import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCollectionData } from '../use-collection-data';
import type { Record as SchemaRecord, TableDefinition } from '../../schema/types';

// simple fake implementations
const makeClient = () => {
  const collections: TableDefinition[] = [];
  const records: SchemaRecord[] = [];

  return {
    getCollection: vi.fn(async (name: string) => ({ data: collections.find(c => c.name === name) })),
    listRecords: vi.fn(async () => ({ data: records })),
    createRecord: vi.fn(async () => ({ id: 'new' })),
    updateRecord: vi.fn(async () => ({})),
    deleteRecord: vi.fn(async () => ({})),
    deleteRecordByFilter: vi.fn(async () => ({})),
    listFields: vi.fn(async () => []),
    createField: vi.fn(async () => ({})),
  };
};

describe('useCollectionData', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  it('loads collection and records on fetchData', async () => {
    const client = makeClient();
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCollectionData(client, 'foo'), { wrapper });

    await act(async () => {
      await result.current.fetchData();
    });

    expect(client.getCollection).toHaveBeenCalledWith('foo');
    expect(result.current.collection).toBeDefined();
    expect(Array.isArray(result.current.records)).toBe(true);
  });

  it('handles create and undo/delete', async () => {
    const client = makeClient();
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCollectionData(client, 'foo'), { wrapper });

    act(() => {
      result.current.setRecords([{ id: '1', foo: 'bar' } as any]);
    });

    await act(async () => {
      await result.current.handleDeleteRecord({ id: '1' } as any);
    });

    expect(result.current.records).toHaveLength(0);
    expect(result.current.restoreRecord).toBeDefined();
  });
});
