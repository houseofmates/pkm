import fs from 'node:fs';
import path from 'node:path';
import type { EmbeddingPipeline } from './pipeline.js';

type ChangeType = 'add' | 'change' | 'unlink';

/**
 * watches a directory of markdown files for changes and feeds them
 * into the embedding pipeline. uses chokidar for reliable cross-platform
 * file system events with debouncing to batch rapid edits.
 */
export class DirectoryWatcher {
  private watcher: ReturnType<typeof import('chokidar')['watch']> | null = null;
  private pendingChanges = new Map<string, ChangeType>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private notesDir: string,
    private pipeline: EmbeddingPipeline,
    private debounceMs: number,
  ) {}

  async start(): Promise<void> {
    if (this.running) return;

    // ensure directory exists
    fs.mkdirSync(this.notesDir, { recursive: true });

    // dynamic import so chokidar is only loaded when the watcher is started
    const chokidar = await import('chokidar');

    this.watcher = chokidar.watch('**/*.md', {
      cwd: this.notesDir,
      persistent: true,
      ignoreInitial: false,      // process existing files on startup
      ignored: /(^|[/\\])\./,     // skip dotfiles
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    this.watcher
      .on('add', (rel: string) => this.enqueue(path.join(this.notesDir, rel), 'add'))
      .on('change', (rel: string) => this.enqueue(path.join(this.notesDir, rel), 'change'))
      .on('unlink', (rel: string) => this.enqueue(path.join(this.notesDir, rel), 'unlink'))
      .on('error', (err: unknown) => console.error('[watcher] error:', err));

    this.running = true;
    console.log(`[watcher] watching ${this.notesDir}`);
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.watcher?.close();
    this.watcher = null;
    this.running = false;
    console.log('[watcher] stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  // ── debounce logic ─────────────────────────────────────────

  private enqueue(absPath: string, type: ChangeType): void {
    // for the same file, 'unlink' takes priority, then 'change', then 'add'
    const existing = this.pendingChanges.get(absPath);
    if (type === 'unlink' || !existing) {
      this.pendingChanges.set(absPath, type);
    } else if (type === 'change' && existing === 'add') {
      // keep as 'add' (file is new + immediately edited)
    } else {
      this.pendingChanges.set(absPath, type);
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.processBatch(), this.debounceMs);
  }

  private async processBatch(): Promise<void> {
    const batch = new Map(this.pendingChanges);
    this.pendingChanges.clear();

    if (batch.size === 0) return;

    console.log(`[watcher] processing ${batch.size} file change(s)`);

    for (const [absPath, type] of batch) {
      try {
        if (type === 'unlink') {
          await this.pipeline.removeFile(absPath);
        } else {
          await this.pipeline.processFile(absPath);
        }
      } catch (err) {
        const rel = path.relative(this.notesDir, absPath);
        console.error(`[watcher] failed to process ${rel}:`, err);
      }
    }

    // persist after each batch
    await this.pipeline.flush();
  }
}

export default DirectoryWatcher;
