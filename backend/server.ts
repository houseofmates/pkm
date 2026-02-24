import express from 'express';
import bodyParser from 'body-parser';
import * as cors from 'cors';
import LanceIndexer from './lancedb/index';
import { getEmbedding } from './embeddings/ollama';
import multer from 'multer';
import * as Papa from 'papaparse';
import { inferRelations, type Dataset } from './relation-inference';

const PORT = process.env.PKM_BACKEND_PORT ? Number(process.env.PKM_BACKEND_PORT) : 4110;
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

const indexer = new LanceIndexer('./data/lancedb');

// multi-csv import endpoint
const upload = multer({ limits: { files: 60, fileSize: 230 * 1024 } });
app.post('/nb-import-csv', upload.array('files', 60), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'no files uploaded' });
    }
    const databases: Dataset[] = [];
    for (const file of req.files) {
      const content = file.buffer.toString('utf-8');
      const parsed = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        transformHeader: h => h.trim(),
      });
      if (parsed.errors.length) {
        console.warn(`warnings parsing CSV ${file.originalname}:`, parsed.errors);
      }
      const rows = parsed.data;
      const fields = rows.length > 0 ? Object.keys(rows[0]) : [];
      // guess types for each field
      const guessType = (values: any[]) => {
        let hasString = false, hasNumber = false, hasBoolean = false, hasDate = false, hasArray = false;
        for (const v of values) {
          if (v == null || v === '') continue;
          if (Array.isArray(v)) {
            hasArray = true;
            continue;
          }
          if (typeof v === 'number') hasNumber = true;
          else if (typeof v === 'boolean') hasBoolean = true;
          else if (typeof v === 'string') {
            const trimmed = v.trim();
            const maybeNum = Number(trimmed);
            if (!isNaN(maybeNum) && trimmed !== '') hasNumber = true;
            else if (trimmed === 'true' || trimmed === 'false') hasBoolean = true;
            else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) hasDate = true;
            else if (trimmed.includes(',') || trimmed.startsWith('[')) hasArray = true;
            else hasString = true;
          } else hasString = true;
        }
        if (hasArray) return 'string[]';
        if (hasDate && !hasString) return 'date';
        if (hasString) return 'string';
        if (hasBoolean) return 'boolean';
        if (hasNumber) return 'number';
        return 'string';
      };
      const sampleRows = rows.slice(0, 20);
      const fieldTypes: Record<string, string> = {};
      for (const field of fields) {
        const colValues = sampleRows.map(r => r[field]);
        fieldTypes[field] = guessType(colValues);
      }
      databases.push({
        name: file.originalname.replace(/\.csv$/i, ''),
        rows,
        fields,
        fieldTypes,
      });
    }
    inferRelations(databases);

    // Return a task summary including inferred relations
    const taskId = 'csv-' + Date.now();
    // Optionally, store progress or trigger async processing
    return res.json({ taskId, databases });
  } catch (err) {
    console.error('nb-import-csv error', err);
    return res.status(500).json({ error: String(err) });
  }
});

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
