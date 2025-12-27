import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollections } from '@/hooks/use-collections';
import { useAuth } from '@/contexts/auth-context';

vi.mock('@/contexts/auth-context', () => ({ useAuth: vi.fn() }));

describe('useCollections filtering', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('filters out pkm_settings by name/title/hidden', async () => {
    const mockClient = {
      listCollections: vi.fn(async () => ({ data: [
        { name: 'posts', title: 'Posts' },
        { name: 'PKM_SETTINGS ', title: 'PKM Settings', hidden: false },
        { name: 'pkm-settings', title: 'PKM Settings', hidden: false },
        { name: 'public', title: 'Public' },
        { name: 'private', title: 'Private', hidden: true }
      ] }))
    };

    (useAuth as any).mockReturnValue({ client: mockClient, isAuthenticated: true });

    const { result, waitForNextUpdate } = renderHook(() => useCollections());
    // wait for initial fetch
    await waitForNextUpdate();

    const names = result.current.collections.map(c => c.name);
    expect(names).toContain('posts');
    expect(names).toContain('public');
    expect(names).not.toContain('PKM_SETTINGS ');
    expect(names).not.toContain('pkm-settings');
    // hidden true should also be excluded
    expect(names).not.toContain('private');
  });
});
