import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppSetting } from '@/hooks/use-app-setting';
import * as apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';

// Simple component to use the hook
function TestComp({ settingKey }: { settingKey: string }) {
  const [value, setValue] = useAppSetting(settingKey, null);
  return (
    <div>
      <button onClick={() => setValue({foo: 'bar'})}>set</button>
      <span data-testid="value">{JSON.stringify(value)}</span>
    </div>
  );
}

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true, token: 'tok' }))
}));

describe('useAppSetting upsert behaviors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('recovers from 400 key exists by fetching and updating', async () => {
    const api = vi.spyOn(apiClient, 'apiRequest');

    // Sequence control
    api.mockImplementation(async (type: any, endpoint: string, options: any) => {
      if (endpoint === '/pkm_settings' && options.method === 'POST') {
        const err: any = new Error('Key already exists');
        err.status = 400;
        err.data = { message: 'Key already exists' };
        throw err;
      }
      if (endpoint === '/pkm_settings' && (!options.method || options.method === 'GET')) {
        return { data: [{ id: 123, key: 'x', value: {foo: 'old'} }] };
      }
      if (endpoint === '/pkm_settings/123' && options.method === 'PUT') {
        return { data: { id: 123 } };
      }
      return {};
    });

    render(<TestComp settingKey="x" />);
    const btn = screen.getByText('set');
    btn.click();

    await waitFor(() => {
      // ensure api called for POST then GET then PUT
      expect(api).toHaveBeenCalledWith('nocobase', '/pkm_settings', expect.any(Object));
      expect(api).toHaveBeenCalledWith('nocobase', '/pkm_settings', expect.any(Object));
      expect(api).toHaveBeenCalledWith('nocobase', '/pkm_settings/123', expect.objectContaining({ method: 'PUT' }));
    });
  });

  it('creates collection on 404 and retries upsert', async () => {
    const api = vi.spyOn(apiClient, 'apiRequest');

    let createCalled = false;

    api.mockImplementation(async (type: any, endpoint: string, options: any) => {
      if (endpoint === '/pkm_settings' && options.method === 'POST' && !createCalled) {
        const err: any = new Error('Not Found');
        err.status = 404;
        err.data = { message: 'Collection not found' };
        throw err;
      }
      if (endpoint === '/collections' && options.method === 'POST') {
        createCalled = true;
        return { data: { id: 99 } };
      }
      if (endpoint === '/pkm_settings' && options.method === 'POST' && createCalled) {
        return { data: { id: 200 } };
      }
      return {};
    });

    render(<TestComp settingKey="y" />);
    const btn = screen.getByText('set');
    btn.click();

    await waitFor(() => {
      expect(createCalled).toBe(true);
      expect(api).toHaveBeenCalledWith('nocobase', '/collections', expect.objectContaining({ method: 'POST' }));
      expect(api).toHaveBeenCalledWith('nocobase', '/pkm_settings', expect.objectContaining({ method: 'POST' }));
    });
  });
});
