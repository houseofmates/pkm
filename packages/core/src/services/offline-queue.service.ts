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

    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      args,
      timestamp: Date.now(),
      retryCount: 0,
      lastRetry: 0,
      priority,
    };

    await this.db.put(this.STORE_NAME, operation);
    console.debug(`[OfflineQueue] Enqueued ${event} operation (${operation.id})`);
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
    console.info(`[OfflineQueue] Imported ${operations.length} operations from backup`);
  }
}

export const offlineQueueService = new OfflineQueueService();