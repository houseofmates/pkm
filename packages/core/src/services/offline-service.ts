/* eslint-disable */
// offline service for apk - caches recent records and queues changes for sync
// designed for ~200 records max to stay lightweight on mobile

import { secureLogger } from '@/lib/secure-logger'
<<<<<<< HEAD

const CACHE_KEY = 'pkm_offline_cache';
const QUEUE_KEY = 'pkm_offline_queue';
const MAX_CACHED_RECORDS = 200;
=======
import { nocobaseClient } from '@/lib/nocobase'
import React from 'react'

const CACHE_KEY = 'pkm_offline_cache';
const QUEUE_KEY = 'pkm_offline_queue';
const DEAD_LETTER_KEY = 'pkm_dead_letter_queue';
const MAX_CACHED_RECORDS = 200;
const MAX_RETRIES = 10;
>>>>>>> main

interface CachedRecord {
  id: string;
  collection: string;
  data: any;
  cachedAt: number;
  accessedAt: number; // for lru eviction
}

interface QueuedChange {
  id: string;
  collection: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
<<<<<<< HEAD
=======
  previousVersion?: any; // stored for conflict diff
>>>>>>> main
}

interface OfflineCache {
  records: CachedRecord[];
  lastSync: number;
  collections: string[]; // which collections are cached
}

class OfflineService {
  private cache: OfflineCache = { records: [], lastSync: 0, collections: [] };
  private queue: QueuedChange[] = [];
<<<<<<< HEAD
=======
  private deadLetter: QueuedChange[] = [];
>>>>>>> main
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
<<<<<<< HEAD
      if (cacheRaw) this.cache = JSON.parse(cacheRaw);
      if (queueRaw) this.queue = JSON.parse(queueRaw);
=======
      const deadRaw = localStorage.getItem(DEAD_LETTER_KEY);
      if (cacheRaw) this.cache = JSON.parse(cacheRaw);
      if (queueRaw) this.queue = JSON.parse(queueRaw);
      if (deadRaw) this.deadLetter = JSON.parse(deadRaw);
>>>>>>> main
    } catch (e) {
      secureLogger.error('[Offline] failed to load from storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
<<<<<<< HEAD
=======
      localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(this.deadLetter));
>>>>>>> main
    } catch (e) {
      secureLogger.error('[Offline] failed to save to storage', e);
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      secureLogger.info('[Offline] back online, starting sync');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      secureLogger.info('[Offline] went offline');
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
      // enforce max cache size with lru eviction
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
      record.accessedAt = Date.now(); // update lru
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
<<<<<<< HEAD
=======
    // for updates, store the previous version for conflict diff
    let previousVersion: any = undefined;
    if (action === 'update') {
      const existing = this.getCachedRecord(collection, data.id);
      if (existing) {
        previousVersion = JSON.parse(JSON.stringify(existing));
      }
    }

>>>>>>> main
    const change: QueuedChange = {
      id: data.id || crypto.randomUUID(),
      collection,
      action,
      data,
      timestamp: Date.now(),
<<<<<<< HEAD
      retryCount: 0
=======
      retryCount: 0,
      previousVersion
>>>>>>> main
    };

    this.queue.push(change);
    this.saveToStorage();
    secureLogger.debug(`[Offline] queued ${action} for ${collection}`);

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

<<<<<<< HEAD
=======
  // get dead letter queue count
  getDeadLetterCount(): number {
    return this.deadLetter.length;
  }

  // get dead letter items
  getDeadLetter(): QueuedChange[] {
    return [...this.deadLetter];
  }

>>>>>>> main
  // remove a change from queue (after successful sync)
  private removeFromQueue(id: string) {
    this.queue = this.queue.filter(q => q.id !== id);
    this.saveToStorage();
  }

<<<<<<< HEAD
=======
  // move a change to dead letter queue
  private moveToDeadLetter(change: QueuedChange) {
    this.removeFromQueue(change.id);
    this.deadLetter.push(change);
    this.saveToStorage();
    secureLogger.warn(`[Offline] moved change ${change.id} to dead letter queue`);
  }

  // resolve a conflict from the dead letter queue
  resolveConflict(id: string, resolution: 'local' | 'remote' | 'merge') {
    const item = this.deadLetter.find(d => d.id === id);
    if (!item) {
      secureLogger.warn(`[Offline] conflict ${id} not found in dead letter queue`);
      return;
    }

    if (resolution === 'local') {
      // re-queue the local change
      item.retryCount = 0;
      item.timestamp = Date.now();
      this.queue.push(item);
      this.deadLetter = this.deadLetter.filter(d => d.id !== id);
      this.saveToStorage();
      this.processQueue();
    } else if (resolution === 'remote') {
      // discard local change
      this.deadLetter = this.deadLetter.filter(d => d.id !== id);
      this.saveToStorage();
    } else if (resolution === 'merge') {
      // for now, treat merge as local (re-queue). future: implement merge ui
      item.retryCount = 0;
      item.timestamp = Date.now();
      this.queue.push(item);
      this.deadLetter = this.deadLetter.filter(d => d.id !== id);
      this.saveToStorage();
      this.processQueue();
    }
  }

>>>>>>> main
  // process the sync queue
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    secureLogger.debug(`[Offline] processing ${this.queue.length} queued changes`);

    // process in order, stop on first failure
    for (const change of [...this.queue]) {
      try {
        await this.syncChange(change);
        this.removeFromQueue(change.id);
<<<<<<< HEAD
      } catch (err) {
        secureLogger.error(`[Offline] failed to sync change ${change.id}`, err);
        change.retryCount++;
        
        // give up after 5 retries
        if (change.retryCount >= 5) {
          secureLogger.warn(`[Offline] giving up on change ${change.id} after 5 retries`);
          this.removeFromQueue(change.id);
=======
      } catch (err: any) {
        secureLogger.error(`[Offline] failed to sync change ${change.id}`, err);
        change.retryCount++;
        
        // exponential backoff before next retry
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, change.retryCount));
        await new Promise(r => setTimeout(r, backoffMs));
        
        // give up after max retries
        if (change.retryCount >= MAX_RETRIES) {
          secureLogger.warn(`[Offline] giving up on change ${change.id} after ${MAX_RETRIES} retries`);
          this.moveToDeadLetter(change);
>>>>>>> main
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
<<<<<<< HEAD
    // import the singleton api instance directly
    const { api } = await import('@/api/nocobase-client');
    
=======
    // last-write-wins conflict resolution: fetch remote, compare timestamps
    if (change.action === 'update') {
      try {
        const remote = await nocobaseClient.getRecord(change.collection, change.data.id);
        const remoteData = (remote as any)?.data || remote;
        if (remoteData && remoteData.updatedAt) {
          const remoteTime = new Date(String(remoteData.updatedAt)).getTime();
          const localTime = change.timestamp;
          if (remoteTime > localTime) {
            // remote is newer - store previous version and throw so we can show diff
            change.previousVersion = change.previousVersion || change.data;
            throw new Error(`conflict: remote version is newer (${remoteTime} > ${localTime})`);
          }
        }
      } catch (err: any) {
        // if it's a conflict error, re-throw it
        if (err.message && err.message.includes('conflict:')) {
          throw err;
        }
        // otherwise ignore fetch errors and proceed with local write
      }
    }

>>>>>>> main
    switch (change.action) {
      case 'create':
        await nocobaseClient.createRecord(change.collection, change.data);
        break;
      case 'update':
        await nocobaseClient.updateRecord(change.collection, change.data.id, change.data);
        break;
      case 'delete':
        await nocobaseClient.deleteRecord(change.collection, change.data.id);
        break;
    }
  }

  // evict least recently used record when cache is full
  private evictLRU() {
    // sort by accessedat ascending, remove oldest
    this.cache.records.sort((a, b) => a.accessedAt - b.accessedAt);
    const removed = this.cache.records.shift();
    secureLogger.debug(`[Offline] evicted LRU record ${removed?.collection}/${removed?.id}`);
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

<<<<<<< HEAD
=======
  // clear dead letter queue
  clearDeadLetter() {
    this.deadLetter = [];
    this.saveToStorage();
  }

>>>>>>> main
  // get cache stats
  getStats() {
    return {
      cachedRecords: this.cache.records.length,
      maxRecords: MAX_CACHED_RECORDS,
      pendingChanges: this.queue.length,
<<<<<<< HEAD
=======
      deadLetterCount: this.deadLetter.length,
>>>>>>> main
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
<<<<<<< HEAD
    clearQueue: offlineService.clearQueue.bind(offlineService)
  };
}

// need to import react for the hook
import React from 'react';
=======
    clearQueue: offlineService.clearQueue.bind(offlineService),
    clearDeadLetter: offlineService.clearDeadLetter.bind(offlineService),
    resolveConflict: offlineService.resolveConflict.bind(offlineService)
  };
}
>>>>>>> main
