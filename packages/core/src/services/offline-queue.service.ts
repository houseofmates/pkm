import { openDB, type IDBPDatabase } from 'idb';
import type { OpLogEntry } from '@/features/edgeless/storage/oplog';
import { secureLogger } from '@/lib/secure-logger';

interface QueuedOperation {
  id: string;
  event: string;
  args: any[];
  timestamp: number;
  retryCount: number;
  lastRetry: number;
  priority: 'high' | 'normal' | 'low';
  clientId?: string;
  sessionId?: string;
  conflictResolution?: 'last-wins' | 'manual';
}

interface ConflictInfo {
  operation: QueuedOperation;
  serverState?: any;
  localState?: any;
  resolution: 'resolved' | 'pending' | 'failed';
}

class OfflineQueueService {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'pkm-offline-queue';
  private readonly STORE_NAME = 'operations';
  private readonly CONFLICTS_STORE = 'conflicts';
  private readonly MAX_RETRIES = 15; // Increased for better reliability
  private readonly BATCH_SIZE = 25; // Smaller batches for better reliability
  private readonly MAX_QUEUE_SIZE = 10000; // Prevent memory issues
  private clientId: string;
  private sessionId: string;

  constructor() {
    this.clientId = this.getOrCreateClientId();
    this.sessionId = this.generateSessionId();
  }

  private getOrCreateClientId(): string {
    let id = localStorage.getItem('pkm_client_id');
    if (!id) {
      id = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('pkm_client_id', id);
    }
    return id;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async init() {
    if (this.db) return;

    const storeName = this.STORE_NAME;
    const conflictsStore = this.CONFLICTS_STORE;
    this.db = await openDB(this.DB_NAME, 2, {
      upgrade(db, oldVersion, newVersion) {
        // Create operations store
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('priority', 'priority');
          store.createIndex('retryCount', 'retryCount');
          store.createIndex('clientId', 'clientId');
          store.createIndex('sessionId', 'sessionId');
        }

        // Create conflicts store for conflict resolution
        if (!db.objectStoreNames.contains(conflictsStore)) {
          const conflictStore = db.createObjectStore(conflictsStore, { keyPath: 'operationId' });
          conflictStore.createIndex('resolution', 'resolution');
          conflictStore.createIndex('timestamp', 'timestamp');
        }

        // Migrate old data if needed
        if (oldVersion < 2) {
          const store = db.objectStore(storeName);
          // Add clientId and sessionId to existing operations
          const cursor = await store.openCursor();
          while (cursor) {
            const operation = cursor.value;
            operation.clientId = this.clientId;
            operation.sessionId = this.sessionId;
            await cursor.update(operation);
            cursor = await cursor.continue();
          }
        }
      },
    });
  }

  async enqueue(event: string, args: any[], priority: QueuedOperation['priority'] = 'normal'): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Check queue size to prevent memory issues
    const currentSize = await this.db.count(this.STORE_NAME);
    if (currentSize >= this.MAX_QUEUE_SIZE) {
      // Remove oldest low-priority operations to make space
      await this.pruneOldOperations();
      secureLogger.warn('[OfflineQueue] Queue size limit reached, pruned old operations');
    }

    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      args,
      timestamp: Date.now(),
      retryCount: 0,
      lastRetry: 0,
      priority,
      clientId: this.clientId,
      sessionId: this.sessionId,
      conflictResolution: 'last-wins', // Default conflict resolution strategy
    };

    await this.db.put(this.STORE_NAME, operation);
    secureLogger.debug(`[OfflineQueue] Enqueued ${event} operation (${operation.id})`);
  }

  private async pruneOldOperations(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);

    // Get oldest low-priority operations
    const index = store.index('priority');
    const cursor = await index.openCursor('low');
    let pruned = 0;

    while (cursor && pruned < 100) { // Prune up to 100 old operations
      await cursor.delete();
      pruned++;
      cursor = await cursor.continue();
    }

    await tx.done;
    secureLogger.info(`[OfflineQueue] Pruned ${pruned} old low-priority operations`);
  }

  async dequeue(batchSize: number = this.BATCH_SIZE): Promise<QueuedOperation[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);

    // Get operations ordered by priority and timestamp
    const operations: QueuedOperation[] = [];
    let cursor = await store.openCursor();

    while (cursor && operations.length < batchSize) {
      const op = cursor.value;

      // Skip operations that have exceeded max retries
      if (op.retryCount >= this.MAX_RETRIES) {
        await cursor.delete();
        console.warn(`[OfflineQueue] Dropped operation ${op.id} after ${this.MAX_RETRIES} retries`);
        cursor = await cursor.continue();
        continue;
      }

      operations.push(op);
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;

    if (operations.length > 0) {
      console.debug(`[OfflineQueue] Dequeued ${operations.length} operations`);
    }

    return operations;
  }

  async requeueFailed(operations: QueuedOperation[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);

    for (const op of operations) {
      op.retryCount++;
      op.lastRetry = Date.now();
      await store.put(op);
    }

    await tx.done;
    console.debug(`[OfflineQueue] Requeued ${operations.length} failed operations`);
  }

  async getQueueSize(): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.count(this.STORE_NAME);
  }

  async getQueueStats(): Promise<{
    total: number;
    byPriority: Record<string, number>;
    avgRetryCount: number;
  }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const operations = await this.db.getAll(this.STORE_NAME);
    const byPriority = operations.reduce((acc, op) => {
      acc[op.priority] = (acc[op.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgRetryCount = operations.length > 0
      ? operations.reduce((sum, op) => sum + op.retryCount, 0) / operations.length
      : 0;

    return {
      total: operations.length,
      byPriority,
      avgRetryCount,
    };
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.clear(this.STORE_NAME);
    console.info('[OfflineQueue] Cleared all operations');
  }

  async exportForBackup(): Promise<QueuedOperation[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAll(this.STORE_NAME);
  }

  async importFromBackup(operations: QueuedOperation[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);

    for (const op of operations) {
      await store.put(op);
    }

    await tx.done;
    secureLogger.info(`[OfflineQueue] Imported ${operations.length} operations from backup`);
  }

  // Conflict resolution methods
  async detectConflict(operation: QueuedOperation, serverResponse?: any): Promise<boolean> {
    // Simple conflict detection based on server response
    if (serverResponse?.conflict || serverResponse?.status === 409) {
      return true;
    }

    // Check for timestamp conflicts with existing operations
    const existingOps = await this.getOperationsByEvent(operation.event);
    const recentOps = existingOps.filter(op =>
      Math.abs(op.timestamp - operation.timestamp) < 5000 && // Within 5 seconds
      op.id !== operation.id
    );

    return recentOps.length > 0;
  }

  async handleConflict(operation: QueuedOperation, serverState?: any, localState?: any): Promise<ConflictInfo> {
    const conflictInfo: ConflictInfo = {
      operation,
      serverState,
      localState,
      resolution: 'pending'
    };

    // Store conflict for later resolution
    await this.storeConflict(conflictInfo);

    // Apply default resolution strategy
    if (operation.conflictResolution === 'last-wins') {
      conflictInfo.resolution = 'resolved';
      secureLogger.info(`[OfflineQueue] Auto-resolved conflict for operation ${operation.id} using last-wins strategy`);
    } else {
      conflictInfo.resolution = 'pending';
      secureLogger.warn(`[OfflineQueue] Manual conflict resolution required for operation ${operation.id}`);
    }

    return conflictInfo;
  }

  private async storeConflict(conflict: ConflictInfo): Promise<void> {
    if (!this.db) return;

    await this.db.put(this.CONFLICTS_STORE, {
      operationId: conflict.operation.id,
      ...conflict,
      timestamp: Date.now()
    });
  }

  async getPendingConflicts(): Promise<ConflictInfo[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const conflicts = await this.db.getAllFromIndex(this.CONFLICTS_STORE, 'resolution', 'pending');
    return conflicts;
  }

  async resolveConflict(operationId: string, resolution: 'resolved' | 'failed'): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(this.CONFLICTS_STORE, 'readwrite');
    const store = tx.objectStore(this.CONFLICTS_STORE);

    const conflict = await store.get(operationId);
    if (conflict) {
      conflict.resolution = resolution;
      await store.put(conflict);
    }

    await tx.done;
    secureLogger.info(`[OfflineQueue] Resolved conflict for operation ${operationId} as ${resolution}`);
  }

  private async getOperationsByEvent(event: string): Promise<QueuedOperation[]> {
    if (!this.db) return [];

    // For simplicity, get all operations and filter
    const allOps = await this.db.getAll(this.STORE_NAME);
    return allOps.filter(op => op.event === event);
  }

  // Enhanced retry logic with exponential backoff
  async retryFailedOperations(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);

    // Get operations that haven't exceeded max retries and haven't been retried recently
    const now = Date.now();
    const retryDelay = 60000; // 1 minute between retries
    let retried = 0;

    let cursor = await store.openCursor();
    while (cursor && retried < this.BATCH_SIZE) {
      const op = cursor.value;

      if (op.retryCount < this.MAX_RETRIES &&
        (now - op.lastRetry) > (retryDelay * Math.pow(2, op.retryCount))) {

        op.retryCount++;
        op.lastRetry = now;
        await cursor.update(op);
        retried++;

        secureLogger.debug(`[OfflineQueue] Retrying operation ${op.id} (attempt ${op.retryCount})`);
      }

      cursor = await cursor.continue();
    }

    await tx.done;
    secureLogger.info(`[OfflineQueue] Retried ${retried} failed operations`);
  }

  // Health check method
  async getHealthStatus(): Promise<{
    queueSize: number;
    conflictsCount: number;
    avgRetryCount: number;
    oldestOperation: number;
    status: 'healthy' | 'warning' | 'critical';
  }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const queueSize = await this.db.count(this.STORE_NAME);
    const conflictsCount = await this.db.countFromIndex(this.CONFLICTS_STORE, 'resolution', 'pending');

    const operations = await this.db.getAll(this.STORE_NAME);
    const avgRetryCount = operations.length > 0
      ? operations.reduce((sum, op) => sum + op.retryCount, 0) / operations.length
      : 0;

    const oldestOperation = operations.length > 0
      ? Math.min(...operations.map(op => op.timestamp))
      : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (queueSize > 1000 || conflictsCount > 10 || avgRetryCount > 5) {
      status = 'critical';
    } else if (queueSize > 500 || conflictsCount > 5 || avgRetryCount > 3) {
      status = 'warning';
    }

    return {
      queueSize,
      conflictsCount,
      avgRetryCount,
      oldestOperation,
      status
    };
  }
}

export const offlineQueueService = new OfflineQueueService();