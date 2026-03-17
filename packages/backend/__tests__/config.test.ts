import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const originalEnv = process.env;

const loadConfig = async () => {
  const mod = await import('../config.ts');
  return mod.backendConfig;
};

describe('backendConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('falls back to defaults when env vars are missing', async () => {
    delete process.env.PKM_BACKEND_PORT;
    delete process.env.PKM_HTTP_JSON_LIMIT;
    delete process.env.PKM_UPLOAD_MAX_FILES;
    delete process.env.EMBEDDING_URL;
    delete process.env.EMBEDDING_CONCURRENCY;
    delete process.env.PKM_CORS_ORIGINS;

    const config = await loadConfig();

    expect(config.port).toBe(4110);
    expect(config.http.jsonLimit).toBe('2mb');
    expect(config.upload.maxFiles).toBe(60);
    expect(config.embedding.url).toContain('/api/embeddings');
    expect(config.embedding.concurrency).toBe(3);
    expect(config.http.cors.origin).toEqual(['capacitor://localhost', 'http://localhost']);
  });

  it('respects environment overrides', async () => {
    process.env.PKM_BACKEND_PORT = '5555';
    process.env.PKM_HTTP_JSON_LIMIT = '10mb';
    process.env.PKM_UPLOAD_MAX_FILES = '5';
    process.env.EMBEDDING_URL = 'http://example.com/embed';
    process.env.EMBEDDING_CONCURRENCY = '9';
    process.env.PKM_CORS_ORIGINS = 'https://foo.com,https://bar.com';

    const config = await loadConfig();

    expect(config.port).toBe(5555);
    expect(config.http.jsonLimit).toBe('10mb');
    expect(config.upload.maxFiles).toBe(5);
    expect(config.embedding.url).toBe('http://example.com/embed');
    expect(config.embedding.concurrency).toBe(9);
    expect(config.http.cors.origin).toEqual(['https://foo.com', 'https://bar.com']);
  });
});
