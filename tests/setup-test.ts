import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

import React, { type ReactNode, useRef } from 'react';
import { vi, beforeEach, afterEach } from 'vitest';
import type { RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/auth-context';
import { FronterProvider } from '@/contexts/fronter-context';

declare global {
  var __HOM_TEST_LOCATION__: Partial<Location> | undefined;
  var __HOM_TEST_BACKEND_URL__: string | undefined;
}

// ensure window.fetch exists in test environment if needed by some modules
if (typeof (globalThis as any).fetch === 'undefined') {
  (globalThis as any).fetch = () => Promise.resolve({ ok: true, text: async () => '{}' });
}

// mock resizeobserver
global.ResizeObserver = class ResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // immediately trigger with dummy dimensions to simulate ready state
    this.callback([{
      target,
      contentRect: { width: 100, height: 100, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {} } as DOMRectReadOnly,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: []
    }], this);
  }
  unobserve() {}
  disconnect() {}
};

const testingLibraryPromise = vi.importActual<typeof import('@testing-library/react')>('@testing-library/react');

const createTestQueryClient = () =>
  new QueryClient({
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const ProviderWrapper = ({ children }: { children: ReactNode }) => {
  const clientRef = useRef<QueryClient>();
  if (!clientRef.current) {
    clientRef.current = createTestQueryClient();
  }

  return (
    <QueryClientProvider client={clientRef.current}>
      <AuthProvider>
        <FronterProvider>{children}</FronterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

vi.mock('@testing-library/react', async () => {
  const actual = await testingLibraryPromise;
  return {
    ...actual,
    render: (ui: React.ReactElement, options?: RenderOptions) => {
      const { wrapper: userWrapper, ...rest } = options ?? {};
      const CombinedWrapper = ({ children }: { children: ReactNode }) => {
        const tree = <ProviderWrapper>{children}</ProviderWrapper>;
        return userWrapper ? React.createElement(userWrapper, null, tree) : tree;
      };
      return actual.render(ui, { ...rest, wrapper: CombinedWrapper });
    },
  };
});

beforeEach(() => {
  globalThis.__HOM_TEST_LOCATION__ = undefined;
  globalThis.__HOM_TEST_BACKEND_URL__ = undefined;
});

afterEach(async () => {
  const actual = await testingLibraryPromise;
  actual.cleanup();
});
