import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotionImportWidget } from '../notion-import-widget';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

// fake EventSource for tests
class MockEventSource implements EventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  url: string;
  withCredentials = false;
  readyState = MockEventSource.CONNECTING;
  onerror: ((this: EventSource, ev: Event) => any) | null = null;
  onopen: ((this: EventSource, ev: Event) => any) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;

  private listeners = new Map<string, EventListenerOrEventListenerObject>();

  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
    this.url = typeof url === 'string' ? url : url.toString();
    if (eventSourceInitDict && eventSourceInitDict.withCredentials) {
      this.withCredentials = eventSourceInitDict.withCredentials;
    }
  }

  addEventListener: EventSource['addEventListener'] = (type: any, listener: any) => {
    this.listeners.set(type, listener);
  };
  removeEventListener: EventSource['removeEventListener'] = (type: any) => {
    this.listeners.delete(type);
  };
  dispatchEvent(event: Event): boolean {
    const listener = this.listeners.get(event.type);
    if (!listener) return false;
    if (typeof listener === 'function') {
      listener.call(this, event);
      return true;
    }
    if (typeof (listener as EventListenerObject).handleEvent === 'function') {
      (listener as EventListenerObject).handleEvent(event);
      return true;
    }
    return false;
  }
  close() {}

}

global.EventSource = MockEventSource as any;

const setTestLocation = (overrides: Partial<Location>) => {
  (globalThis as any).__HOM_TEST_LOCATION__ = {
    host: overrides.host,
    hostname: overrides.hostname,
    origin: overrides.origin,
    protocol: overrides.protocol,
  };
};

const setTestBackend = (url?: string) => {
  (globalThis as any).__HOM_TEST_BACKEND_URL__ = url;
};

// widget rejects uploads smaller than 64 bytes before auth or fetch
const MIN_IMPORT_BYTES = 64;
function makeImportFile(name = 'a.zip', type = 'application/zip') {
  return new File([new Uint8Array(MIN_IMPORT_BYTES).fill(97)], name, { type });
}

describe('NotionImportWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
    setTestLocation({ host: 'localhost', hostname: 'localhost', origin: 'http://localhost', protocol: 'http:' });
    setTestBackend(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (globalThis as any).__HOM_TEST_LOCATION__ = undefined;
    setTestBackend(undefined);
  });

  it('logs error when no API key is set', async () => {
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeImportFile();
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
    const file = makeImportFile();
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
    const file = makeImportFile();
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(screen.getByText(/invalid JSON response/i)).toBeInTheDocument();
    });
  });

  it('builds a relative /api URL by default', async () => {
    // ensure no env override
    Object.defineProperty(import.meta, 'env', { value: { VITE_BACKEND_URL: undefined }, writable: true });
    setTestBackend(undefined);
    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = { ok: false, status: 400, statusText: 'err', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeImportFile();
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = (fetch as any).mock.calls[0][0];
    expect(calledUrl).toMatch(/^\/api\/nb-import-csv/);
  });

  it('respects VITE_BACKEND_URL when provided', async () => {
    Object.defineProperty(import.meta, 'env', { value: { VITE_BACKEND_URL: undefined }, writable: true });
    setTestBackend('https://custom.example');
    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = { ok: false, status: 400, statusText: 'err', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeImportFile();
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = (fetch as any).mock.calls[0][0];
    expect(calledUrl).toMatch(/^https:\/\/custom\.example\/nb-import-csv/);
  });

  it('rewrites the official api domain to relative when running on pkmsubdomain', async () => {
    Object.defineProperty(import.meta, 'env', { value: { VITE_BACKEND_URL: undefined }, writable: true });
    setTestBackend('https://api.houseofmates.space');
    setTestLocation({
      host: 'pkm.houseofmates.space',
      hostname: 'pkm.houseofmates.space',
      protocol: 'https:',
      origin: 'https://pkm.houseofmates.space',
    });

    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = { ok: false, status: 400, statusText: 'err', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeImportFile();
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = (fetch as any).mock.calls[0][0];
    expect(calledUrl).toMatch(/^\/api\/nb-import-csv/);
  });
});