import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// We'll dynamically import AuthProvider, FronterProvider and other modules after resetModules


// avoid hitting real WAL code during render
vi.mock('@/lib/write-ahead-log', () => ({ walPendingCount: async () => 0 }));

// helper to render layout and get providers after setting env
// accepts an optional envOverrides object which will be merged into import.meta.env
async function loadLayoutAndProviders(envOverrides: Record<string, string> = {}) {
  // force module reload so env value is re-read and modules are consistent
  vi.resetModules();
  // apply overrides after reset so they aren't wiped out
  (import.meta as any).env = { ...(import.meta as any).env || {}, ...envOverrides };

  const [layoutModule, authModule, fronModule, llmModule] = await Promise.all([
    import('@/pages/root-layout'),
    import('@/contexts/auth-context'),
    import('@/contexts/fronter-context'),
    import('@/contexts/llm-context'),
  ]);
  return {
    RootLayout: layoutModule.RootLayout,
    AuthProvider: authModule.AuthProvider,
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
    // ensure env default state has no flag
    delete (import.meta as any).env.VITE_SHOW_HEALTH_BAR;
    const { RootLayout, AuthProvider, FronterProvider, LLMContextProvider } = await loadLayoutAndProviders();
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
    const { RootLayout, AuthProvider, FronterProvider, LLMContextProvider } = await loadLayoutAndProviders({ VITE_SHOW_HEALTH_BAR: 'true' });
    // debug: inspect constant and function body
    console.log('env after load', (import.meta as any).env.VITE_SHOW_HEALTH_BAR);
    console.log('RootLayout source:', RootLayout.toString());
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
