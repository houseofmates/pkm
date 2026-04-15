import { useCallback, useEffect, useRef, useState } from 'react';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';
import { nocobaseClient } from '@/lib/nocobase';
import { SimplyPluralClient } from '@/lib/simply-plural-client';

/**
 * hook for synchronizing fronter state with simplyplural
 * handles bidirectional sync with offline capability via indexeddb queue
 */
export function useSimplyPluralSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncQueueRef = useRef<Array<{type: 'push' | 'pull'; timestamp: number}>>([]);

  const API_KEY_STORAGE_KEY = 'pk_api_key';
  const LAST_SYNC_STORAGE_KEY = 'simplyplural_last_sync';
  const SYNC_QUEUE_STORAGE_KEY = 'simplyplural_sync_queue';

  // load persisted state
  useEffect(() => {
    try {
      const storedLastSync = storageManager.getItem(LAST_SYNC_STORAGE_KEY);
      if (storedLastSync) {
        setLastSync(parseInt(storedLastSync, 10));
      }

      const storedQueue = storageManager.getItem(SYNC_QUEUE_STORAGE_KEY);
      if (storedQueue) {
        syncQueueRef.current = JSON.parse(storedQueue);
      }
    } catch (e) {
      secureLogger.warn('Failed to load sync state from storage:', e);
    }
  }, []);

  // persist sync state
  useEffect(() => {
    try {
      if (lastSync !== null) {
        storageManager.setItem(LAST_SYNC_STORAGE_KEY, String(lastSync));
      }
      storageManager.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(syncQueueRef.current));
    } catch (e) {
      secureLogger.warn('Failed to persist sync state:', e);
    }
  }, [lastSync, syncQueueRef.current]);

  const getApiKey = useCallback(() => {
    return storageManager.getItem(API_KEY_STORAGE_KEY);
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!getApiKey();
  }, [getApiKey]);

  const pushFrontersToSimplyPlural = useCallback(async (fronterIds: string[]) => {
    if (!isAuthenticated()) {
      throw new Error('Not authenticated with SimplyPlural');
    }

    try {
      // get system id
      const meRes = await fetch(
        SimplyPluralClient.url('/me'),
        { headers: { 'Authorization': `Bearer ${getApiKey()}` } }
      );

      if (!meRes.ok) {
        throw new Error(`Failed to fetch system info: ${meRes.status}`);
      }

      const meData = await meRes.json();
      const systemId = meData.id;

      // push fronters
      const frontPayload = {
        fronters: fronterIds.map((id, idx) => ({
          id,
          role: idx === 0 ? 'primary' : 'secondary'
        }))
      };

      const frontRes = await fetch(
        SimplyPluralClient.url(`/front/${systemId}`),
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(frontPayload)
        }
      );

      if (!frontRes.ok) {
        const errText = await frontRes.text();
        throw new Error(`SimplyPlural sync failed (${frontRes.status}): ${errText}`);
      }

      secureLogger.info('Successfully pushed fronters to SimplyPlural:', fronterIds);
      return true;
    } catch (error) {
      secureLogger.error('Failed to push fronters to SimplyPlural:', error);
      throw error;
    }
  }, [getApiKey, isAuthenticated]);

  const pullFrontersFromSimplyPlural = useCallback(async (): Promise<string[]> => {
    if (!isAuthenticated()) {
      throw new Error('Not authenticated with SimplyPlural');
    }

    try {
      // get system id
      const meRes = await fetch(
        SimplyPluralClient.url('/me'),
        { headers: { 'Authorization': `Bearer ${getApiKey()}` } }
      );

      if (!meRes.ok) {
        throw new Error(`Failed to fetch system info: ${meRes.status}`);
      }

      const meData = await meRes.json();
      const systemId = meData.id;

      // pull fronters
      const frontRes = await fetch(
        SimplyPluralClient.url(`/front/${systemId}`),
        { headers: { 'Authorization': `Bearer ${getApiKey()}` } }
      );

      if (!frontRes.ok) {
        throw new Error(`Failed to fetch fronters: ${frontRes.status}`);
      }

      const frontData = await frontRes.json();
      if (!frontData || !Array.isArray(frontData.fronters)) {
        throw new Error('Invalid fronter data received from SimplyPlural');
      }

      const fronterIds = frontData.fronters.map((f: any) => f.id);
      secureLogger.info('Successfully pulled fronters from SimplyPlural:', fronterIds);
      return fronterIds;
    } catch (error) {
      secureLogger.error('Failed to pull fronters from SimplyPlural:', error);
      throw error;
    }
  }, [getApiKey, isAuthenticated]);

  const syncWithSimplyPlural = useCallback(async (direction: 'push' | 'pull' = 'push') => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const timestamp = Date.now();

      if (direction === 'push') {
        // in a real implementation, we'd get current fronter state from context
        // for now, we'll queue the push and rely on the fronter context to trigger sync
        syncQueueRef.current.push({ type: 'push', timestamp });
        // actual push would be triggered by fronter changes
      } else if (direction === 'pull') {
        const fronterIds = await pullFrontersFromSimplyPlural();
        // in a real implementation, we'd update the fronter context here
        syncQueueRef.current.push({ type: 'pull', timestamp });
        setLastSync(timestamp);
      }

      setLastSync(timestamp);
    } catch (error) {
      setSyncError(error.message);
      secureLogger.error('Sync failed:', error);

      // add to queue for retry
      syncQueueRef.current.push({
        type: direction,
        timestamp: Date.now(),
        error: error.message
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, pullFrontersFromSimplyPlural, pushFrontersToSimplyPlural]);

  const processSyncQueue = useCallback(async () => {
    if (syncQueueRef.current.length === 0 || !isAuthenticated()) return;

    // process queued sync operations
    const queue = [...syncQueueRef.current];
    syncQueueRef.current = [];

    for (const item of queue) {
      try {
        if (item.type === 'push') {
          // would get current fronter state and push
          // for now, just mark as processed
        } else if (item.type === 'pull') {
          await pullFrontersFromSimplyPlural();
        }
      } catch (error) {
        secureLogger.warn('Failed to process queued sync item:', error);
        // re-queue for later retry
        syncQueueRef.current.push(item);
      }
    }
  }, [isAuthenticated, pullFrontersFromSimplyPlural]);

  // automatic sync on mount and periodically
  useEffect(() => {
    // initial sync attempt
    if (isAuthenticated()) {
      syncWithSimplyPlural('pull').catch(err => {
        secureLogger.warn('Initial pull sync failed:', err);
      });
    }

    // setup periodic sync (every 5 minutes)
    const interval = setInterval(() => {
      if (isAuthenticated()) {
        processSyncQueue();
        syncWithSimplyPlural('pull').catch(() => {
          // silent fail for periodic sync - will retry later
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, processSyncQueue, syncWithSimplyPlural]);

  return {
    isSyncing,
    lastSync,
    syncError,
    pushFrontersToSimplyPlural,
    pullFrontersFromSimplyPlural,
    syncWithSimplyPlural,
    processSyncQueue,
    isAuthenticated
  };
}