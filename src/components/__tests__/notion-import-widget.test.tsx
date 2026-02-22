import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotionImportWidget } from '../notion-import-widget';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

// fake EventSource for tests
global.EventSource = class {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  url: string;
  listeners: Record<string, Function> = {};
  constructor(url: string) {
    this.url = url;
  }
  addEventListener(ev: string, fn: Function) {
    this.listeners[ev] = fn;
  }
  set onmessage(fn: Function) {
    this.listeners['message'] = fn;
  }
  close() {}
};

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
});