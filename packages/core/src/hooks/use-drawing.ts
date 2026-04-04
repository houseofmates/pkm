import { useState, useEffect, useRef, useCallback } from 'react';
import { useEdgelessStore, flushDrawingOps } from '@/features/edgeless/store';
import type { OplogHistory } from '@/features/edgeless/store';
import { updateDrawingMeta, saveCheckpoint } from '@/features/edgeless/storage';
import { canvasSync } from '@/features/edgeless/sync/canvas-sync';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface UseDrawingResult {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  saving: boolean;
  syncStatus: SyncStatus;
  saveCurrentCheckpoint: () => Promise<void>;
  updateTitle: (newTitle: string) => Promise<void>;
  handleForceSync: () => Promise<void>;
  history: OplogHistory;
}

export function useDrawing(id?: string, migrating?: boolean): UseDrawingResult {

  const [title, setTitle] = useState('untitled drawing');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  const initialLoadCompleteRef = useRef(false);
  const lastCheckpointRef = useRef(0);
  const lastCheckpointTimeRef = useRef(Date.now());
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // No longer using historyOpsLength via hook to avoid re-renders on every stroke.
  const historyOpsLengthRef = useRef(0);

  // Sync the ref with the store manually
  useEffect(() => {
    return useEdgelessStore.subscribe(
      (state) => {
        historyOpsLengthRef.current = state.history.ops.length;
      }
    );
  }, []);
  const loadFromOplog = useEdgelessStore(s => s.loadFromOplog);
  const setDrawingId = useEdgelessStore(s => s.setDrawingId);
  const setElements = useEdgelessStore(s => s.setElements);
  const setTool = useEdgelessStore(s => s.setTool);
  const setMode = useEdgelessStore(s => s.setMode);

  // load drawing from oplog
  useEffect(() => {
    if (!id || migrating) return;

    const load = async () => {
      setLoading(true);

      try {
        setDrawingId(id);
        const meta = await updateDrawingMeta(id, {});
        if (typeof meta.title === 'string') setTitle(meta.title);
        setSyncStatus((meta.syncState as SyncStatus) || 'synced');

        await loadFromOplog(id);
        canvasSync.start();
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        secureLogger.error('failed to load drawing:', e);
        toast.error('failed to load drawing');
      } finally {
        setLoading(false);
        setTimeout(() => {
          initialLoadCompleteRef.current = true;
          secureLogger.info('[drawing] load complete, saves enabled');
        }, 500);
      }
    };

    load();
    return () => {
      setDrawingId('');
      setElements([]);
      setMode('draw');
      setTool('select');
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [id, migrating, setDrawingId, loadFromOplog, setElements, setMode, setTool]);

  // sync status polling
  useEffect(() => {
    if (!id) return;
    const checkStatus = () => {
      const state = canvasSync.getSyncState(id);
      if (state.pendingCount > 0) setSyncStatus('pending');
      else setSyncStatus('synced');
    };

    syncIntervalRef.current = setInterval(checkStatus, 2000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [id]);

  // define save function before the effect that uses it
  const saveCurrentCheckpoint = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const canvasData = (window as unknown as { pkmGetCanvasJSON?: () => unknown }).pkmGetCanvasJSON?.();
      if (canvasData) {
        await saveCheckpoint(id, canvasData);
        lastCheckpointRef.current = historyOpsLengthRef.current;
        lastCheckpointTimeRef.current = Date.now();

        const thumbnail = (window as unknown as { pkmGetCanvasThumbnail?: () => unknown }).pkmGetCanvasThumbnail?.();
        if (thumbnail) await updateDrawingMeta(id, { thumbnail });
        secureLogger.info('[drawing] checkpoint saved');
      }
    } catch (e) {
      secureLogger.error('checkpoint save failed:', e);
    } finally {
      setSaving(false);
    }
  }, [id]);

  // ref to always point to latest version of saveCurrentCheckpoint
  const saveCurrentCheckpointRef = useRef(saveCurrentCheckpoint);
  saveCurrentCheckpointRef.current = saveCurrentCheckpoint;

  // auto-save effect - uses store subscription to monitor progress without re-renders
  useEffect(() => {
    if (!id || loading) return;
    
    // Check every 5 seconds as a fallback, and also on every store change
    const checkAndSave = () => {
      if (!initialLoadCompleteRef.current) return;
      const state = useEdgelessStore.getState();
      const curLen = state.history.ops.length;
      const timeSinceLast = Date.now() - lastCheckpointTimeRef.current;
      const opsSinceLast = curLen - lastCheckpointRef.current;

      const shouldCheckpoint = opsSinceLast >= 50 || (opsSinceLast > 0 && timeSinceLast > 30000);
      
      if (shouldCheckpoint) {
        saveCurrentCheckpointRef.current();
      }
    };

    const unsubscribe = useEdgelessStore.subscribe(checkAndSave);
    const interval = setInterval(checkAndSave, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [id, loading]);

  // emergency save on unload
  useEffect(() => {
    const handleUnload = () => {
      saveCurrentCheckpointRef.current();
      if (id) void flushDrawingOps(id);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [id]);

  // persist element state (widgets, notes, etc.) when it changes
  useEffect(() => {
    if (!id) return;
    let timeout: number | null = null;
    const unsubscribe = useEdgelessStore.subscribe((s, prev) => {
      if (s.elements === prev.elements) return;
      if (!initialLoadCompleteRef.current) return;
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        saveCurrentCheckpointRef.current();
      }, 1000);
    });
    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [id]);

  // manual save listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentCheckpointRef.current();
        if (id) canvasSync.forceSync(id);
        toast.success('saved');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [id]);

  // conflict listener
  useEffect(() => {
    const handleConflict = (e: CustomEvent<{ drawingId?: string }>) => {
      if (e.detail?.drawingId === id) {
        setSyncStatus('conflict');
        toast.error('sync conflict detected - manual resolution required');
        secureLogger.warn('[drawing] sync conflict:', e.detail);
      }
    };
    window.addEventListener('pkm:sync-conflict', handleConflict as EventListener);
    return () => window.removeEventListener('pkm:sync-conflict', handleConflict as EventListener);
  }, [id]);

  const updateTitle = useCallback(async (newTitle: string) => {
    setTitle(newTitle);
    if (id) await updateDrawingMeta(id, { title: newTitle });
  }, [id]);

  const handleForceSync = useCallback(async () => {
    if (!id) return;
    setSyncStatus('pending');
    await saveCurrentCheckpointRef.current();
    const success = await canvasSync.forceSync(id);
    if (success) {
      setSyncStatus('synced');
      toast.success('synced to server');
    } else {
      toast.error('sync failed');
    }
  }, [id]);

  return {
    title,
    setTitle,
    loading,
    saving,
    syncStatus,
    saveCurrentCheckpoint,
    updateTitle,
    handleForceSync,
    history: { ops: { length: historyOpsLengthRef.current } } as any, // Only mock what the legacy returned property actually exposes to not break API completely
  };
}
