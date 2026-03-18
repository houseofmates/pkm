import path from 'node:path';
import fs from 'node:fs';

export interface WeaveConfig {
  /** root directory containing markdown files to index */
  notesDir: string;
  /** directory for persisted index data (vector store, bm25, reports) */
  dataDir: string;
  /** ollama http endpoint */
  ollamaUrl: string;
  /** ollama model for embeddings */
  embeddingModel: string;
  /** ollama model for text generation (gardener llm calls) */
  llmModel: string;
  /** debounce delay for file watcher (ms) */
  watchDebounceMs: number;
  /** bm25 term-frequency saturation */
  bm25K1: number;
  /** bm25 document-length normalization */
  bm25B: number;
  /** weight for semantic results in hybrid search (0 = pure bm25, 1 = pure semantic) */
  hybridSemanticWeight: number;
  /** how often the gardener runs (hours) */
  gardenerIntervalHours: number;
  /** notes untouched for this many days are flagged stale */
  staleThresholdDays: number;
  /** cosine similarity above this triggers a merge suggestion */
  mergeSimilarityThreshold: number;
  /** skip files larger than this (bytes) */
  maxFileSize: number;
  /** max concurrent embedding requests to ollama */
  embeddingConcurrency: number;
  /** standalone server port */
  port: number;
}

export function loadConfig(overrides: Partial<WeaveConfig> = {}): WeaveConfig {
  const base: WeaveConfig = {
    notesDir: path.resolve(process.env.PKM_NOTES_DIR || './data/notes'),
    dataDir: path.resolve(process.env.PKM_DATA_DIR || './data/weave'),
    ollamaUrl: process.env.OLLAMA_URL || process.env.OLLAMA_HOST || 'http://localhost:11434',
    embeddingModel: process.env.PKM_EMBED_MODEL || 'nomic-embed-text',
    llmModel: process.env.PKM_LLM_MODEL || 'qwen2.5-coder:7b-instruct-q4_K_S',
    watchDebounceMs: 2000,
    bm25K1: 1.5,
    bm25B: 0.75,
    hybridSemanticWeight: 0.6,
    gardenerIntervalHours: 24,
    staleThresholdDays: 90,
    mergeSimilarityThreshold: 0.85,
    maxFileSize: 1024 * 1024, // 1 mb
    embeddingConcurrency: 4,
    port: Number(process.env.PKM_WEAVE_PORT) || 4120,
  };

  const config: WeaveConfig = { ...base, ...overrides };

  fs.mkdirSync(config.notesDir, { recursive: true });
  fs.mkdirSync(config.dataDir, { recursive: true });

  return config;
}
