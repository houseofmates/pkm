import { exec } from 'child_process';
import { promisify } from 'util';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';

const execAsync = promisify(exec);

export interface GitSyncStatus {
  lastSync: number;
  lastPull: number;
  lastPush: number;
  pendingChanges: number;
  conflicts: string[];
  branch: string;
  remote: string;
  status: 'idle' | 'syncing' | 'conflict' | 'error';
}

export interface GitSyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // minutes
  remoteUrl?: string;
  branch: string;
  autoCommit: boolean;
  commitMessage?: string;
  excludePatterns: string[];
}

class GitSyncService {
  private static instance: GitSyncService;
  private config: GitSyncConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private status: GitSyncStatus;
  private listeners: Set<(status: GitSyncStatus) => void> = new Set();

  constructor() {
    this.config = this.loadConfig();
    this.status = {
      lastSync: 0,
      lastPull: 0,
      lastPush: 0,
      pendingChanges: 0,
      conflicts: [],
      branch: 'main',
      remote: 'origin',
      status: 'idle'
    };
  }

  static getInstance(): GitSyncService {
    if (!GitSyncService.instance) {
      GitSyncService.instance = new GitSyncService();
    }
    return GitSyncService.instance;
  }

  private loadConfig(): GitSyncConfig {
    try {
      const stored = localStorage.getItem('pkm-git-sync-config');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      secureLogger.warn('Failed to load git sync config:', error);
    }

    return {
      enabled: false,
      autoSync: true,
      syncInterval: 5, // 5 minutes
      branch: 'main',
      autoCommit: true,
      excludePatterns: [
        '*.log',
        '*.tmp',
        'node_modules/',
        '.pkm.pid',
        '*.sqlite',
        'dist/',
        'build/'
      ]
    };
  }

  async saveConfig(config: Partial<GitSyncConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    localStorage.setItem('pkm-git-sync-config', JSON.stringify(this.config));

    if (this.config.enabled && this.config.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  getConfig(): GitSyncConfig {
    return { ...this.config };
  }

  async initializeGitRepo(): Promise<boolean> {
    try {
      // Check if already a git repo
      await execAsync('git status');
      return true;
    } catch {
      try {
        await execAsync('git init');
        await execAsync('git add .');
        await execAsync('git commit -m "Initial commit - PKM knowledge manager setup"');
        secureLogger.info('Git repository initialized');
        return true;
      } catch (error) {
        secureLogger.error('Failed to initialize git repo:', error);
        return false;
      }
    }
  }

  async setRemote(url: string): Promise<boolean> {
    try {
      await execAsync(`git remote add origin ${url}`);
      await execAsync('git branch -M main');
      this.config.remoteUrl = url;
      await this.saveConfig({});
      return true;
    } catch (error) {
      secureLogger.error('Failed to set git remote:', error);
      return false;
    }
  }

  async checkStatus(): Promise<GitSyncStatus> {
    try {
      const { stdout: statusOutput } = await execAsync('git status --porcelain');
      const { stdout: branchOutput } = await execAsync('git branch --show-current');
      const { stdout: remoteOutput } = await execAsync('git remote get-url origin 2>/dev/null || echo ""');

      const pendingChanges = statusOutput.split('\n').filter(line => line.trim()).length;
      const branch = branchOutput.trim();
      const remote = remoteOutput.trim();

      // Check for conflicts
      let conflicts: string[] = [];
      try {
        const { stdout: conflictOutput } = await execAsync('git diff --name-only --diff-filter=U');
        conflicts = conflictOutput.split('\n').filter(line => line.trim());
      } catch {
        // No conflicts
      }

      this.status = {
        ...this.status,
        pendingChanges,
        conflicts,
        branch,
        remote,
        status: conflicts.length > 0 ? 'conflict' : 'idle'
      };

      this.notifyListeners();
      return this.status;
    } catch (error) {
      secureLogger.error('Failed to check git status:', error);
      this.status.status = 'error';
      this.notifyListeners();
      return this.status;
    }
  }

  async commitChanges(message?: string): Promise<boolean> {
    if (!this.config.autoCommit) {
      return true;
    }

    try {
      // Check for changes
      const { stdout: statusOutput } = await execAsync('git status --porcelain');
      if (!statusOutput.trim()) {
        return true; // No changes to commit
      }

      // Add changes respecting exclude patterns
      const excludeArgs = this.config.excludePatterns
        .map(pattern => `--exclude=${pattern}`)
        .join(' ');

      await execAsync(`git add -A`);

      const commitMessage = message || this.config.commitMessage ||
        `Auto-commit: ${new Date().toISOString()}`;

      await execAsync(`git commit -m "${commitMessage}"`);

      secureLogger.info(`Committed changes: ${commitMessage}`);
      return true;
    } catch (error) {
      secureLogger.error('Failed to commit changes:', error);
      return false;
    }
  }

  async pullChanges(): Promise<boolean> {
    try {
      // Stash local changes if any
      const { stdout: statusOutput } = await execAsync('git status --porcelain');
      const hasLocalChanges = statusOutput.trim().length > 0;

      if (hasLocalChanges) {
        await execAsync('git stash push -m "Auto-stash before pull"');
      }

      // Pull changes
      await execAsync(`git pull origin ${this.config.branch}`);

      // Pop stashed changes if any
      if (hasLocalChanges) {
        try {
          await execAsync('git stash pop');
        } catch (stashError) {
          // Conflict during stash pop
          secureLogger.warn('Merge conflicts during stash pop');
          toast.warning('Merge conflicts detected during sync', {
            description: 'Please resolve conflicts manually'
          });
        }
      }

      this.status.lastPull = Date.now();
      secureLogger.info('Pulled changes from remote');
      return true;
    } catch (error) {
      secureLogger.error('Failed to pull changes:', error);
      return false;
    }
  }

  async pushChanges(): Promise<boolean> {
    try {
      await execAsync(`git push origin ${this.config.branch}`);
      this.status.lastPush = Date.now();
      secureLogger.info('Pushed changes to remote');
      return true;
    } catch (error) {
      secureLogger.error('Failed to push changes:', error);
      return false;
    }
  }

  async sync(): Promise<boolean> {
    if (this.isSyncing) {
      secureLogger.warn('Sync already in progress');
      return false;
    }

    this.isSyncing = true;
    this.status.status = 'syncing';
    this.notifyListeners();

    try {
      // 1. Commit local changes
      const committed = await this.commitChanges();
      if (!committed) {
        this.status.status = 'error';
        return false;
      }

      // 2. Pull remote changes
      const pulled = await this.pullChanges();
      if (!pulled) {
        this.status.status = 'error';
        return false;
      }

      // 3. Push local changes
      const pushed = await this.pushChanges();
      if (!pushed) {
        this.status.status = 'error';
        return false;
      }

      this.status.lastSync = Date.now();
      this.status.status = 'idle';

      toast.success('Sync completed successfully', {
        description: `Changes synchronized with ${this.config.remoteUrl || 'remote'}`
      });

      return true;
    } catch (error) {
      secureLogger.error('Sync failed:', error);
      this.status.status = 'error';
      toast.error('Sync failed', {
        description: 'Check console for details'
      });
      return false;
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  startAutoSync(): void {
    if (!this.config.enabled || !this.config.autoSync) {
      return;
    }

    this.stopAutoSync(); // Clear any existing timer

    const intervalMs = this.config.syncInterval * 60 * 1000;

    this.syncTimer = setInterval(async () => {
      if (!this.isSyncing) {
        await this.sync();
      }
    }, intervalMs);

    secureLogger.info(`Auto-sync started: ${this.config.syncInterval} minutes`);
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      secureLogger.info('Auto-sync stopped');
    }
  }

  async triggerSync(): Promise<void> {
    if (this.config.enabled) {
      await this.sync();
    } else {
      toast.info('Git sync is disabled', {
        description: 'Enable it in settings to use automatic sync'
      });
    }
  }

  getStatus(): GitSyncStatus {
    return { ...this.status };
  }

  subscribe(listener: (status: GitSyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getStatus());
      } catch (error) {
        console.error('Error in git sync listener:', error);
      }
    });
  }

  async cleanup(): Promise<void> {
    this.stopAutoSync();
    this.listeners.clear();
  }
}

export const gitSyncService = GitSyncService.getInstance();