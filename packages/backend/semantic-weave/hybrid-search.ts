import type { VectorSearchHit } from './vector-store.js';
import type { BM25Hit } from './bm25.js';

export interface HybridHit {
  id: string;
  title: string;
  score: number;
  snippet: string;
  sources: Array<'semantic' | 'bm25'>;
}

/**
 * reciprocal rank fusion (rrf) combines ranked lists from different retrieval
 * methods into a single ranking. for each document, the fused score is:
 *
 *   rrf(d) = Σ 1 / (k + rank_i(d))
 *
 * where k is a constant (default 60) and rank_i is the 1-based rank in list i.
 *
 * the `semanticWeight` parameter (0–1) scales the contribution of semantic vs
 * bm25 results so the caller can bias toward one method.
 */
export function hybridSearch(
  semanticHits: VectorSearchHit[],
  bm25Hits: BM25Hit[],
  titleMap: Map<string, string>,
  snippetMap: Map<string, string>,
  topK: number,
  semanticWeight = 0.6,
  k = 60,
): HybridHit[] {
  const rrfScores = new Map<string, { score: number; sources: Set<'semantic' | 'bm25'> }>();

  // accumulate rrf scores from semantic results
  for (let rank = 0; rank < semanticHits.length; rank++) {
    const hit = semanticHits[rank];
    const entry = rrfScores.get(hit.id) || { score: 0, sources: new Set<'semantic' | 'bm25'>() };
    entry.score += semanticWeight * (1 / (k + rank + 1));
    entry.sources.add('semantic');
    rrfScores.set(hit.id, entry);
  }

  // accumulate rrf scores from bm25 results
  const bm25Weight = 1 - semanticWeight;
  for (let rank = 0; rank < bm25Hits.length; rank++) {
    const hit = bm25Hits[rank];
    const entry = rrfScores.get(hit.id) || { score: 0, sources: new Set<'semantic' | 'bm25'>() };
    entry.score += bm25Weight * (1 / (k + rank + 1));
    entry.sources.add('bm25');
    rrfScores.set(hit.id, entry);
  }

  // build final ranked list
  const results: HybridHit[] = [];
  for (const [id, entry] of rrfScores) {
    results.push({
      id,
      title: titleMap.get(id) || id,
      score: entry.score,
      snippet: snippetMap.get(id) || '',
      sources: Array.from(entry.sources),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
