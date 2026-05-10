import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';
import { gitSyncService } from './git-sync.service';
import { offlineQueueService } from './offline-queue.service';
import { localDbService } from '../services/local-db.service';

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // seconds
  maxBackups: number;
  backupLocation: 'local' | 'cloud';
  autoSync: boolean;
}

interface SaveState {
  lastSave: number;
  lastBackup: number;
  pendingChanges: number;
  isSaving: boolean;
  isBackingUp: boolean;
}

class AutoSaveService {
  private static instance: AutoSaveService;
  private config: AutoSaveConfig;
  private saveTimer: NodeJS.Timeout | null = null;
  private state: SaveState;
  private listeners: Set<(state: SaveState) => void> = new Set();
  private changeDetector: MutationObserver | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.state = {
      lastSave: 0,
      lastBackup: 0,
      pendingChanges: 0,
      isSaving: false,
      isBackingUp: false
    };
  }

  static getInstance(): AutoSaveService {
    if (!AutoSaveService.instance) {
      AutoSaveService.instance = new AutoSaveService();
    }
    return AutoSaveService.instance;
  }

  private loadConfig(): AutoSaveConfig {
    try {
      const stored = localStorage.getItem('pkm-auto-save-config');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      secureLogger.warn('Failed to load auto-save config:', error);
    }

    return {
      enabled: true,
      interval: 30, // 30 seconds
      maxBackups: 10,
      backupLocation: 'local',
      autoSync: true
    };
  }

  async saveConfig(config: Partial<AutoSaveConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    localStorage.setItem('pkm-auto-save-config', JSON.stringify(this.config));
    
    if (this.config.enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  async startAutoSave(): Promise<void> {
    if (!this.config.enabled) return;

    this.stopAutoSave(); // Clear existing timer

    const intervalMs = this.config.interval * 1000;
    
    this.saveTimer = setInterval(async () => {
      await this.performAutoSave();
    }, intervalMs);

    // Start change detection
    this.startChangeDetection();

    secureLogger.info(`Auto-save started: ${this.config.interval} seconds`);
  }

  stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    if (this.changeDetector) {
      this.changeDetector.disconnect();
      this.changeDetector = null;
    }

    secureLogger.info('Auto-save stopped');
  }

  private startChangeDetection(): void {
    if (typeof document === 'undefined') return;

    this.changeDetector = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.type === 'childList' || 
        (mutation.type === 'attributes' && 
         ['data-content', 'value', 'src'].includes(mutation.attributeName || ''))
      );

      if (hasRelevantChanges) {
        this.state.pendingChanges++;
        this.notifyListeners();
      }
    });

    this.changeDetector.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-content', 'value', 'src']
    });
  }

  async performAutoSave(): Promise<void> {
    if (this.state.isSaving || this.state.pendingChanges === 0) {
      return;
    }

    this.state.isSaving = true;
    this.notifyListeners();

    try {
      // Save canvas state to local storage
      const canvasData = await this.captureCanvasState();
      if (canvasData) {
        await this.saveToLocalStorage(canvasData);
        this.state.lastSave = Date.now();
        
        // Reset pending changes counter
        this.state.pendingChanges = 0;
        
        secureLogger.debug('Auto-save completed successfully');
      }

      // Trigger backup if needed
      await this.performBackup();

      // Trigger sync if enabled
      if (this.config.autoSync) {
        await gitSyncService.triggerSync();
      }

    } catch (error) {
      secureLogger.error('Auto-save failed:', error);
      toast.error('Auto-save failed', {
        description: 'Changes may not be preserved'
      });
    } finally {
      this.state.isSaving = false;
      this.notifyListeners();
    }
  }

  private async captureCanvasState(): Promise<any> {
    try {
      // Get canvas data from edgeless store
      const edgelessStore = await import('@/features/edgeless/store').then(m => m.useEdgelessStore.getState());
      
      return {
        elements: edgelessStore.elements,
        viewport: edgelessStore.viewPort,
        timestamp: Date.now(),
        version: '1.0'
      };
    } catch (error) {
      secureLogger.error('Failed to capture canvas state:', error);
      return null;
    }
  }

  private async saveToLocalStorage(data: any): Promise<void> {
    try {
      const key = `pkm-canvas-autosave-${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(key, JSON.stringify(data));
      
      // Clean old saves
      await this.cleanupOldSaves();
    } catch (error) {
      secureLogger.error('Failed to save to local storage:', error);
      throw error;
    }
  }

  private async cleanupOldSaves(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const saveKeys = keys.filter(key => key.startsWith('pkm-canvas-autosave-'));
      
      if (saveKeys.length > this.config.maxBackups) {
        // Sort by date and remove oldest
        saveKeys.sort();
        const toRemove = saveKeys.slice(0, saveKeys.length - this.config.maxBackups);
        
        for (const key of toRemove) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      secureLogger.warn('Failed to cleanup old saves:', error);
    }
  }

  private async performBackup(): Promise<void> {
    if (this.state.isBackingUp) return;

    const now = Date.now();
    const hoursSinceLastBackup = (now - this.state.lastBackup) / (1000 * 60 * 60);
    
    if (hoursSinceLastBackup < 24) { // Backup once per day
      return;
    }

    this.state.isBackingUp = true;
    this.notifyListeners();

    try {
      if (this.config.backupLocation === 'local') {
        await this.createLocalBackup();
      } else {
        await this.createCloudBackup();
      }
      
      this.state.lastBackup = now;
      secureLogger.info('Backup completed successfully');
      
    } catch (error) {
      secureLogger.error('Backup failed:', error);
      toast.error('Backup failed', {
        description: 'Manual backup recommended'
      });
    } finally {
      this.state.isBackingUp = false;
      this.notifyListeners();
    }
  }

  private async createLocalBackup(): Promise<void> {
    try {
      // Get all relevant data
      const canvasData = await this.captureCanvasState();
      const queueData = await offlineQueueService.exportForBackup();
      
      const backup = {
        canvas: canvasData,
        queue: queueData,
        timestamp: Date.now(),
        version: '1.0'
      };

      // Save as downloadable file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `pkm-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      secureLogger.error('Failed to create local backup:', error);
      throw error;
    }
  }

  private async createCloudBackup(): Promise<void> {
    // This would integrate with cloud storage service
    // For now, fall back to local backup
    await this.createLocalBackup();
  }

  async manualSave(): Promise<void> {
    await this.performAutoSave();
    toast.success('Manual save completed', {
      description: 'All changes have been saved'
    });
  }

  async manualBackup(): Promise<void> {
    await this.performBackup();
    toast.success('Backup completed', {
      description: 'Backup file has been downloaded'
    });
  }

  getState(): SaveState {
    return { ...this.state };
  }

  subscribe(listener: (state: SaveState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in auto-save listener:', error);
      }
    });
  }

  async cleanup(): Promise<void> {
    this.stopAutoSave();
    this.listeners.clear();
  }
}

export const autoSaveService = AutoSaveService.getInstance();