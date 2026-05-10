import fs from 'node:fs';
import path from 'node:path';

// ── types ────────────────────────────────────────────────────

export interface IndexedDocument {
  id: string;            // relative file path from notes dir
  title: string;
  content: string;       // raw markdown body (no frontmatter)
  plainText: string;     // markdown-stripped text
  embedding: number[];
  tags: string[];
  links: string[];       // outgoing link targets
  mtime: number;         // file modification time (ms since epoch)
  indexedAt: number;
  wordCount: number;
}

export interface VectorSearchHit {
  id: string;
  title: string;
  score: number;
  snippet: string;
}

// compact on-disk representation (embeddings as base64)
interface StoredDocument {
  id: string;
  title: string;
  content: string;
  plainText: string;
  embeddingB64: string;  // base64-encoded float32 array
  tags: string[];
  links: string[];
  mtime: number;
  indexedAt: number;
  wordCount: number;
}

// ── encoding helpers ─────────────────────────────────────────

function encodeEmbedding(embedding: number[]): string {
  const buf = Buffer.from(new Float32Array(embedding).buffer);
  return buf.toString('base64');
}

function decodeEmbedding(b64: string): number[] {
  const buf = Buffer.from(b64, 'base64');
  return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
}

// ── vector store ─────────────────────────────────────────────

export class VectorStore {
  private docs = new Map<string, IndexedDocument>();
  private storePath: string;
  private dirty = false;

  constructor(dataDir: string) {
    this.storePath = path.join(dataDir, 'vector-store.json');
  }

  // ── persistence ────────────────────────────────────────────

  async load(): Promise<void> {
    if (!fs.existsSync(this.storePath)) return;

    const raw = await fs.promises.readFile(this.storePath, 'utf-8');
    const stored: StoredDocument[] = JSON.parse(raw);

    this.docs.clear();
    for (const s of stored) {
      this.docs.set(s.id, {
        id: s.id,
        title: s.title,
        content: s.content,
        plainText: s.plainText,
        embedding: decodeEmbedding(s.embeddingB64),
        tags: s.tags,
        links: s.links,
        mtime: s.mtime,
        indexedAt: s.indexedAt,
        wordCount: s.wordCount,
      });
    }

    console.log(`[vector-store] loaded ${this.docs.size} documents`);
  }

  async save(): Promise<void> {
    if (!this.dirty) return;

    const stored: StoredDocument[] = [];
    for (const doc of this.docs.values()) {
      stored.push({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        plainText: doc.plainText,
        embeddingB64: encodeEmbedding(doc.embedding),
        tags: doc.tags,
        links: doc.links,
        mtime: doc.mtime,
        indexedAt: doc.indexedAt,
        wordCount: doc.wordCount,
      });
    }

    const dir = path.dirname(this.storePath);
    fs.mkdirSync(dir, { recursive: true });

    // atomic write: write to tmp then rename
    const tmpPath = this.storePath + '.tmp';
    await fs.promises.writeFile(tmpPath, JSON.stringify(stored), 'utf-8');
    await fs.promises.rename(tmpPath, this.storePath);

    this.dirty = false;
  }

  // ── crud ───────────────────────────────────────────────────

  async upsert(doc: IndexedDocument): Promise<void> {
    this.docs.set(doc.id, doc);
    this.dirty = true;
  }

  async remove(id: string): Promise<boolean> {
    const had = this.docs.delete(id);
    if (had) this.dirty = true;
    return had;
  }

  get(id: string): IndexedDocument | undefined {
    return this.docs.get(id);
  }

  getAll(): IndexedDocument[] {
    return Array.from(this.docs.values());
  }

  size(): number {
    return this.docs.size;
  }

  has(id: string): boolean {
    return this.docs.has(id);
  }

  allIds(): string[] {
    return Array.from(this.docs.keys());
  }

  // ── search ─────────────────────────────────────────────────

  search(queryEmbedding: number[], topK: number): VectorSearchHit[] {
    const scored: Array<{ id: string; title: string; score: number; plainText: string }> = [];

    for (const doc of this.docs.values()) {
      if (!doc.embedding || doc.embedding.length === 0) continue;
      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      scored.push({ id: doc.id, title: doc.title, score, plainText: doc.plainText });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(s => ({
      id: s.id,
      title: s.title,
      score: s.score,
      snippet: makeSnippet(s.plainText, 200),
    }));
  }

  // ── pairwise similarity (used by gardener) ─────────────────

  findSimilarPairs(threshold: number): Array<{ a: string; b: string; similarity: number }> {
    const results: Array<{ a: string; b: string; similarity: number }> = [];
    const ids = this.allIds();

    for (let i = 0; i < ids.length; i++) {
      const docA = this.docs.get(ids[i])!;
      if (!docA.embedding || docA.embedding.length === 0) continue;

      for (let j = i + 1; j < ids.length; j++) {
        const docB = this.docs.get(ids[j])!;
        if (!docB.embedding || docB.embedding.length === 0) continue;

        const sim = cosineSimilarity(docA.embedding, docB.embedding);
        if (sim >= threshold) {
          results.push({ a: docA.id, b: docB.id, similarity: sim });
        }
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results;
  }
}

// ── math helpers ─────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function makeSnippet(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

export default VectorStore;
