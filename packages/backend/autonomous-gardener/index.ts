import { Router, type Request, type Response } from 'express';
import type { WeaveConfig } from '../shared/config.js';
import type { VectorStore } from '../semantic-weave/vector-store.js';
import { LinkChecker } from './link-checker.js';
import { ClusterTagger } from './cluster-tagger.js';
import { StaleDetector } from './stale-detector.js';
import { ContinuityReporter } from './continuity-report.js';

// ── types ────────────────────────────────────────────────────

export interface GardenerContext {
  linkChecker: LinkChecker;
  clusterTagger: ClusterTagger;
  staleDetector: StaleDetector;
  continuityReporter: ContinuityReporter;
  config: WeaveConfig;
}

// cached results from the last full run
interface GardenerCache {
  lastRun: string | null;      // iso timestamp
  brokenLinks: unknown[] | null;
  clusters: unknown[] | null;
  staleAnalysis: unknown | null;
}

const cache: GardenerCache = {
  lastRun: null,
  brokenLinks: null,
  clusters: null,
  staleAnalysis: null,
};

// ── initialization ───────────────────────────────────────────

export function initGardener(vectorStore: VectorStore, config: WeaveConfig): GardenerContext {
  const linkChecker = new LinkChecker(config.notesDir, vectorStore);
  const clusterTagger = new ClusterTagger(vectorStore, config);
  const staleDetector = new StaleDetector(vectorStore, config);
  const continuityReporter = new ContinuityReporter(vectorStore, config);

  return { linkChecker, clusterTagger, staleDetector, continuityReporter, config };
}

/**
 * start the gardener background scheduler. runs the full analysis
 * at the configured interval.
 */
export function startGardenerScheduler(ctx: GardenerContext): { stop: () => void } {
  const intervalMs = ctx.config.gardenerIntervalHours * 60 * 60 * 1000;

  // run first analysis after a short delay (let the indexer finish initial scan)
  const initialTimeout = setTimeout(() => {
    runFullAnalysis(ctx).catch(err => console.error('[gardener] scheduled run failed:', err));
  }, 30_000); // 30 seconds after startup

  const interval = setInterval(() => {
    runFullAnalysis(ctx).catch(err => console.error('[gardener] scheduled run failed:', err));
  }, intervalMs);

  console.log(`[gardener] scheduler started (interval: ${ctx.config.gardenerIntervalHours}h)`);

  return {
    stop: () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      console.log('[gardener] scheduler stopped');
    },
  };
}

// ── full analysis run ────────────────────────────────────────

async function runFullAnalysis(ctx: GardenerContext): Promise<void> {
  const start = Date.now();
  console.log('[gardener] starting full analysis...');

  try {
    const [brokenLinks, clusters, staleAnalysis] = await Promise.allSettled([
      ctx.linkChecker.check(),
      ctx.clusterTagger.analyze(),
      ctx.staleDetector.analyze({ enrichWithLlm: true }),
    ]);

    cache.brokenLinks = brokenLinks.status === 'fulfilled' ? brokenLinks.value : null;
    cache.clusters = clusters.status === 'fulfilled' ? clusters.value : null;
    cache.staleAnalysis = staleAnalysis.status === 'fulfilled' ? staleAnalysis.value : null;
    cache.lastRun = new Date().toISOString();

    // generate continuity report
    await ctx.continuityReporter.generate().catch(err =>
      console.error('[gardener] continuity report failed:', err),
    );

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[gardener] analysis complete in ${elapsed}s`);
  } catch (err) {
    console.error('[gardener] analysis error:', err);
  }
}

// ── express router ───────────────────────────────────────────

export function createGardenerRouter(ctx: GardenerContext): Router {
  const router = Router();

  // POST /gardener/run — trigger a full analysis
  router.post('/run', async (_req: Request, res: Response) => {
    try {
      await runFullAnalysis(ctx);
      res.json({ ok: true, lastRun: cache.lastRun });
    } catch (err) {
      console.error('[gardener] manual run failed:', err);
      res.status(500).json({ error: 'analysis failed' });
    }
  });

  // GET /gardener/status — last run info
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      lastRun: cache.lastRun,
      hasResults: cache.brokenLinks !== null,
      schedulerInterval: `${ctx.config.gardenerIntervalHours}h`,
    });
  });

  // GET /gardener/links — broken link report
  router.get('/links', async (req: Request, res: Response) => {
    try {
      // if no cached results or ?fresh=true, run check now
      if (!cache.brokenLinks || req.query.fresh === 'true') {
        cache.brokenLinks = await ctx.linkChecker.check();
      }
      res.json({ brokenLinks: cache.brokenLinks });
    } catch (err) {
      console.error('[gardener] link check failed:', err);
      res.status(500).json({ error: 'link check failed' });
    }
  });

  // GET /gardener/clusters — concept cluster report
  router.get('/clusters', async (req: Request, res: Response) => {
    try {
      if (!cache.clusters || req.query.fresh === 'true') {
        cache.clusters = await ctx.clusterTagger.analyze();
      }
      res.json({ clusters: cache.clusters });
    } catch (err) {
      console.error('[gardener] cluster analysis failed:', err);
      res.status(500).json({ error: 'cluster analysis failed' });
    }
  });

  // GET /gardener/stale — stale notes and merge suggestions
  router.get('/stale', async (req: Request, res: Response) => {
    try {
      const enrichWithLlm = req.query.enrich === 'true';
      if (!cache.staleAnalysis || req.query.fresh === 'true') {
        cache.staleAnalysis = await ctx.staleDetector.analyze({ enrichWithLlm });
      }
      res.json(cache.staleAnalysis);
    } catch (err) {
      console.error('[gardener] stale analysis failed:', err);
      res.status(500).json({ error: 'stale analysis failed' });
    }
  });

  // GET /gardener/report — latest continuity report
  router.get('/report', async (_req: Request, res: Response) => {
    try {
      const dates = await ctx.continuityReporter.listReports();
      if (dates.length === 0) {
        return res.json({ report: null, available: [] });
      }
      const report = await ctx.continuityReporter.getReport(dates[0]);
      return res.json({ report, available: dates });
    } catch (err) {
      console.error('[gardener] report fetch failed:', err);
      return res.status(500).json({ error: 'report fetch failed' });
    }
  });

  // GET /gardener/report/:date — report for a specific date
  router.get('/report/:date', async (req: Request, res: Response) => {
    try {
      const dateStr = String(req.params.date);
      // basic validation: yyyy-mm-dd
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({ error: 'invalid date format, expected yyyy-mm-dd' });
      }
      const report = await ctx.continuityReporter.getReport(dateStr);
      if (!report) {
        return res.status(404).json({ error: 'no report found for this date' });
      }
      return res.json({ report });
    } catch (err) {
      console.error('[gardener] report fetch failed:', err);
      return res.status(500).json({ error: 'report fetch failed' });
    }
  });

  return router;
}
