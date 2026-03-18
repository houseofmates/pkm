import fs from 'node:fs';
import path from 'node:path';
import type { VectorStore } from '../semantic-weave/vector-store.js';
import type { WeaveConfig } from '../shared/config.js';
import { generateText } from '../shared/ollama.js';

// ── types ────────────────────────────────────────────────────

export interface ContinuityReport {
  date: string;          // yyyy-mm-dd
  generatedAt: string;   // iso 8601
  added: string[];       // file ids added since last snapshot
  modified: string[];    // file ids modified since last snapshot
  deleted: string[];     // file ids no longer present
  summary: string;       // llm-generated natural language summary
  stats: {
    totalDocuments: number;
    totalWords: number;
    netChange: number;   // added - deleted
  };
}

interface Snapshot {
  date: string;
  files: Record<string, number>; // id → mtime
}

// ── continuity reporter ──────────────────────────────────────

export class ContinuityReporter {
  private snapshotPath: string;
  private reportsDir: string;

  constructor(
    private vectorStore: VectorStore,
    private config: WeaveConfig,
  ) {
    this.snapshotPath = path.join(config.dataDir, 'last-snapshot.json');
    this.reportsDir = path.join(config.dataDir, 'reports');
    fs.mkdirSync(this.reportsDir, { recursive: true });
  }

  /**
   * generate a continuity report comparing the current index state
   * against the last saved snapshot. saves the report and updates
   * the snapshot.
   */
  async generate(date?: Date): Promise<ContinuityReport> {
    const now = date || new Date();
    const dateStr = formatDate(now);

    // load previous snapshot
    const prevSnapshot = await this.loadSnapshot();

    // build current snapshot from vector store
    const currentFiles: Record<string, number> = {};
    const docs = this.vectorStore.getAll();
    for (const doc of docs) {
      currentFiles[doc.id] = doc.mtime;
    }

    // diff
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const [id, mtime] of Object.entries(currentFiles)) {
      if (!(id in prevSnapshot.files)) {
        added.push(id);
      } else if (mtime > prevSnapshot.files[id]) {
        modified.push(id);
      }
    }

    for (const id of Object.keys(prevSnapshot.files)) {
      if (!(id in currentFiles)) {
        deleted.push(id);
      }
    }

    // compute stats
    let totalWords = 0;
    for (const doc of docs) {
      totalWords += doc.wordCount;
    }

    // generate llm summary
    const summary = await this.generateSummary(added, modified, deleted, docs);

    const report: ContinuityReport = {
      date: dateStr,
      generatedAt: now.toISOString(),
      added,
      modified,
      deleted,
      summary,
      stats: {
        totalDocuments: docs.length,
        totalWords,
        netChange: added.length - deleted.length,
      },
    };

    // save report
    const reportPath = path.join(this.reportsDir, `${dateStr}.json`);
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    // update snapshot
    await this.saveSnapshot({ date: dateStr, files: currentFiles });

    console.log(`[continuity] report generated for ${dateStr}: +${added.length} ~${modified.length} -${deleted.length}`);
    return report;
  }

  /**
   * retrieve a previously generated report by date (yyyy-mm-dd).
   */
  async getReport(dateStr: string): Promise<ContinuityReport | null> {
    const reportPath = path.join(this.reportsDir, `${dateStr}.json`);
    if (!fs.existsSync(reportPath)) return null;
    const raw = await fs.promises.readFile(reportPath, 'utf-8');
    return JSON.parse(raw);
  }

  /**
   * list all available report dates.
   */
  async listReports(): Promise<string[]> {
    const files = await fs.promises.readdir(this.reportsDir).catch(() => [] as string[]);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse();
  }

  // ── llm summary ────────────────────────────────────────────

  private async generateSummary(
    added: string[],
    modified: string[],
    deleted: string[],
    allDocs: Array<{ id: string; title: string; plainText: string }>,
  ): Promise<string> {
    if (added.length === 0 && modified.length === 0 && deleted.length === 0) {
      return 'no changes detected since the last report.';
    }

    // build context for the llm
    const docMap = new Map(allDocs.map(d => [d.id, d]));

    const addedSummary = added.slice(0, 10).map(id => {
      const doc = docMap.get(id);
      return doc ? `"${doc.title}"` : id;
    }).join(', ');

    const modifiedSummary = modified.slice(0, 10).map(id => {
      const doc = docMap.get(id);
      return doc ? `"${doc.title}"` : id;
    }).join(', ');

    const deletedSummary = deleted.slice(0, 10).join(', ');

    const parts: string[] = [];
    if (added.length) parts.push(`added (${added.length}): ${addedSummary}`);
    if (modified.length) parts.push(`modified (${modified.length}): ${modifiedSummary}`);
    if (deleted.length) parts.push(`deleted (${deleted.length}): ${deletedSummary}`);

    const prompt = `you are a daily journal assistant for a personal knowledge base. write a brief, friendly summary (2-4 sentences) of what happened today based on these changes. keep the tone warm and encouraging.

${parts.join('\n')}

all text must be lowercase. no markdown formatting.`;

    try {
      const raw = await generateText(prompt, this.config);
      return raw.trim().toLowerCase() || 'changes detected but summary could not be generated.';
    } catch (err) {
      console.error('[continuity] llm summary failed:', err);
      return `${added.length} note(s) added, ${modified.length} modified, ${deleted.length} deleted.`;
    }
  }

  // ── snapshot persistence ───────────────────────────────────

  private async loadSnapshot(): Promise<Snapshot> {
    if (!fs.existsSync(this.snapshotPath)) {
      return { date: '', files: {} };
    }
    const raw = await fs.promises.readFile(this.snapshotPath, 'utf-8');
    return JSON.parse(raw);
  }

  private async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const tmpPath = this.snapshotPath + '.tmp';
    await fs.promises.writeFile(tmpPath, JSON.stringify(snapshot), 'utf-8');
    await fs.promises.rename(tmpPath, this.snapshotPath);
  }
}

// ── helpers ──────────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default ContinuityReporter;
