import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// helper to render layout after setting env
async function loadLayout() {
  // force module reload so env value is re-read
  vi.resetModules();
  const layoutModule = await import('@/pages/root-layout');
  return layoutModule.RootLayout;
}

describe('RootLayout', () => {
  beforeEach(() => {
    // ensure env object exists and isn't frozen
    if (!(import.meta as any).env) {
      (import.meta as any).env = {};
    }
  });

  it('does not render health bar by default', async () => {
    delete (import.meta as any).env.VITE_SHOW_HEALTH_BAR;
    const RootLayout = await loadLayout();
    render(
      <BrowserRouter>
        <RootLayout />
      </BrowserRouter>
    );
    expect(screen.queryByText('connected')).toBeNull();
  });

  it('shows health bar when env variable is true', async () => {
    (import.meta as any).env.VITE_SHOW_HEALTH_BAR = 'true';
    const RootLayout = await loadLayout();
    render(
      <BrowserRouter>
        <RootLayout />
      </BrowserRouter>
    );
    // there should be an element showing 'connected' status
    expect(screen.getByText('connected')).toBeInTheDocument();
  });
});
