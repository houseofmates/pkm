import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

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
  // debug: report type
  // eslint-disable-next-line no-console
  console.log('setup-test: localStorage.setItem type ->', typeof (global as any).localStorage.setItem);
}
