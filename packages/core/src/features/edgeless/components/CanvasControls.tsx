import { Undo2, Redo2 } from 'lucide-react'
import { useEdgelessStore } from '../store'
import { Button } from '@/components/ui/button'

export function CanvasControls() {
  const { undo, redo, history } = useEdgelessStore()

  // oplog-based history
  const canUndo = history.ops.length > 0
  const canRedo = history.undone.length > 0

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 justify-center items-center w-max">
      <Button
        variant="outline"
        size="icon"
        onClick={() => undo()}
        disabled={!canUndo}
        className="rounded-full bg-background/80 backdrop-blur border-white/10 hover:bg-white/10"
        title="undo (ctrl+z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => redo()}
        disabled={!canRedo}
        className="rounded-full bg-background/80 backdrop-blur border-white/10 hover:bg-white/10"
        title="redo (ctrl+x)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      {/* op count indicator */}
      <div className="flex items-center gap-2 px-3 rounded-full bg-background/80 backdrop-blur border border-white/10">
        <span className="text-xs text-zinc-400 lowercase">
          {history.ops.length > 0 ? `${history.ops.length} ops` : 'empty'}
        </span>
      </div>
    </div>
  )
}
