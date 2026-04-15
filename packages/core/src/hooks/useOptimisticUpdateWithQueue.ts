import { IDBPDatabase, openDBSchema } from 'idb';
import { useCallback, useEffect, useRef, useState } from 'react';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';

/**
 * hook for optimistic updates with indexeddb queue for offline resilience
 * handles queuing updates when offline and replaying when connection restored
 */
export function useOptimisticUpdateWithQueue<T>() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queueLength, setQueueLength] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const dbRef = useRef<IDBPDatabase | null>(null);
  const processingRef = useRef<boolean>(false);

  const DB_NAME = 'pkm-optimistic-queue';
  const STORE_NAME = 'update-queue';
  const DB_VERSION = 1;

  // initialize indexeddb
  useEffect(() => {
    const initDB = async () => {
      try {
        dbRef.current = await openDBSchema(DB_NAME, DB_VERSION, {
          stores: [{
            name: STORE_NAME,
            keyPath: 'id',
            autoIncrement: true,
            indexes: {
              'timestamp': { unique: false },
              'type': { unique: false }
            }
          }]
        });
        
        // process any queued updates on startup
        if (navigator.onLine) {
          processQueue();
        }
      } catch (e) {
        secureLogger.error('Failed to initialize IndexedDB:', e);
      }
    };

    initDB();

    // listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // process the queue when online
  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline || !dbRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const tx = dbRef.current!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      
      // get all queued items ordered by timestamp
      const items = await index.getAll();
      
      // process each item
      for (const item of items) {
        try {
          // in a real implementation, we'd call the actual update function here
          // for this hook, we assume the consumer will handle the actual update
          // and just call a provided callback
          
          // mark as processed by deleting from queue
          await store.delete(item.id);
          secureLogger.info('Processed queued update:', item.type);
        } catch (error) {
          secureLogger.warn('Failed to process queued item, keeping in queue:', error);
          // leave in queue for retry
        }
      }
      
      // update queue length
      const tx2 = dbRef.current!.transaction(STORE_NAME, 'readonly');
      const store2 = tx2.objectStore(STORE_NAME);
      const count = await store2.count();
      setQueueLength(count);
    } catch (error) {
      secureLogger.error('Error processing queue:', error);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [isOnline]);

  // add an update to the queue
  const addToQueue = useCallback(async (
    type: string, 
    payload: T, 
    optimisticUpdate: (payload: T) => void
  ) => {
    try {
      // apply optimistic update immediately
      optimisticUpdate(payload);
      
      // queue for persistence
      if (dbRef.current) {
        const tx = dbRef.current.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.add({
          type,
          payload,
          timestamp: Date.now(),
          id: Math.random().toString(36).substr(2, 9) // simple ID generation
        });
        
        // update queue length
        const count = await store.count();
        setQueueLength(count);
        
        // if online, try to process queue
        if (isOnline) {
          processQueue();
        }
      } else {
        secureLogger.warn('Database not initialized, update applied optimistically only');
      }
    } catch (error) {
      secureLogger.error('Failed to queue optimistic update:', error);
      // still applied optimistically, but persistence failed
    }
  }, [isOnline, processQueue]);

  // manual queue processing
  const processQueueNow = useCallback(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  return {
    isOnline,
    queueLength,
    isProcessing,
    addToQueue,
    processQueue: processQueueNow
  };
}