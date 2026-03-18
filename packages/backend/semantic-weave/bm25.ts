import fs from 'node:fs';
import path from 'node:path';

// ── types ────────────────────────────────────────────────────

export interface BM25Hit {
  id: string;
  score: number;
}

// serialized format
interface BM25Data {
  invertedIndex: Record<string, Record<string, number>>; // term → { docId → tf }
  docLengths: Record<string, number>;                    // docId → word count
  totalDocs: number;
  totalLength: number;
}

// ── stop words ───────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
  'from', 'had', 'has', 'have', 'he', 'her', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'no', 'not',
  'of', 'on', 'or', 'our', 'she', 'so', 'such', 'than', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'to', 'too', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'who', 'will', 'with', 'would', 'you', 'your',
]);

// ── bm25 index ───────────────────────────────────────────────

export class BM25Index {
  // term → Map<docId, termFrequency>
  private invertedIndex = new Map<string, Map<string, number>>();
  private docLengths = new Map<string, number>();
  private totalDocs = 0;
  private totalLength = 0;
  private k1: number;
  private b: number;
  private storePath: string;
  private dirty = false;

  constructor(dataDir: string, k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.storePath = path.join(dataDir, 'bm25-index.json');
  }

  // ── tokenizer ──────────────────────────────────────────────

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  // ── index operations ──────────────────────────────────────

  addDocument(id: string, text: string): void {
    // remove old version if it exists
    this.removeDocument(id);

    const tokens = this.tokenize(text);
    this.docLengths.set(id, tokens.length);
    this.totalDocs++;
    this.totalLength += tokens.length;

    // count term frequencies
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // update inverted index
    for (const [term, freq] of tf) {
      let postings = this.invertedIndex.get(term);
      if (!postings) {
        postings = new Map();
        this.invertedIndex.set(term, postings);
      }
      postings.set(id, freq);
    }

    this.dirty = true;
  }

  removeDocument(id: string): void {
    const len = this.docLengths.get(id);
    if (len === undefined) return;

    this.docLengths.delete(id);
    this.totalDocs--;
    this.totalLength -= len;

    // remove from all posting lists
    for (const [term, postings] of this.invertedIndex) {
      postings.delete(id);
      if (postings.size === 0) {
        this.invertedIndex.delete(term);
      }
    }

    this.dirty = true;
  }

  // ── scoring ────────────────────────────────────────────────

  private idf(term: string): number {
    const df = this.invertedIndex.get(term)?.size || 0;
    // bm25 idf: log((N - df + 0.5) / (df + 0.5) + 1)
    return Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1);
  }

  search(query: string, topK = 10): BM25Hit[] {
    if (this.totalDocs === 0) return [];

    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    const avgDl = this.totalLength / this.totalDocs;
    const scores = new Map<string, number>();

    for (const term of queryTerms) {
      const postings = this.invertedIndex.get(term);
      if (!postings) continue;

      const idfScore = this.idf(term);

      for (const [docId, tf] of postings) {
        const dl = this.docLengths.get(docId) || 0;
        // bm25 score for this term-document pair
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (dl / avgDl));
        const termScore = idfScore * (numerator / denominator);

        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    const results: BM25Hit[] = [];
    for (const [id, score] of scores) {
      results.push({ id, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  // ── persistence ────────────────────────────────────────────

  async load(): Promise<void> {
    if (!fs.existsSync(this.storePath)) return;

    const raw = await fs.promises.readFile(this.storePath, 'utf-8');
    const data: BM25Data = JSON.parse(raw);

    this.invertedIndex.clear();
    for (const [term, postings] of Object.entries(data.invertedIndex)) {
      this.invertedIndex.set(term, new Map(Object.entries(postings)));
    }

    this.docLengths = new Map(Object.entries(data.docLengths));
    this.totalDocs = data.totalDocs;
    this.totalLength = data.totalLength;

    console.log(`[bm25] loaded index: ${this.totalDocs} documents, ${this.invertedIndex.size} terms`);
  }

  async save(): Promise<void> {
    if (!this.dirty) return;

    const data: BM25Data = {
      invertedIndex: {},
      docLengths: Object.fromEntries(this.docLengths),
      totalDocs: this.totalDocs,
      totalLength: this.totalLength,
    };

    for (const [term, postings] of this.invertedIndex) {
      data.invertedIndex[term] = Object.fromEntries(postings);
    }

    const dir = path.dirname(this.storePath);
    fs.mkdirSync(dir, { recursive: true });

    const tmpPath = this.storePath + '.tmp';
    await fs.promises.writeFile(tmpPath, JSON.stringify(data), 'utf-8');
    await fs.promises.rename(tmpPath, this.storePath);

    this.dirty = false;
  }

  size(): number {
    return this.totalDocs;
  }
}

export default BM25Index;
