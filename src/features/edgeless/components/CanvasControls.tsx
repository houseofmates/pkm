import { Undo, Redo } from 'lucide-react';
import { useEdgelessStore } from '../store';
import { Button } from '@/components/ui/button';

export function CanvasControls() {
  const { undo, redo, history } = useEdgelessStore();
  const canUndo = history.undoStack.length > 0;
  const canRedo = history.redoStack.length > 0;

  return (
  <div className="absolute bottom-4 left-4 z-50 flex gap-2">
  <Button
 variant="outline"
 size="icon"
 onClick={undo}
 disabled={!canUndo}
 className="rounded-full bg-background/80 backdrop-blur border-white/10 hover:bg-white/10"
 title="Undo (Ctrl+Z)"
  >
 <Undo className="h-4 w-4" />
  </Button>
  <Button
 variant="outline"
 size="icon"
 onClick={redo}
 disabled={!canRedo}
 className="rounded-full bg-background/80 backdrop-blur border-white/10 hover:bg-white/10"
 title="Redo (Ctrl+Shift+Z)"
  >
 <Redo className="h-4 w-4" />
  </Button>
  </div>
  );
}
