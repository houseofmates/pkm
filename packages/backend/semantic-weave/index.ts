import { Router, type Request, type Response } from 'express';
import type { WeaveConfig } from '../shared/config.js';
import { getEmbedding } from '../shared/ollama.js';
import { VectorStore } from './vector-store.js';
import { BM25Index } from './bm25.js';
import { hybridSearch } from './hybrid-search.js';
import { EmbeddingPipeline } from './pipeline.js';
import { DirectoryWatcher } from './watcher.js';

export interface SemanticWeaveContext {
  vectorStore: VectorStore;
  bm25Index: BM25Index;
  pipeline: EmbeddingPipeline;
  watcher: DirectoryWatcher;
  config: WeaveConfig;
}

/**
 * initialize all semantic weave components, load persisted state,
 * and start the directory watcher.
 */
export async function initSemanticWeave(config: WeaveConfig): Promise<SemanticWeaveContext> {
  const vectorStore = new VectorStore(config.dataDir);
  const bm25Index = new BM25Index(config.dataDir, config.bm25K1, config.bm25B);

  // load persisted indexes
  await vectorStore.load();
  await bm25Index.load();

  const pipeline = new EmbeddingPipeline(vectorStore, bm25Index, config);
  const watcher = new DirectoryWatcher(config.notesDir, pipeline, config.watchDebounceMs);

  // start watching (also triggers initial scan via ignoreInitial: false)
  await watcher.start();

  return { vectorStore, bm25Index, pipeline, watcher, config };
}

/**
 * build an express router exposing the semantic weave api.
 */
export function createWeaveRouter(ctx: SemanticWeaveContext): Router {
  const router = Router();

  // POST /weave/search — hybrid search
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const { q, topK = 20, mode = 'hybrid' } = req.body as {
        q?: string;
        topK?: number;
        mode?: 'hybrid' | 'semantic' | 'bm25';
      };

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'missing or invalid query parameter "q"' });
      }

      const safeTopK = Math.min(Math.max(1, Number(topK) || 20), 100);

      if (mode === 'bm25') {
        const bm25Hits = ctx.bm25Index.search(q, safeTopK);
        const results = bm25Hits.map(h => {
          const doc = ctx.vectorStore.get(h.id);
          return {
            id: h.id,
            title: doc?.title || h.id,
            score: h.score,
            snippet: doc ? doc.plainText.slice(0, 200) : '',
            sources: ['bm25'] as const,
          };
        });
        return res.json({ query: q.toLowerCase(), mode, results });
      }

      // generate query embedding for semantic search
      const queryEmbedding = await getEmbedding(q, ctx.config);

      if (mode === 'semantic') {
        const hits = ctx.vectorStore.search(queryEmbedding, safeTopK);
        return res.json({
          query: q.toLowerCase(),
          mode,
          results: hits.map(h => ({ ...h, sources: ['semantic'] })),
        });
      }

      // hybrid (default)
      const semanticHits = ctx.vectorStore.search(queryEmbedding, safeTopK * 2);
      const bm25Hits = ctx.bm25Index.search(q, safeTopK * 2);

      // build lookup maps for hybrid merger
      const titleMap = new Map<string, string>();
      const snippetMap = new Map<string, string>();
      for (const h of semanticHits) {
        titleMap.set(h.id, h.title);
        snippetMap.set(h.id, h.snippet);
      }
      for (const h of bm25Hits) {
        if (!titleMap.has(h.id)) {
          const doc = ctx.vectorStore.get(h.id);
          titleMap.set(h.id, doc?.title || h.id);
          snippetMap.set(h.id, doc?.plainText.slice(0, 200) || '');
        }
      }

      const results = hybridSearch(
        semanticHits,
        bm25Hits,
        titleMap,
        snippetMap,
        safeTopK,
        ctx.config.hybridSemanticWeight,
      );

      return res.json({ query: q.toLowerCase(), mode: 'hybrid', results });
    } catch (err) {
      console.error('[weave] search error:', err);
      return res.status(500).json({ error: 'search failed' });
    }
  });

  // GET /weave/status — index statistics
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      documents: ctx.vectorStore.size(),
      bm25Documents: ctx.bm25Index.size(),
      watcherRunning: ctx.watcher.isRunning(),
      notesDir: ctx.config.notesDir,
      dataDir: ctx.config.dataDir,
    });
  });

  // POST /weave/reindex — force full reindex
  router.post('/reindex', async (_req: Request, res: Response) => {
    try {
      const stats = await ctx.pipeline.fullReindex();
      res.json({ ok: true, ...stats });
    } catch (err) {
      console.error('[weave] reindex error:', err);
      res.status(500).json({ error: 'reindex failed' });
    }
  });

  // GET /weave/document/:id — retrieve a specific indexed document
  router.get('/document/{*id}', (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id.join('/') : String(req.params.id);
    const doc = ctx.vectorStore.get(id);
    if (!doc) {
      return res.status(404).json({ error: 'document not found' });
    }
    // do not expose the raw embedding in the api response (large + unnecessary)
    const { embedding: _emb, ...rest } = doc;
    return res.json(rest);
  });

  return router;
}
