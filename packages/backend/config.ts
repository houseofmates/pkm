import path from 'node:path';

const toNumber = (value: string | undefined, fallback: number): number => {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value == null) return fallback;
  return value.trim().toLowerCase() === 'true';
};

const buildEmbeddingUrl = (): string => {
  const explicit = process.env.EMBEDDING_URL?.trim();
  if (explicit) return explicit;

  const legacyHost = process.env.OLLAMA_EMBED_URL || process.env.OLLAMA_URL;
  const base = legacyHost?.trim() || 'http://localhost:11434';
  try {
    const url = new URL(base);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/api/embeddings';
    }
    return url.toString();
  } catch {
    const normalized = base.endsWith('/api/embeddings') ? base : `${base.replace(/\/$/, '')}/api/embeddings`;
    return normalized;
  }
};

const parseCorsOrigins = (): string[] => {
  const raw = process.env.PKM_CORS_ORIGINS || 'capacitor://localhost,http://localhost';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

export const backendConfig = {
  port: toNumber(process.env.PKM_BACKEND_PORT, 4110),
  relationDebug: toBool(process.env.RELATION_DEBUG),
  paths: {
    lanceDb: path.resolve(process.env.PKM_LANCEDB_PATH || './data/lancedb'),
  },
  http: {
    jsonLimit: process.env.PKM_HTTP_JSON_LIMIT || '2mb',
    cors: {
      origin: parseCorsOrigins(),
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  },
  upload: {
    maxFiles: toNumber(process.env.PKM_UPLOAD_MAX_FILES, 60),
    maxFileSizeBytes: toNumber(process.env.PKM_UPLOAD_MAX_FILE_BYTES, 230 * 1024),
  },
  embedding: {
    url: buildEmbeddingUrl(),
    model: process.env.EMBEDDING_MODEL || process.env.PKM_EMBED_MODEL || 'nomic-embed-text',
    concurrency: Math.max(1, toNumber(process.env.EMBEDDING_CONCURRENCY, 3)),
    timeoutMs: Math.max(1000, toNumber(process.env.EMBEDDING_TIMEOUT_MS, 15000)),
  },
  gemini: {
    defaultModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview',
    apiKey: process.env.GEMINI_API_KEY || '',
  },
} as const;

export type BackendConfig = typeof backendConfig;
