import type { VectorStore, IndexedDocument } from '../semantic-weave/vector-store.js';
import type { WeaveConfig } from '../shared/config.js';
import { generateText, extractJson } from '../shared/ollama.js';

// ── types ────────────────────────────────────────────────────

export interface ConceptCluster {
  id: number;
  documentIds: string[];
  titles: string[];
  suggestedTags: string[];
  reason: string;
}

// ── cluster tagger ───────────────────────────────────────────

export class ClusterTagger {
  constructor(
    private vectorStore: VectorStore,
    private config: WeaveConfig,
  ) {}

  /**
   * identify concept clusters among indexed documents and suggest
   * descriptive tags for each cluster using the local llm.
   *
   * algorithm:
   *   1. build an adjacency graph where edges connect documents with
   *      cosine similarity above a threshold (lower than merge threshold).
   *   2. extract connected components via union-find.
   *   3. discard singletons and pairs (too small to be meaningful clusters).
   *   4. for each component, ask the llm to suggest tags.
   */
  async analyze(): Promise<ConceptCluster[]> {
    const docs = this.vectorStore.getAll();
    if (docs.length < 3) return [];

    // ── step 1: build adjacency via pairwise cosine similarity ─
    // use a lower threshold than merge detection so we catch thematic groups
    const clusterThreshold = this.config.mergeSimilarityThreshold * 0.75;
    const parent = new Map<string, string>();

    // initialize union-find
    for (const doc of docs) {
      parent.set(doc.id, doc.id);
    }

    for (let i = 0; i < docs.length; i++) {
      const a = docs[i];
      if (!a.embedding.length) continue;

      for (let j = i + 1; j < docs.length; j++) {
        const b = docs[j];
        if (!b.embedding.length) continue;

        const sim = cosineSim(a.embedding, b.embedding);
        if (sim >= clusterThreshold) {
          union(parent, a.id, b.id);
        }
      }
    }

    // ── step 2: extract connected components ─────────────────
    const components = new Map<string, IndexedDocument[]>();
    for (const doc of docs) {
      const root = find(parent, doc.id);
      let group = components.get(root);
      if (!group) {
        group = [];
        components.set(root, group);
      }
      group.push(doc);
    }

    // ── step 3: filter and sort ──────────────────────────────
    const meaningfulClusters = Array.from(components.values())
      .filter(group => group.length >= 3)
      .sort((a, b) => b.length - a.length);

    // ── step 4: llm tag suggestion ───────────────────────────
    const results: ConceptCluster[] = [];
    let clusterId = 1;

    for (const group of meaningfulClusters) {
      const suggestion = await this.suggestTagsForCluster(group);
      results.push({
        id: clusterId++,
        documentIds: group.map(d => d.id),
        titles: group.map(d => d.title),
        suggestedTags: suggestion.tags,
        reason: suggestion.reason,
      });
    }

    return results;
  }

  // ── llm tag suggestion ─────────────────────────────────────

  private async suggestTagsForCluster(
    group: IndexedDocument[],
  ): Promise<{ tags: string[]; reason: string }> {
    // build a concise summary of the cluster for the llm
    const notesSummary = group
      .slice(0, 10) // cap at 10 to stay within context window
      .map((d, i) => {
        const excerpt = d.plainText.slice(0, 250).replace(/\n/g, ' ');
        const existingTags = d.tags.length ? ` [tags: ${d.tags.join(', ')}]` : '';
        return `${i + 1}. "${d.title}"${existingTags}: ${excerpt}`;
      })
      .join('\n');

    const prompt = `you are a knowledge management assistant. analyze these related notes and suggest 2-5 descriptive tags that capture their common themes. tags should be lowercase, short, and useful for filtering.

notes:
${notesSummary}

respond with only a json object in this exact format (no markdown fences, no extra text):
{"tags": ["tag1", "tag2"], "reason": "brief explanation of the common theme"}
all text must be lowercase.`;

    try {
      const raw = await generateText(prompt, this.config);
      const parsed = extractJson<{ tags: string[]; reason: string }>(raw);

      if (parsed && Array.isArray(parsed.tags)) {
        return {
          tags: parsed.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean),
          reason: String(parsed.reason || '').toLowerCase(),
        };
      }
    } catch (err) {
      console.error('[cluster-tagger] llm suggestion failed:', err);
    }

    // fallback: use existing tags from the cluster
    const tagCounts = new Map<string, number>();
    for (const doc of group) {
      for (const tag of doc.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const fallbackTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    return {
      tags: fallbackTags,
      reason: 'tags derived from existing document metadata (llm unavailable)',
    };
  }
}

// ── union-find ───────────────────────────────────────────────

function find(parent: Map<string, string>, x: string): string {
  let root = x;
  while (parent.get(root) !== root) {
    root = parent.get(root)!;
  }
  // path compression
  let current = x;
  while (current !== root) {
    const next = parent.get(current)!;
    parent.set(current, root);
    current = next;
  }
  return root;
}

function union(parent: Map<string, string>, a: string, b: string): void {
  const rootA = find(parent, a);
  const rootB = find(parent, b);
  if (rootA !== rootB) {
    parent.set(rootA, rootB);
  }
}

// ── cosine similarity ────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  const denom = Math.sqrt(nA) * Math.sqrt(nB);
  return denom === 0 ? 0 : dot / denom;
}

export default ClusterTagger;
