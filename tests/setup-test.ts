import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
// provide sensible import.meta.env defaults for tests
if (typeof (globalThis as any).importMetaEnv === 'undefined') {
  (globalThis as any).importMetaEnv = {};
}

// mock react-query context helpers to ensure tests using hooks don't crash
try {
  const { QueryClient } = await import('@tanstack/react-query');
  const __testQueryClient = new QueryClient();
  vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual<any>('@tanstack/react-query');
    return {
      ...actual,
      useQueryClient: () => __testQueryClient,
      QueryClientProvider: ({ children }: any) => children,
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
if (typeof (global as any).process === 'undefined') (global as any).process = { env: {} };

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
