{/* eslint-disable */}
import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollections, HARDCODED_COLLECTIONS } from '@/hooks/use-collections';
import { useAuth } from '@/contexts/auth-context';

// mock auth
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn()
}));

// mock usequery specifically for this test to bypass the global mock in setup-test.ts
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useQuery: vi.fn()
  };
});

describe('useCollections filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('filters out pkm_settings and includes hardcoded ones', async () => {
    const mockClient = {
      listCollections: vi.fn().mockResolvedValue({
        data: [
          { name: 'posts', title: 'posts' },
          { name: 'pkm_settings', title: 'pkm settings', hidden: false },
          { name: 'public', title: 'public' },
        ]
      }),
      updateCollection: vi.fn().mockResolvedValue({ data: {} }),
      logout: vi.fn()
    };

    (useAuth as any).mockReturnValue({
      client: mockClient,
      isAuthenticated: true,
      logout: mockClient.logout
    });

    // simulate the usequery behavior including the 'select' transformation
    (useQuery as any).mockImplementation((options: any) => {
      // we simulate the async fetch and then the select
      const rawData = [
        { name: 'posts', title: 'posts' },
        { name: 'pkm_settings', title: 'pkm settings', hidden: false },
        { name: 'public', title: 'public' },
      ];

      const filtered = options.select ? options.select(rawData) : rawData;

      return {
        data: filtered,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      };
    });

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCollections(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    });

    const names = result.current.collections.map(c => c.name.toLowerCase().trim());

    // verify 'journal' from hardcoded is included
    expect(names).toContain('journal');

    // verify 'posts' from api is included
    expect(names).toContain('posts');

    // verify pkm_settings is filtered out
    expect(names).not.toContain('pkm_settings');
  });
});
