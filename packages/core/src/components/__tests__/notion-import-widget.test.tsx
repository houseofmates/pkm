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

  listeners: Record<string, Function> = {};

  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
    this.url = typeof url === 'string' ? url : url.toString();
    if (eventSourceInitDict && eventSourceInitDict.withCredentials) {
      this.withCredentials = eventSourceInitDict.withCredentials;
    }
  }

  addEventListener(ev: string, fn: EventListenerOrEventListenerObject) {
    this.listeners[ev] = fn;
  }
  removeEventListener(ev: string, fn: EventListenerOrEventListenerObject) {
    delete this.listeners[ev];
  }
  dispatchEvent(event: Event): boolean {
    const fn = this.listeners[event.type];
    if (fn) {
      if (typeof fn === 'function') fn(event);
      else if (typeof fn.handleEvent === 'function') fn.handleEvent(event);
      return true;
    }
    return false;
  }
  close() {}

  // @ts-ignore: This is required for interface compatibility
  prototype: EventSource;
}

global.EventSource = MockEventSource as any;

describe('NotionImportWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  it('logs error when no API key is set', async () => {
    render(<NotionImportWidget />);
    const fileInput = screen.getByRole('textbox', { hidden: true }) || screen.getByLabelText(/upload/i);
    // manually find file input
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

  it('builds a relative /api URL by default', async () => {
    // ensure no env override
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_URL: undefined }, writable: true });
    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = { ok: false, status: 400, statusText: 'err', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = (fetch as any).mock.calls[0][0];
    expect(calledUrl).toMatch(/^\/api\/(nb-import)/);
  });

  it('respects VITE_API_URL when provided', async () => {
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_URL: 'https://custom.example' }, writable: true });
    localStorage.setItem('hom_api_key', 'key');
    const fakeResponse = { ok: false, status: 400, statusText: 'err', text: async () => '' };
    (fetch as any).mockResolvedValue(fakeResponse);
    render(<NotionImportWidget />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/start import/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = (fetch as any).mock.calls[0][0];
    expect(calledUrl).toMatch(/^https:\/\/custom\.example\/nb-import/);
  });

  it('rewrites the official api domain to relative when running on pkmsubdomain', async () => {
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_URL: 'https://api.houseofmates.space' }, writable: true });
    // fake frontend hostname
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
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = (fetch as any).mock.calls[0][0];
    expect(calledUrl).toMatch(/^\/api\/nb-import/);
  });
});