import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollections } from '@/hooks/use-collections';
import { useAuth } from '@/contexts/auth-context';
import React from 'react';

vi.mock('@/contexts/auth-context', () => ({ useAuth: vi.fn() }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useCollections filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('filters out pkm_settings by name/title/hidden', async () => {
    const mockClient = {
      listCollections: vi.fn(async () => ({ data: [
        { name: 'posts', title: 'Posts' },
        { name: 'PKM_SETTINGS ', title: 'PKM Settings', hidden: false },
        { name: 'pkm-settings', title: 'PKM Settings', hidden: false },
        { name: 'public', title: 'Public' },
        { name: 'private', title: 'Private', hidden: true }
      ] })),
      updateCollection: vi.fn(async (name: string, data: any) => ({ data: { name, ...data } }))
    };

    (useAuth as any).mockReturnValue({ client: mockClient, isAuthenticated: true });

    const { result } = renderHook(() => useCollections(), { wrapper });
    // wait for client.listCollections to be called, then for the collections to populate
    await waitFor(() => expect(mockClient.listCollections).toHaveBeenCalled());
    await waitFor(() => expect(result.current.collections.length).toBeGreaterThan(0));

    const names = result.current.collections.map(c => c.name);
    expect(names).toContain('posts');
    expect(names).toContain('public');
    expect(names).not.toContain('PKM_SETTINGS ');
    expect(names).not.toContain('pkm-settings');
    // hidden true should also be excluded
    expect(names).not.toContain('private');

    // Ensure we attempted to hide server collection when returned as visible
    await waitFor(() => expect(mockClient.updateCollection).toHaveBeenCalledWith('PKM_SETTINGS ', expect.objectContaining({ hidden: true })));

  });
});
