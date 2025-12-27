import '@testing-library/jest-dom';
// Ensure window.fetch exists in test environment if needed by some modules
if (typeof (globalThis as any).fetch === 'undefined') {
  (globalThis as any).fetch = () => Promise.resolve({ ok: true, text: async () => '{}' });
}
