import path from 'path';
import fs from 'fs';

export type DocRecord = {
  id: string;
  title?: string;
  content?: string;
  embedding?: number[];
  [k: string]: unknown;
};

export class LanceIndexer {
  private dbPath: string;
  private table: { upsert: (records: DocRecord[]) => Promise<void>; search: (query: { vector: number[]; topK: number }) => Promise<Array<{ id: string; score: number }>> } | null = null;

  constructor(dbPath = './lancedb') {
    this.dbPath = path.resolve(dbPath);
  }

  async init(): Promise<void> {
    try {
      if (!fs.existsSync(this.dbPath)) fs.mkdirSync(this.dbPath, { recursive: true });
      // lazy require so runtime can install lancedb separately
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Lance = require('lancedb') as any;
      const client = new Lance.LanceClient({ path: this.dbPath });
      // open or create table
      this.table = await client.openTable('pkm_records', {
        schema: { id: 'string', embedding: 'float32[]' },
      });
      console.log('lancedb: initialized at', this.dbPath);
    } catch (err) {
      console.error('lancedb: init error', err);
      throw err;
    }
  }

  async upsert(records: DocRecord[]): Promise<void> {
    if (!this.table) throw new Error('lancedb: not initialized');
    try {
      const toUpsert = records.map((r) => ({ ...r, id: r.id, embedding: r.embedding }));
      await this.table.upsert(toUpsert);
    } catch (err) {
      console.error('lancedb: upsert error', err);
      throw err;
    }
  }

  async semanticSearch(queryEmbedding: number[], topK = 10): Promise<Array<{ id: string; score: number }>> {
    if (!this.table) throw new Error('lancedb: not initialized');
    try {
      const results = await this.table.search({ vector: queryEmbedding, topK });
      // normalize format
      return results.map((r: { id: string; score: number }) => ({ id: r.id, score: Number(r.score) }));
    } catch (err) {
      console.error('lancedb: search error', err);
      throw err;
    }
  }
}

export default LanceIndexer;
