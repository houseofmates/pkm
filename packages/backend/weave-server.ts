import express from 'express';
import cors from 'cors';
import { loadConfig } from './shared/config.js';
import { initSemanticWeave, createWeaveRouter } from './semantic-weave/index.js';
import { initGardener, createGardenerRouter, startGardenerScheduler } from './autonomous-gardener/index.js';

async function main() {
  const config = loadConfig();
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ── health check ─────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'pkm-weave', uptime: process.uptime() });
  });

  // ── semantic weave ───────────────────────────────────────
  console.log('[weave-server] initializing semantic weave...');
  const weaveCtx = await initSemanticWeave(config);
  app.use('/weave', createWeaveRouter(weaveCtx));

  // ── autonomous gardener ──────────────────────────────────
  console.log('[weave-server] initializing autonomous gardener...');
  const gardenerCtx = initGardener(weaveCtx.vectorStore, config);
  app.use('/gardener', createGardenerRouter(gardenerCtx));
  const scheduler = startGardenerScheduler(gardenerCtx);

  // ── start server ─────────────────────────────────────────
  app.listen(config.port, () => {
    console.log(`[weave-server] listening on port ${config.port}`);
    console.log(`[weave-server] notes directory: ${config.notesDir}`);
    console.log(`[weave-server] data directory: ${config.dataDir}`);
    console.log(`[weave-server] ollama: ${config.ollamaUrl} (embed: ${config.embeddingModel}, llm: ${config.llmModel})`);
  });

  // ── graceful shutdown ────────────────────────────────────
  const shutdown = async () => {
    console.log('\n[weave-server] shutting down...');
    scheduler.stop();
    weaveCtx.watcher.stop();
    await weaveCtx.pipeline.flush();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('[weave-server] fatal error:', err);
  process.exit(1);
});
