import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/auth-context';
// We'll dynamically import FronterProvider and other modules after resetModules

// avoid hitting real WAL code during render
vi.mock('@/lib/write-ahead-log', () => ({ walPendingCount: async () => 0 }));

// helper to render layout and get providers after setting env
async function loadLayoutAndProviders() {
  // force module reload so env value is re-read and modules are consistent
  vi.resetModules();
  const [layoutModule, fronModule, llmModule] = await Promise.all([
    import('@/pages/root-layout'),
    import('@/contexts/fronter-context'),
    import('@/contexts/llm-context'),
  ]);
  return {
    RootLayout: layoutModule.RootLayout,
    FronterProvider: fronModule.FronterProvider,
    LLMContextProvider: llmModule.LLMContextProvider,
  };
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
      <AuthProvider>
        <QueryClientProvider client={new QueryClient()}>
          <FronterProvider>
            <LLMContextProvider>
              <BrowserRouter>
                <RootLayout />
              </BrowserRouter>
            </LLMContextProvider>
          </FronterProvider>
        </QueryClientProvider>
      </AuthProvider>
    );
    expect(screen.queryByText('connected')).toBeNull();
  });

  it('shows health bar when env variable is true', async () => {
    (import.meta as any).env.VITE_SHOW_HEALTH_BAR = 'true';
    const RootLayout = await loadLayout();
    render(
      <AuthProvider>
        <QueryClientProvider client={new QueryClient()}>
          <FronterProvider>
            <LLMContextProvider>
              <BrowserRouter>
                <RootLayout />
              </BrowserRouter>
            </LLMContextProvider>
          </FronterProvider>
        </QueryClientProvider>
      </AuthProvider>
    );
    // there should be an element showing 'connected' status
    expect(screen.getByText('connected')).toBeInTheDocument();
  });
});
