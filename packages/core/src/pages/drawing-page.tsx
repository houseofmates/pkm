import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas'
import { Toolbar } from '@/features/edgeless/components/Toolbar'
import { CanvasControls } from '@/features/edgeless/components/CanvasControls'
import { useEdgelessStore } from '@/features/edgeless/store'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { updateDrawingMeta, saveCheckpoint } from '@/features/edgeless/storage'
import { canvasSync } from '@/features/edgeless/sync/canvas-sync'
import { toast } from 'sonner'

export function DrawingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('untitled drawing')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'conflict'>('synced')
  // migration is now handled globally via CanvasInitializer
  
  const initialLoadCompleteRef = useRef(false)
  const lastCheckpointRef = useRef(0)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // store access
  const {
    elements,
    drawingId,
    setDrawingId,
    history,
    loadFromOplog,
    setElements,
    setTool,
    setMode,
    rebuildSpatialIndex,
  } = useEdgelessStore()


  // load drawing from oplog on mount
  useEffect(() => {
    if (!id || migrating) return

    const load = async () => {
      setLoading(true)

      try {
        // set active drawing
        setDrawingId(id)

        // load metadata
        const meta = await updateDrawingMeta(id, {})
        if (meta.title) setTitle(meta.title)
        setSyncStatus(meta.syncState || 'synced')

        // load oplog state
        await loadFromOplog(id)

        // start sync service
        canvasSync.start()

        // wait for canvas to render
        await new Promise((r) => setTimeout(r, 100))
      } catch (e) {
        secureLogger.error('failed to load drawing:', e)
        toast.error('failed to load drawing')
      } finally {
        setLoading(false)
        setTimeout(() => {
          initialLoadCompleteRef.current = true
          secureLogger.info('[drawing] load complete, saves enabled')
        }, 500)
      }
    }

    load()

    // cleanup on unmount
    return () => {
      setDrawingId('')
      setElements([])
      setMode('draw')
      setTool('select')
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [id, migrating])

  // sync status polling
  useEffect(() => {
    if (!id) return

    const checkStatus = () => {
      const state = canvasSync.getSyncState(id)
      if (state.pendingCount > 0) {
        setSyncStatus('pending')
      } else {
        setSyncStatus('synced')
      }
    }

    syncIntervalRef.current = setInterval(checkStatus, 2000)
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [id])

  // auto-save: periodic checkpoints every 30 seconds or 50 ops
  useEffect(() => {
    if (!id || loading || !initialLoadCompleteRef.current) return

    const shouldCheckpoint =
      history.ops.length - lastCheckpointRef.current >= 50 ||
      Date.now() - lastCheckpointRef.current * 1000 > 30000

    if (shouldCheckpoint) {
      saveCurrentCheckpoint()
    }
  }, [history.ops.length])

  const saveCurrentCheckpoint = useCallback(async () => {
    if (!id) return

    setSaving(true)
    try {
      const canvasData = (window as any).pkmGetCanvasJSON?.()
      if (canvasData) {
        await saveCheckpoint(id, canvasData)
        lastCheckpointRef.current = history.ops.length

        const thumbnail = (window as any).pkmGetCanvasThumbnail?.()
        if (thumbnail) {
          await updateDrawingMeta(id, { thumbnail })
        }

        secureLogger.info('[drawing] checkpoint saved')
      }
    } catch (e) {
      secureLogger.error('checkpoint save failed:', e)
    } finally {
      setSaving(false)
    }
  }, [id, history.ops.length])

  // manual save handler (ctrl+s)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveCurrentCheckpoint()
        if (id) canvasSync.forceSync(id)
        toast.success('saved')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [id, saveCurrentCheckpoint])

  // conflict notification
  useEffect(() => {
    const handleConflict = (e: any) => {
      if (e.detail?.drawingId === id) {
        setSyncStatus('conflict')
        toast.error('sync conflict detected - manual resolution required')
        secureLogger.warn('[drawing] sync conflict:', e.detail)
      }
    }

    window.addEventListener('pkm:sync-conflict', handleConflict)
    return () => window.removeEventListener('pkm:sync-conflict', handleConflict)
  }, [id])

  // title update
  const updateTitle = async (newTitle: string) => {
    setTitle(newTitle)
    if (id) {
      await updateDrawingMeta(id, { title: newTitle })
    }
  }

  // force sync button
  const handleForceSync = async () => {
    if (!id) return
    setsyncstatus('pending')
    await savecurrentcheckpoint()
    const success = await canvassync.forcesync(id)
    if (success) {
      setsyncstatus('synced')
      toast.success('synced to server')
    } else {
      toast.error('sync failed')
    }
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[#090909] flex flex-col">
      {/* header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto bg-black/50 backdrop-blur-sm p-2 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col">
            <input
              type="text"
              value={title}
              onChange={(e) => updateTitle(e.target.value)}
              className="font-bold text-sm leading-none text-white bg-transparent border-none outline-none p-0 w-48 lowercase"
              style={{ fontFamily: 'varela round, sans-serif' }}
              placeholder="untitled drawing"
            />
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] lowercase ${
                  syncStatus === 'synced'
                    ? 'text-green-500'
                    : syncStatus === 'conflict'
                    ? 'text-red-500'
                    : 'text-yellow-500'
                }`}
              >
                {syncstatus}
              </span>
              {saving && <span className="text-[10px] text-zinc-500 lowercase">· saving...</span>}
            </div>
          </div>
        </div>

        {/* status indicators */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 lowercase">{history.ops.length} ops</span>
            {syncstatus !== 'synced' && (
              <button
                onClick={handleForceSync}
                className="text-[10px] text-[#f6b012] hover:underline lowercase"
              >
                sync now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* canvas area */}
      <div className="flex-1 relative z-10 pointer-events-none">
        <div className="pointer-events-auto w-full h-full">
          <Toolbar />
          <CanvasControls />
          <EdgelessCanvas onLoad={() => secureLogger.info('[drawing] canvas ready')} />
        </div>
      </div>

      {/* loading overlay */}
      {(loading || migrating) && (
        <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className="text-[#f6b012] lowercase animate-pulse"
              style={{ fontFamily: 'varela round, sans-serif' }}
            >
              {migrating ? 'migrating legacy data...' : 'loading...'}
            </div>
            {migrating && (
              <div className="text-xs text-zinc-500 lowercase">
                this may take a moment
              </div>
            )}
          </div>
        </div>
      )}

      {/* conflict warning */}
      {syncstatus === 'conflict' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-4 py-2 rounded-lg z-[60]">
          <div className="text-xs lowercase">sync conflict - refresh to resolve</div>
        </div>
      )}
    </div>
  )
}
