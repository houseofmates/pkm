import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdownFile, type MarkdownLink } from '../shared/markdown-parser.js';
import type { VectorStore } from '../semantic-weave/vector-store.js';

// ── types ────────────────────────────────────────────────────

export interface BrokenLink {
  source: string;       // file containing the broken link
  target: string;       // the unresolvable link target
  line: number;
  linkType: 'wiki' | 'markdown' | 'url';
  suggestions: string[]; // possible correct targets (by edit distance)
}

// ── link checker ─────────────────────────────────────────────

export class LinkChecker {
  constructor(
    private notesDir: string,
    private vectorStore: VectorStore,
  ) {}

  /**
   * scan all indexed documents for internal links that don't resolve
   * to any known file in the notes directory. returns broken links
   * with up to 3 suggested fixes ranked by edit distance.
   */
  async check(): Promise<BrokenLink[]> {
    const allDocs = this.vectorStore.getAll();
    const knownIds = new Set(this.vectorStore.allIds());
    const knownBasenames = new Map<string, string>(); // lowercase basename → id

    for (const id of knownIds) {
      const base = path.basename(id, '.md').toLowerCase();
      knownBasenames.set(base, id);
    }

    const broken: BrokenLink[] = [];

    for (const doc of allDocs) {
      // re-parse to get link positions (links in indexed doc only have targets)
      const filePath = path.join(this.notesDir, doc.id);
      let raw: string;
      try {
        raw = await fs.promises.readFile(filePath, 'utf-8');
      } catch {
        continue; // file may have been deleted since indexing
      }

      const parsed = parseMarkdownFile(raw, filePath);

      for (const link of parsed.links) {
        if (link.type === 'url') continue; // skip external urls

        const resolved = this.resolveLink(link, doc.id, knownIds, knownBasenames);
        if (resolved) continue; // link is valid

        const suggestions = this.suggestFixes(link.target, Array.from(knownIds));
        broken.push({
          source: doc.id,
          target: link.target,
          line: link.line,
          linkType: link.type,
          suggestions,
        });
      }
    }

    return broken;
  }

  // ── link resolution ────────────────────────────────────────

  private resolveLink(
    link: MarkdownLink,
    sourceId: string,
    knownIds: Set<string>,
    knownBasenames: Map<string, string>,
  ): string | null {
    const target = link.target;

    // strip anchors (#section)
    const withoutAnchor = target.split('#')[0];
    if (!withoutAnchor) return sourceId; // self-reference anchor

    // try exact match (relative path)
    const sourceDir = path.dirname(sourceId);
    const relative = path.normalize(path.join(sourceDir, withoutAnchor));
    if (knownIds.has(relative)) return relative;

    // try with .md extension
    const withMd = relative.endsWith('.md') ? relative : relative + '.md';
    if (knownIds.has(withMd)) return withMd;

    // wiki-link style: match by basename
    const baseLower = withoutAnchor.toLowerCase().replace(/\.md$/i, '');
    const byBasename = knownBasenames.get(baseLower);
    if (byBasename) return byBasename;

    // try as absolute path from notes root
    if (knownIds.has(withoutAnchor)) return withoutAnchor;
    const absWithMd = withoutAnchor.endsWith('.md') ? withoutAnchor : withoutAnchor + '.md';
    if (knownIds.has(absWithMd)) return absWithMd;

    // also check if the file exists on disk but isn't indexed yet
    const diskPath = path.join(this.notesDir, withMd);
    if (fs.existsSync(diskPath)) return withMd;

    return null;
  }

  // ── suggestion engine ──────────────────────────────────────

  private suggestFixes(brokenTarget: string, allIds: string[]): string[] {
    const targetLower = brokenTarget.toLowerCase().replace(/\.md$/i, '');
    const scored: Array<{ id: string; distance: number }> = [];

    for (const id of allIds) {
      const idLower = id.toLowerCase().replace(/\.md$/i, '');
      const baseLower = path.basename(idLower);

      // compute distance against both full path and basename
      const distFull = levenshtein(targetLower, idLower);
      const distBase = levenshtein(targetLower, baseLower);
      const dist = Math.min(distFull, distBase);

      // only suggest if reasonably close (within 40% of target length)
      if (dist <= Math.max(targetLower.length * 0.4, 3)) {
        scored.push({ id, distance: dist });
      }
    }

    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, 3).map(s => s.id);
  }
}

// ── levenshtein distance ─────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // use single-row optimization
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const current = Math.min(
        row[j] + 1,          // deletion
        row[j - 1] + 1,      // insertion
        prev + cost,          // substitution
      );
      prev = row[j];
      row[j] = current;
    }
  }

  return row[n];
}

export default LinkChecker;
