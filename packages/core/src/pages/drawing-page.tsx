import { useParams, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas'
import { Toolbar } from '@/features/edgeless/components/Toolbar'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { secureLogger } from '@/lib/secure-logger'
import { useDrawing } from '@/hooks/use-drawing'

export function DrawingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const migrating = false;

  const {
    title,
    loading,
    saving,
    syncStatus,
    saveCurrentCheckpoint,
    updateTitle,
    handleForceSync,
    history,
  } = useDrawing(id, migrating);

  return (
    <>
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
                className={`text-[10px] lowercase ${syncStatus === 'synced'
                    ? 'text-green-500'
                    : syncStatus === 'conflict'
                      ? 'text-red-500'
                      : 'text-yellow-500'
                  }`}
              >
                {syncStatus}
              </span>
              {saving && <span className="text-[10px] text-zinc-500 lowercase">· saving...</span>}
            </div>
          </div>
        </div>

        {/* status indicators */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 lowercase">{history.ops.length} ops</span>
            {syncStatus !== 'synced' && (
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
      {syncStatus === 'conflict' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-4 py-2 rounded-lg z-[60]">
          <div className="text-xs lowercase">sync conflict - refresh to resolve</div>
        </div>
      )}
    </>
  )
}
