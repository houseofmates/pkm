// offline service for APK - caches recent records and queues changes for sync
// designed for ~200 records max to stay lightweight on mobile

const CACHE_KEY = 'pkm_offline_cache';
const QUEUE_KEY = 'pkm_offline_queue';
const MAX_CACHED_RECORDS = 200;

interface CachedRecord {
  id: string;
  collection: string;
  data: any;
  cachedAt: number;
  accessedAt: number; // for LRU eviction
}

interface QueuedChange {
  id: string;
  collection: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineCache {
  records: CachedRecord[];
  lastSync: number;
  collections: string[]; // which collections are cached
}

class OfflineService {
  private cache: OfflineCache = { records: [], lastSync: 0, collections: [] };
  private queue: QueuedChange[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private loadFromStorage() {
    try {
      const cacheRaw = localStorage.getItem(CACHE_KEY);
      const queueRaw = localStorage.getItem(QUEUE_KEY);
      if (cacheRaw) this.cache = JSON.parse(cacheRaw);
      if (queueRaw) this.queue = JSON.parse(queueRaw);
    } catch (e) {
      console.error('[Offline] failed to load from storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('[Offline] failed to save to storage', e);
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[Offline] back online, starting sync');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[Offline] went offline');
    });
  }

  // cache a record for offline access
  cacheRecord(collection: string, id: string, data: any) {
    const existingIndex = this.cache.records.findIndex(
      r => r.collection === collection && r.id === id
    );

    const record: CachedRecord = {
      id,
      collection,
      data,
      cachedAt: Date.now(),
      accessedAt: Date.now()
    };

    if (existingIndex >= 0) {
      this.cache.records[existingIndex] = record;
    } else {
      // enforce max cache size with LRU eviction
      if (this.cache.records.length >= MAX_CACHED_RECORDS) {
        this.evictLRU();
      }
      this.cache.records.push(record);
    }

    if (!this.cache.collections.includes(collection)) {
      this.cache.collections.push(collection);
    }

    this.saveToStorage();
  }

  // get cached record if available
  getCachedRecord(collection: string, id: string): any | null {
    const record = this.cache.records.find(
      r => r.collection === collection && r.id === id
    );
    if (record) {
      record.accessedAt = Date.now(); // update LRU
      this.saveToStorage();
      return record.data;
    }
    return null;
  }

  // get all cached records for a collection
  getCachedCollection(collection: string): any[] {
    const records = this.cache.records
      .filter(r => r.collection === collection)
      .sort((a, b) => b.accessedAt - a.accessedAt); // most recent first
    
    // update access times
    records.forEach(r => r.accessedAt = Date.now());
    this.saveToStorage();
    
    return records.map(r => r.data);
  }

  // queue a change for when back online
  queueChange(action: 'create' | 'update' | 'delete', collection: string, data: any) {
    const change: QueuedChange = {
      id: data.id || crypto.randomUUID(),
      collection,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(change);
    this.saveToStorage();
    console.log(`[Offline] queued ${action} for ${collection}`);

    // try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      this.processQueue();
    }

    return change.id;
  }

  // get pending changes count
  getPendingChangesCount(): number {
    return this.queue.length;
  }

  // get pending changes for display
  getPendingChanges(): QueuedChange[] {
    return [...this.queue];
  }

  // remove a change from queue (after successful sync)
  private removeFromQueue(id: string) {
    this.queue = this.queue.filter(q => q.id !== id);
    this.saveToStorage();
  }

  // process the sync queue
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`[Offline] processing ${this.queue.length} queued changes`);

    // process in order, stop on first failure
    for (const change of [...this.queue]) {
      try {
        await this.syncChange(change);
        this.removeFromQueue(change.id);
      } catch (err) {
        console.error(`[Offline] failed to sync change ${change.id}`, err);
        change.retryCount++;
        
        // give up after 5 retries
        if (change.retryCount >= 5) {
          console.log(`[Offline] giving up on change ${change.id} after 5 retries`);
          this.removeFromQueue(change.id);
        }
        break; // stop processing, will retry later
      }
    }

    this.syncInProgress = false;
    this.cache.lastSync = Date.now();
    this.saveToStorage();

    // if more changes queued, process again
    if (this.queue.length > 0 && this.isOnline) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  private async syncChange(change: QueuedChange): Promise<void> {
    // import the singleton api instance directly
    const { api } = await import('@/api/nocobase-client');
    
    switch (change.action) {
      case 'create':
        await api.createRecord(change.collection, change.data);
        break;
      case 'update':
        await api.updateRecord(change.collection, change.data.id, change.data);
        break;
      case 'delete':
        await api.deleteRecord(change.collection, change.data.id);
        break;
    }
  }

  // evict least recently used record when cache is full
  private evictLRU() {
    // sort by accessedAt ascending, remove oldest
    this.cache.records.sort((a, b) => a.accessedAt - b.accessedAt);
    const removed = this.cache.records.shift();
    console.log(`[Offline] evicted LRU record ${removed?.collection}/${removed?.id}`);
  }

  // clear all cached data
  clearCache() {
    this.cache = { records: [], lastSync: 0, collections: [] };
    this.saveToStorage();
  }

  // clear pending changes (use with caution)
  clearQueue() {
    this.queue = [];
    this.saveToStorage();
  }

  // get cache stats
  getStats() {
    return {
      cachedRecords: this.cache.records.length,
      maxRecords: MAX_CACHED_RECORDS,
      pendingChanges: this.queue.length,
      lastSync: this.cache.lastSync,
      collections: this.cache.collections,
      isOnline: this.isOnline
    };
  }
}

// singleton instance
export const offlineService = new OfflineService();

// react hook for offline status
export function useOfflineStatus() {
  const [status, setStatus] = React.useState(() => offlineService.getStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(offlineService.getStats());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    ...status,
    queueChange: offlineService.queueChange.bind(offlineService),
    cacheRecord: offlineService.cacheRecord.bind(offlineService),
    getCachedRecord: offlineService.getCachedRecord.bind(offlineService),
    getCachedCollection: offlineService.getCachedCollection.bind(offlineService),
    processQueue: offlineService.processQueue.bind(offlineService),
    clearCache: offlineService.clearCache.bind(offlineService),
    clearQueue: offlineService.clearQueue.bind(offlineService)
  };
}

// need to import react for the hook
import React from 'react';
