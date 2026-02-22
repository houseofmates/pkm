import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotionImportWidget } from '@/components/notion-import-widget';
import { vi, describe, it, beforeEach, expect } from 'vitest';

// mock useAppSetting hook so we can control returned apiKey
vi.mock('@/hooks/use-app-setting', () => ({
  useAppSetting: vi.fn(() => ['', vi.fn()])
}));
import { useAppSetting } from '@/hooks/use-app-setting';

// fake EventSource for tests
class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  url: string;
  readyState = MockEventSource.CONNECTING;
  withCredentials = false;
  listeners: Record<string, Function> = {};
  onerror: ((ev: any) => void) | null = null;
  onopen: ((ev: any) => void) | null = null;
  onmessage: ((ev: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }
  addEventListener(ev: string, fn: Function) {
    this.listeners[ev] = fn;
  }
  removeEventListener(ev: string, fn: Function) {
    if (this.listeners[ev] === fn) {
      delete this.listeners[ev];
    }
  }
  dispatchEvent(ev: any) {
    const fn = this.listeners[ev.type];
    if (fn) fn(ev);
  }
  close() {
    this.readyState = MockEventSource.CLOSED;
  }
}
(global as any).EventSource = MockEventSource;

describe('NotionImportWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
    // ensure hook returns no key by default
    (useAppSetting as any).mockReturnValue(['', vi.fn()]);
  });

  it('logs both raw and rewritten VITE_API_URL values', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    process.env.VITE_API_URL = 'https://api.houseofmates.space/api';
    // provide a key so startImport doesn't bail out early
    localStorage.setItem('hom_api_key', 'key');
    render(<NotionImportWidget />);
    // choose a file to allow startImport to proceed
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => expect(debugSpy).toHaveBeenCalled());
    const msg = (debugSpy.mock.calls[0] || []).join(' ');
    expect(msg).toContain('raw VITE_API_URL= https://api.houseofmates.space/api');
    expect(msg).toMatch(/env VITE_API_URL= ?(?:\/api|)/);
    debugSpy.mockRestore();
  });

  it('logs error when no API key is set', async () => {
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/missing api key/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error when fetch returns non-ok status', async () => {
    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => '',
    };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/upload failed: 404/i)).toBeInTheDocument();
    });
  });

  it('handles invalid JSON from server gracefully', async () => {
    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = {
      ok: true,
      json: async () => { throw new Error('bad'); }
    };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/invalid JSON response/i)).toBeInTheDocument();
    });
  });

  it('uses api key from app setting when provided', async () => {
    // override hook mock to return a value
    (useAppSetting as any).mockReturnValue(['my-app-key', vi.fn()]);
    const fakeResponse = { ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'no' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/upload failed: 401/i)).toBeInTheDocument();
    });
    // mimic widget logic: trim slash and rewrite old db host if necessary
    let expectedBase = (process.env.VITE_API_URL || '/api').replace(/\/$/, '');
    if (expectedBase.includes('db.houseofmates.space')) {
      expectedBase = expectedBase.replace('db.houseofmates.space', 'api.houseofmates.space');
    }
    expect(fetch).toHaveBeenCalledWith(`${expectedBase}/nb-import`, expect.objectContaining({
      headers: { Authorization: 'Bearer my-app-key' }
    }));
  });

  it('rewrites official api.houseofmates.space to relative when on pkm subdomain', async () => {
    // simulate build-time env var and location
    process.env.VITE_API_URL = 'https://api.houseofmates.space';
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = new URL('https://pkm.houseofmates.space/');

    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = { ok: false, status: 400, statusText: 'err', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/upload failed: 400/i)).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith(`/api/nb-import`, expect.any(Object));

    // cleanup
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    delete process.env.VITE_API_URL;
  });


  it('polls logs endpoint for updates', async () => {
    (useAppSetting as any).mockReturnValue(['key', vi.fn()]);
    const fakeUpload = { ok: true, json: async () => ({ taskId: 't1' }) };
    const fakeLogs = { ok: true, json: async () => ({ status: 'done', logs: ['foo', 'bar'] }) };
    // first fetch is upload, second+ are polls
    let call = 0;
    (fetch as any).mockImplementation(() => {
      call++;
      return call === 1 ? Promise.resolve(fakeUpload) : Promise.resolve(fakeLogs);
    });
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/foo/)).toBeInTheDocument();
      expect(screen.getByText(/bar/)).toBeInTheDocument();
      expect(screen.getByText(/import done/)).toBeInTheDocument();
    });
    // verify URL used (mimic actual widget logic)
    let expectedBase: string;
    if (process.env.VITE_API_URL) {
      expectedBase = process.env.VITE_API_URL.replace(/\/$/, '');
      if (expectedBase.includes('db.houseofmates.space')) {
        expectedBase = expectedBase.replace('db.houseofmates.space', 'api.houseofmates.space');
      }
      // if env var points to api.houseofmates.space and we're on a
      // houseofmates.subdomain, widget rewrites to relative; but our
      // test cases don't cover that here.
    } else {
      const { protocol, hostname } = window.location;
      if (!hostname.endsWith('.houseofmates.space')) {
        let host = hostname;
        if (hostname.startsWith('pkm.')) {
          host = hostname.replace(/^pkm\./, 'db.');
        }
        expectedBase = `${protocol}//${host}/api`;
      } else {
        expectedBase = '/api';
      }
    }
    expect(fetch).toHaveBeenCalledWith(`${expectedBase}/notion-import/t1/logs`, expect.objectContaining({
      headers: { Authorization: 'Bearer key' }
    }));
  });

  it('infers db host when VITE_API_URL unset and hostname starts with pkm', async () => {
    localStorage.setItem('hom_api_key','key');
    const fakeResponse = { ok: false, status: 400, statusText: 'Bad', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    // temporarily remove env variable
    const original = process.env.VITE_API_URL;
    delete process.env.VITE_API_URL;
    // simulate running on pkm domain by overriding location object
    const originalLocation = window.location;
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'pkm.example.com' },
      writable: true,
    });

    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/upload failed: 400/i)).toBeInTheDocument();
    });
    const expectedHost = `${window.location.protocol}//db.example.com/api`;
    expect(fetch).toHaveBeenCalledWith(`${expectedHost}/nb-import`, expect.any(Object));
    // restore
    process.env.VITE_API_URL = original;
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('ignores literal "null" string from storage', async () => {
    localStorage.setItem('hom_api_key', 'null');
    const fakeResponse = { ok: false, status: 400, statusText: 'Bad', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/missing api key/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});