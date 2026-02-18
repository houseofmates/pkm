import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import LanceIndexer from './lancedb/index';
import { getEmbedding } from './embeddings/ollama';

const PORT = process.env.PKM_BACKEND_PORT ? Number(process.env.PKM_BACKEND_PORT) : 4110;
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

const indexer = new LanceIndexer('./data/lancedb');

async function start() {
  try {
    await indexer.init();
  } catch (err) {
    console.error('failed to init lancedb', err);
  }

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // webhook from nocobase to sync records
  app.post('/sync-webhook', async (req, res) => {
    try {
      const payload = req.body;
      if (!payload) return res.status(400).json({ error: 'missing payload' });
      // accept single record or array
      const records = Array.isArray(payload) ? payload : [payload];
      // ensure embeddings are generated before upsert
      const withEmb = await Promise.all(records.map(async (r: { id?: string; _id?: string; uuid?: string; title?: string; content?: string }) => {
        try {
          const text = `${(r.title || '')} ${r.content || ''}`.toLowerCase();
          const embedding = await getEmbedding(text);
          return { id: String(r.id || r._id || r.uuid || Date.now()), ...r, embedding };
        } catch (e) {
          console.error('embedding failed for record', r.id, e);
          return { id: String(r.id || r._id || Date.now()), ...r };
        }
      }));
      await indexer.upsert(withEmb);
      return res.json({ ok: true, count: withEmb.length });
    } catch (err) {
      console.error('sync-webhook error', err);
      return res.status(500).json({ error: String(err) });
    }
  });

  // semantic search endpoint
  app.post('/search', async (req, res) => {
    try {
      const { q, topK = 10 } = req.body;
      if (!q || typeof q !== 'string') return res.status(400).json({ error: 'invalid query' });
      const embedding = await getEmbedding(q);
      const hits = await indexer.semanticSearch(embedding, Number(topK));
      // return lowercased safe fields for any ai-generated text (none here), but keep ids and scores
      return res.json({ query: q.toLowerCase(), results: hits });
    } catch (err) {
      console.error('search error', err);
      return res.status(500).json({ error: String(err) });
    }
  });

  app.listen(PORT, () => console.log(`pkm backend listening ${PORT}`));
}

start().catch((e) => console.error('server start error', e));
