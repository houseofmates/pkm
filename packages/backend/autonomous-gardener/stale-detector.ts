import type { VectorStore, IndexedDocument } from '../semantic-weave/vector-store.js';
import type { WeaveConfig } from '../shared/config.js';
import { generateText, extractJson } from '../shared/ollama.js';

// ── types ────────────────────────────────────────────────────

export interface StaleNote {
  id: string;
  title: string;
  lastModified: string;   // iso 8601
  daysSinceUpdate: number;
  wordCount: number;
}

export interface MergeSuggestion {
  docA: string;
  docB: string;
  titleA: string;
  titleB: string;
  similarity: number;
  reason: string;
}

// ── stale detector ───────────────────────────────────────────

export class StaleDetector {
  constructor(
    private vectorStore: VectorStore,
    private config: WeaveConfig,
  ) {}

  /**
   * run full stale/merge analysis:
   *   1. find notes not updated in `staleThresholdDays`.
   *   2. find near-duplicate pairs (cosine sim above merge threshold).
   *   3. optionally enrich merge suggestions with llm reasoning.
   */
  async analyze(options?: { enrichWithLlm?: boolean }): Promise<{
    staleNotes: StaleNote[];
    mergeSuggestions: MergeSuggestion[];
  }> {
    const docs = this.vectorStore.getAll();
    const now = Date.now();
    const staleMs = this.config.staleThresholdDays * 24 * 60 * 60 * 1000;

    // ── stale notes ──────────────────────────────────────────
    const staleNotes: StaleNote[] = [];
    for (const doc of docs) {
      const age = now - doc.mtime;
      if (age >= staleMs) {
        staleNotes.push({
          id: doc.id,
          title: doc.title,
          lastModified: new Date(doc.mtime).toISOString(),
          daysSinceUpdate: Math.floor(age / (24 * 60 * 60 * 1000)),
          wordCount: doc.wordCount,
        });
      }
    }
    staleNotes.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    // ── merge candidates ─────────────────────────────────────
    const pairs = this.vectorStore.findSimilarPairs(this.config.mergeSimilarityThreshold);
    let mergeSuggestions: MergeSuggestion[] = pairs.map(p => {
      const docA = this.vectorStore.get(p.a);
      const docB = this.vectorStore.get(p.b);
      return {
        docA: p.a,
        docB: p.b,
        titleA: docA?.title || p.a,
        titleB: docB?.title || p.b,
        similarity: Math.round(p.similarity * 1000) / 1000,
        reason: '',
      };
    });

    // ── optional llm enrichment ──────────────────────────────
    if (options?.enrichWithLlm && mergeSuggestions.length > 0) {
      // only enrich the top 10 to avoid excessive llm calls
      const toEnrich = mergeSuggestions.slice(0, 10);
      const enriched = await Promise.allSettled(
        toEnrich.map(s => this.enrichMergeSuggestion(s)),
      );

      for (let i = 0; i < enriched.length; i++) {
        if (enriched[i].status === 'fulfilled') {
          toEnrich[i] = (enriched[i] as PromiseFulfilledResult<MergeSuggestion>).value;
        }
      }

      mergeSuggestions = [
        ...toEnrich,
        ...mergeSuggestions.slice(10),
      ];
    }

    return { staleNotes, mergeSuggestions };
  }

  // ── llm merge reasoning ────────────────────────────────────

  private async enrichMergeSuggestion(suggestion: MergeSuggestion): Promise<MergeSuggestion> {
    const docA = this.vectorStore.get(suggestion.docA);
    const docB = this.vectorStore.get(suggestion.docB);
    if (!docA || !docB) return suggestion;

    const excerptA = docA.plainText.slice(0, 500).replace(/\n/g, ' ');
    const excerptB = docB.plainText.slice(0, 500).replace(/\n/g, ' ');

    const prompt = `you are a knowledge management assistant. these two notes have ${Math.round(suggestion.similarity * 100)}% semantic similarity. analyze whether they should be merged.

note a: "${docA.title}"
${excerptA}

note b: "${docB.title}"
${excerptB}

respond with only a json object (no markdown fences):
{"shouldMerge": true, "reason": "brief lowercase explanation"}
all text must be lowercase.`;

    try {
      const raw = await generateText(prompt, this.config);
      const parsed = extractJson<{ shouldMerge: boolean; reason: string }>(raw);

      if (parsed && typeof parsed.reason === 'string') {
        return {
          ...suggestion,
          reason: parsed.reason.toLowerCase(),
        };
      }
    } catch (err) {
      console.error('[stale-detector] llm enrichment failed:', err);
    }

    return {
      ...suggestion,
      reason: `${Math.round(suggestion.similarity * 100)}% semantic similarity detected`,
    };
  }
}

export default StaleDetector;
