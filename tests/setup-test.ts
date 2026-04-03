import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
// provide sensible import.meta.env defaults for tests
if (typeof (globalThis as any).importMetaEnv === 'undefined') {
  (globalThis as any).importMetaEnv = {};
}

// mock react-query context helpers to ensure tests using hooks don't crash
try {
  // create a global test QueryClient so the mock can access it from any scope
  const rq = await vi.importActual<any>('@tanstack/react-query');
  // expose the real module so our mock can reuse its provider component
  (globalThis as any).__REAL_REACT_QUERY_MODULE__ = rq;
  if (!(globalThis as any).__TEST_QUERY_CLIENT__) {
    (globalThis as any).__TEST_QUERY_CLIENT__ = new rq.QueryClient();
  }
  // provide a broad stub for react-query to avoid needing a real provider in tests
  vi.mock('@tanstack/react-query', () => {
    const RealQueryClient = (globalThis as any).__TEST_QUERY_CLIENT__;
    // try to reuse actual react-query provider if available so context-based
    // hooks (useQueryClient) work as expected in components under test
    const rq = (globalThis as any).__REAL_REACT_QUERY_MODULE__;
    // fallback: if we have the actual module (via importActual earlier), use it
    // otherwise the provider will be a passthrough.
    return {
      QueryClient: RealQueryClient?.constructor || class {},
      QueryClientProvider: (props: any) => {
        if (rq && rq.QueryClientProvider && RealQueryClient) {
          return rq.QueryClientProvider({ client: RealQueryClient, children: props.children });
        }
        return props.children;
      },
      useQueryClient: () => RealQueryClient,
      useQuery: (_opts: any) => ({ data: undefined, isLoading: false, error: null, refetch: async () => {} }),
      useMutation: (_opts: any) => ({ mutate: () => {}, isLoading: false }),
      // helpers sometimes imported from react-query
      useIsFetching: () => 0,
      useIsMutating: () => 0,
    };
  });
} catch (e) {
  // ignore if import/mock fails in some environments
}

// ensure import.meta.env exists in jsdom tests as expected by code
if (typeof (global as any).importMeta === 'undefined') {
  (global as any).importMeta = { env: {} };
}
if (!(import.meta as any).env) (import.meta as any).env = {};
// provide common env defaults used in app code
Object.assign((import.meta as any).env, {
  VITE_ENABLE_HEALTH_BAR: (import.meta as any).env.VITE_ENABLE_HEALTH_BAR ?? 'false',
  VITE_APP_VERSION: (import.meta as any).env.VITE_APP_VERSION ?? '0.0.0',
  VITE_NOCOBASE_URL: (import.meta as any).env.VITE_NOCOBASE_URL ?? 'http://localhost:1337',
});
if (typeof (global as any).process === 'undefined') (global as any).process = { env: {} };

// ensure window.fetch exists in test environment if needed by some modules
if (typeof (globalThis as any).fetch === 'undefined') {
  (globalThis as any).fetch = () => Promise.resolve({ ok: true, text: async () => '{}' });
}

// mock browser-only mapping libraries used in some components to avoid ESM/runtime errors
try {
  vi.mock('react-leaflet', () => {
    const React = require('react');
    return {
      MapContainer: (props: any) => React.createElement('div', props, props.children),
      TileLayer: (props: any) => React.createElement('div', props, null),
      Marker: (props: any) => React.createElement('div', props, null),
      useMapEvents: () => ({ flyTo: () => {}, invalidateSize: () => {} }),
      useMap: () => ({ flyTo: () => {} }),
    };
  });
  vi.mock('leaflet', () => {
    const L = {
      Icon: {
        Default: {
          prototype: {},
          mergeOptions: () => {},
        },
      },
      LatLng: function (lat: number, lng: number) { return { lat, lng }; },
    };
    return {
      default: L,
      ...L,
    };
  });
} catch (e) {
  // ignore mocking failures
}

// mock backend server file to avoid vite client-inject transform of server.js during tests
try {
  vi.mock('/home/house/pkm/packages/backend/server.js', () => ({}), { virtual: true });
  vi.mock('../../packages/backend/server.js', () => ({}), { virtual: true });
} catch (e) {
  // ignore
}

// mock fronter/context to avoid needing full provider in many component tests
try {
  vi.mock('@/contexts/fronter-context', () => {
    const React = require('react');
    const defaultValue = {
      activeFronters: [],
      overrides: {},
      members: [],
      switchFronter: async () => {},
    };
    return {
      FronterProvider: (props: any) => React.createElement(React.Fragment, null, props.children),
      useFronter: () => defaultValue,
    };
  });
} catch (e) {
  // ignore
}

// mock llm-context to avoid heavy initialization in tests
try {
  vi.mock('@/contexts/llm-context', () => {
    const React = require('react');
    return {
      LLMContextProvider: (props: any) => React.createElement(React.Fragment, null, props.children),
      useLLMContext: () => ({ enabled: false }),
    };
  });
} catch (e) {
  // ignore
}

// ensure window.location.pathname exists to avoid startsWith errors
try {
  if (typeof window !== 'undefined' && window && typeof window.location !== 'undefined') {
    // set a safe default pathname if missing
    if (!window.location.pathname) {
      history.pushState('', '', '/');
    }
  }
} catch (e) {
  // ignore in restricted environments
}

// ensure window.location.hostname exists to avoid host checks
try {
  if (typeof window !== 'undefined' && window && typeof window.location !== 'undefined') {
    if (!window.location.hostname) {
      // default to local dev host
      history.replaceState('', '', 'http://localhost/');
    }
  }
} catch (e) {
  // ignore
}

// provide matchMedia for components that check media queries
if (typeof (globalThis as any).matchMedia === 'undefined') {
  (globalThis as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
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
      contentRect: { width: 100, height: 100, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => { } } as DOMRectReadOnly,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: []
    }], this);
  }
  unobserve() { }
  disconnect() { }
};

// provide a reliable localStorage shim for test environment
if (typeof (global as any).localStorage === 'undefined' || typeof (global as any).localStorage.setItem !== 'function') {
  const storage = new Map<string, string>();
  const ls = {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key) as string : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
    key(index: number) {
      const keys = Array.from(storage.keys());
      return keys[index] ?? null;
    },
    get length() {
      return storage.size;
    }
  };
  (global as any).localStorage = ls;
  // expose the underlying store for tests to manipulate directly
  ;(global as any).__localStorageStore = storage;
  // debug: no-op
}

// ensure __localStorageStore exists and proxies to window.localStorage when needed
if (typeof (global as any).__localStorageStore === 'undefined') {
  (global as any).__localStorageStore = {
    set: (k: string, v: string) => (global as any).localStorage.setItem(k, v),
    get: (k: string) => (global as any).localStorage.getItem(k),
    delete: (k: string) => (global as any).localStorage.removeItem(k),
    clear: () => (global as any).localStorage.clear()
  };
}

// lightweight fetch interceptor for tests: mock nb-import and nocobase endpoints
try {
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async (input: any, init?: any) => {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      // normalize
      const u = String(url || '').toLowerCase();

      // nb-import upload endpoints
      if (u.includes('/nb-import-csv') || u.includes('/api/nb-import-csv') || u.includes('/nb-import')) {
        // simulate an upload response returning an import id
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'test-import-123' }),
          text: async () => JSON.stringify({ id: 'test-import-123' }),
        };
      }

      // nb-import logs polling
      if (u.includes('/nb-import/logs')) {
        // return a finished status by default
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'finished', logs: [{ level: 'info', msg: 'done' }] }),
          text: async () => JSON.stringify({ status: 'finished', logs: [{ level: 'info', msg: 'done' }] }),
        };
      }

      // basic nocobase API stubs (collections and records)
      if (u.includes((import.meta as any).env.VITE_NOCOBASE_URL?.toLowerCase() ?? 'localhost:1337') || u.includes('/api/collections')) {
        // respond with a generic success shape used in tests
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { id: 'mocked-1' } }),
          text: async () => JSON.stringify({ success: true, data: { id: 'mocked-1' } }),
        };
      }

      // fallback: delegate to original fetch if available
      if (originalFetch) return originalFetch(input, init);
      return { ok: true, status: 200, text: async () => '{}' };
    } catch (e) {
      return { ok: false, status: 500, text: async () => String(e) };
    }
  };
} catch (e) {
  // ignore if mocking fetch fails
}
