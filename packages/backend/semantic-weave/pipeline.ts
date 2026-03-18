import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdownFile } from '../shared/markdown-parser.js';
import { getEmbedding } from '../shared/ollama.js';
import type { WeaveConfig } from '../shared/config.js';
import type { VectorStore, IndexedDocument } from './vector-store.js';
import type { BM25Index } from './bm25.js';

// ── concurrency limiter ──────────────────────────────────────

class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    return new Promise<void>(resolve => {
      this.queue.push(() => { this.active++; resolve(); });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// ── pipeline ─────────────────────────────────────────────────

export class EmbeddingPipeline {
  private semaphore: Semaphore;

  constructor(
    private vectorStore: VectorStore,
    private bm25Index: BM25Index,
    private config: WeaveConfig,
  ) {
    this.semaphore = new Semaphore(config.embeddingConcurrency);
  }

  /**
   * process a single markdown file: parse → embed → store.
   * `filePath` is the absolute path; the document id is derived as the
   * relative path from `config.notesDir`.
   */
  async processFile(filePath: string): Promise<void> {
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) return;
    if (stat.size > this.config.maxFileSize) {
      console.log(`[pipeline] skipping oversized file: ${filePath} (${(stat.size / 1024).toFixed(0)} kb)`);
      return;
    }

    const id = path.relative(this.config.notesDir, filePath);

    // skip if already indexed and file hasn't changed
    const existing = this.vectorStore.get(id);
    if (existing && existing.mtime >= stat.mtimeMs) return;

    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = parseMarkdownFile(raw, filePath);

    // generate embedding (rate-limited)
    await this.semaphore.acquire();
    let embedding: number[];
    try {
      const textForEmbedding = `${parsed.title} ${parsed.plainText}`.slice(0, 8192);
      embedding = await getEmbedding(textForEmbedding, this.config);
    } finally {
      this.semaphore.release();
    }

    const doc: IndexedDocument = {
      id,
      title: parsed.title,
      content: parsed.content,
      plainText: parsed.plainText,
      embedding,
      tags: parsed.tags,
      links: parsed.links.map(l => l.target),
      mtime: stat.mtimeMs,
      indexedAt: Date.now(),
      wordCount: parsed.wordCount,
    };

    await this.vectorStore.upsert(doc);
    this.bm25Index.addDocument(id, parsed.plainText);
  }

  /**
   * remove a file from both indexes.
   */
  async removeFile(filePath: string): Promise<void> {
    const id = path.relative(this.config.notesDir, filePath);
    await this.vectorStore.remove(id);
    this.bm25Index.removeDocument(id);
  }

  /**
   * full reindex: walk the entire notes directory, process every .md file,
   * remove stale entries for deleted files.
   */
  async fullReindex(): Promise<{ processed: number; failed: number; removed: number }> {
    const mdFiles = await walkMarkdownFiles(this.config.notesDir);
    const activePaths = new Set<string>();

    let processed = 0;
    let failed = 0;

    // process in batches to avoid overwhelming memory
    const batchSize = this.config.embeddingConcurrency * 2;
    for (let i = 0; i < mdFiles.length; i += batchSize) {
      const batch = mdFiles.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(f => this.processFile(f)),
      );

      for (let j = 0; j < results.length; j++) {
        const absPath = batch[j];
        const relPath = path.relative(this.config.notesDir, absPath);
        activePaths.add(relPath);

        if (results[j].status === 'fulfilled') {
          processed++;
        } else {
          failed++;
          console.error(`[pipeline] failed to process ${relPath}:`, (results[j] as PromiseRejectedResult).reason);
        }
      }
    }

    // remove entries for deleted files
    let removed = 0;
    for (const id of this.vectorStore.allIds()) {
      if (!activePaths.has(id)) {
        await this.vectorStore.remove(id);
        this.bm25Index.removeDocument(id);
        removed++;
      }
    }

    // persist
    await this.vectorStore.save();
    await this.bm25Index.save();

    console.log(`[pipeline] reindex complete: ${processed} processed, ${failed} failed, ${removed} removed`);
    return { processed, failed, removed };
  }

  /**
   * persist current state to disk.
   */
  async flush(): Promise<void> {
    await this.vectorStore.save();
    await this.bm25Index.save();
  }
}

// ── fs helpers ───────────────────────────────────────────────

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(d: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        // skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  }

  await walk(dir);
  return results;
}

export default EmbeddingPipeline;
