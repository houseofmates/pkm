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

  it('constructs stream URL from same base as upload', async () => {
    (useAppSetting as any).mockReturnValue(['key', vi.fn()]);
    const fakeResponse = { ok: true, json: async () => ({ taskId: 't1' }) };
    (fetch as any).mockResolvedValue(fakeResponse);
    const esSpy = vi.fn();
    global.EventSource = class {
      constructor(url: string) {
        esSpy(url);
      }
      addEventListener() {}
      set onmessage(_) {}
      close() {}
    } as any;
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(esSpy).toHaveBeenCalled();
    });
    let expectedBase = (process.env.VITE_API_URL || '/api').replace(/\/$/, '');
    if (expectedBase.includes('db.houseofmates.space')) {
      expectedBase = expectedBase.replace('db.houseofmates.space', 'api.houseofmates.space');
    }
    expect(esSpy).toHaveBeenCalledWith(`${expectedBase}/notion-import/t1/stream`, expect.any(Object));
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