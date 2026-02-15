import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppSetting } from '@/hooks/use-app-setting';
import { useAuth } from '@/contexts/auth-context';

// Simple component to use the hook
function TestComp({ settingKey, debounceMs }: { settingKey: string; debounceMs?: number }) {
  const [value, setValue] = useAppSetting(settingKey, null, { debounceMs });
  return (
    <div>
      <button onClick={() => setValue({ foo: 'bar' })}>set</button>
      <span data-testid="value">{JSON.stringify(value)}</span>
    </div>
  );
}

// Check lines 15 in use-app-setting.ts: const { isAuthenticated, token, client } = useAuth();
// We need to mock useAuth to return a client with a request method.
const mockRequest = vi.fn();

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    token: 'tok',
    client: { request: mockRequest }
  }))
}));

describe('useAppSetting upsert behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure localStorage has a token so the hooks don't skip fetch/save
    localStorage.setItem('nocobase_token', 'tok');

    // Default mock response: empty list for initial fetch
    mockRequest.mockResolvedValue({ data: [] });
  });

  it('tries to UPDATE first, and if succesful, does not create', async () => {
    // 1. Initial fetch returns nothing (handled in beforeEach)

    // 2. Setup mock for Update to succeed
    mockRequest.mockImplementation(async (resource, action, options) => {
      if (action === 'list') return { data: [] }; // initial load
      if (action === 'update' && resource === 'pkm_settings') {
        // Simulate successful update returning the updated record
        return { data: [{ id: 123, key: 'x', value: { foo: 'bar' } }] };
      }
      return {};
    });

    render(<TestComp settingKey="x" debounceMs={10} />);
    const btn = screen.getByText('set');
    btn.click(); // Trigger updateValue

    // Wait for async actions
    await waitFor(() => {
      // Should call update
      expect(mockRequest).toHaveBeenCalledWith('pkm_settings', 'update', expect.objectContaining({
        method: 'POST', // The hook uses POST for update with filter
        params: { filter: { key: { $eq: 'x' } } },
        data: { value: { foo: 'bar' } }
      }));

      // Should NOT call create
      expect(mockRequest).not.toHaveBeenCalledWith('pkm_settings', 'create', expect.anything());
    });
  });

  it('tries to UPDATE, if fails/empty, tries to CREATE', async () => {
    mockRequest.mockImplementation(async (resource, action, options) => {
      if (action === 'list') return { data: [] };
      if (action === 'update') {
        // Simulate update returning empty/no match (so logic proceeds to create)
        return { data: [] };
      }
      if (action === 'create') {
        return { data: { id: 200, key: 'y', value: { foo: 'bar' } } };
      }
      return {};
    });

    render(<TestComp settingKey="y" debounceMs={10} />);
    const btn = screen.getByText('set');
    btn.click();

    await waitFor(() => {
      // Should call update first
      expect(mockRequest).toHaveBeenCalledWith('pkm_settings', 'update', expect.anything());

      // Should call create second
      expect(mockRequest).toHaveBeenCalledWith('pkm_settings', 'create', expect.objectContaining({
        method: 'POST',
        data: { key: 'y', value: { foo: 'bar' } }
      }));
    });
  });
});
