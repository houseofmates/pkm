import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Image as ImageIcon, MoreHorizontal,
  Trash2, ZoomIn, ZoomOut, Save, Type, Palette
} from 'lucide-react';
import { useCollections } from '@/hooks/use-collections';
import { toast } from 'sonner';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { storageManager } from '@/lib/storage-manager';

type ElementType = 'text' | 'image' | 'shape' | 'view';

interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: string; // Text content or Image URL or Collection Name
  style?: React.CSSProperties;
  zIndex: number;
  config?: any; // For views
}

export function MoodboardPage() {
  const [elements, setElements] = useState<BoardElement[]>(() => {
    try { const saved = storageManager.getItem('moodboard_data'); return saved ? JSON.parse(saved) : []; } catch (e) { console.error(e); return []; }
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { collections } = useCollections();
  const containerRef = useRef<HTMLDivElement>(null);



  const handleSave = () => {
    storageManager.setItem('moodboard_data', JSON.stringify(elements));
    toast.success("moodboard saved");
  };

  // --- element operations ---

  const addElement = (type: ElementType, content?: string, extra?: any) => {
    const center = {
      x: (-offset.x + window.innerWidth / 2) / scale,
      y: (-offset.y + window.innerHeight / 2) / scale
    };

    const newEl: BoardElement = {
      id: `el_${Date.now()}`,
      type,
      x: center.x - 100, // Roughly center
      y: center.y - 100,
      w: type === 'view' ? 400 : 200,
      h: type === 'view' ? 300 : type === 'text' ? 50 : 200,
      zIndex: elements.length + 1,
      content: content || '',
      style: {
        backgroundColor: type === 'shape' ? 'var(--primary)' : 'transparent',
        color: '#000000',
        fontSize: '16px',
        borderRadius: '8px',
        ...extra
      }
    };

    if (type === 'text') newEl.content = 'New Text';

    setElements(prev => [...prev, newEl]);
  };

  const updateElement = (id: string, updates: Partial<BoardElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const updateStyle = (id: string, styleUpdates: React.CSSProperties) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el));
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  // --- interaction logic ---
  const [dragState, setdragState] = useState<{ id: string, mode: 'move' | 'resize', startX: number, startY: number, initial: any } | null>(null);
  const [editingId, seteditingId] = useState<string | null>(null);
  // canvas mode state machine: 'viewing' allows drag, 'editing' prevents drag for text input
  const [canvasMode, setCanvasMode] = useState<'viewing' | 'editing'>('viewing');

  const handleMouseMove = (e: React.MouseEvent) => {

    if (dragState) {
      const dx = (e.clientX - dragState.startX) / scale;
      const dy = (e.clientY - dragState.startY) / scale;

      setElements(prev => prev.map(el => {
        if (el.id !== dragState.id) return el;

        if (dragState.mode === 'move') {
          return {
            ...el,
            x: dragState.initial.x + dx,
            y: dragState.initial.y + dy
          };
        } else {
          return {
            ...el,
            w: Math.max(50, dragState.initial.w + dx),
            h: Math.max(50, dragState.initial.h + dy)
          };
        }
      }));
      e.stopPropagation();
    } else if (isDraggingCanvas) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setdragState(null);
    setIsDraggingCanvas(false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-full w-full">
        <div
          className="h-full w-full relative bg-neutral-100 dark:bg-neutral-950 overflow-hidden cursor-grab active:cursor-grabbing font-varela"
          ref={containerRef}
          onMouseDown={(e) => {
            if (e.button === 0 && !dragState) {
              // only drag canvas if clicking background
              if ((e.target as HTMLElement).classList.contains('canvas-area')) {
                setIsDraggingCanvas(true);
                setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
              }
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* infinite canvas content */}
          <div
            className="absolute origin-top-left canvas-area w-[10000px] h-[10000px]"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
            }}
          >
            {elements.map(el => (
              <div
                key={el.id}
                className="absolute group select-none canvas-element"
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.w,
                  height: el.h,
                  zIndex: el.zIndex,
                  ...el.style
                }}
                onMouseDown={(e) => {
                  // Only allow dragging in viewing mode, not when editing
                  if (canvasMode === 'editing' && editingId === el.id) return;
                  e.stopPropagation();
                  if (e.button === 0 && canvasMode === 'viewing') {
                    setdragState({
                      id: el.id,
                      mode: 'move',
                      startX: e.clientX,
                      startY: e.clientY,
                      initial: { x: el.x, y: el.y }
                    });
                  }
                }}
                onDoubleClick={(e) => {
                  if (el.type === 'text') {
                    e.stopPropagation();
                    seteditingId(el.id);
                    setCanvasMode('editing');
                  }
                }}
              >
                {/* render content */}
                {el.type === 'image' && (
                  <img src={el.content} alt="" className="w-full h-full object-cover rounded-lg pointer-events-none" />
                )}

                {el.type === 'shape' && (
                  <div className="w-full h-full rounded-lg" style={{ backgroundColor: el.style?.backgroundColor }} />
                )}

                {el.type === 'text' && (
                  <textarea
                    className={cn(
                      "w-full h-full bg-transparent resize-none outline-none p-2 border-0 transition-colors",
                      editingId === el.id ? "cursor-text select-text pointer-events-auto bg-background/50 backdrop-blur-sm rounded" : "cursor-grab pointer-events-none select-none"
                    )}
                    style={{
                      fontSize: el.style?.fontSize,
                      color: el.style?.color,
                      fontFamily: 'Varela Round, sans-serif'
                    }}
                    value={el.content}
                    onChange={(e) => updateElement(el.id, { content: e.target.value })}
                    onMouseDown={(e) => {
                      // In editing mode, prevent drag initiation on the textarea
                      if (canvasMode === 'editing') {
                        e.stopPropagation();
                      }
                    }}
                    readOnly={editingId !== el.id}
                    onBlur={() => {
                      seteditingId(null);
                      setCanvasMode('viewing');
                    }}
                    ref={(r) => { if (r && editingId === el.id) r.focus(); }}
                  />
                )}

                {el.type === 'view' && collections.find((c: { name: string }) => c.name === el.content) && (
                  <div className="w-full h-full bg-background border rounded-lg overflow-hidden flex flex-col shadow-sm">
                    <div className="bg-muted px-2 py-1 text-xs font-bold ">{el.content}</div>
                    <div className="flex-1 overflow-auto relative">
                      {/* we can reuse dashboard view components */}
                      {/* using a simplified generic helper or specific view */}
                      {/* for moodboard, maybe just table or gallery is best? */}
                      {/* let's default to gallery for visuals */}
                      {(() => {
                        // we need data. moodboard doesn't fetch on its own efficiently yet.
                        // simple placeholder for now or efficient fetch?
                        return <div className="p-4 text-xs text-muted-foreground">database view: {el.content}</div>
                      })()}
                    </div>
                  </div>
                )}

                {/* hover controls */}
                <div className="absolute -top-8 left-0 hidden group-hover:flex gap-1 bg-black/80 rounded p-1 z-50">
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-white" onClick={() => deleteElement(el.id)}><Trash2 className="h-3 w-3" /></Button>
                  {el.type === 'text' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        className="w-4 h-4 rounded overflow-hidden p-0 border-0"
                        onChange={(e) => updateStyle(el.id, { color: e.target.value })}
                      />
                      <Input
                        type="number"
                        className="h-6 w-12 text-xs bg-transparent text-white border-white/20"
                        placeholder="size"
                        onChange={e => updateStyle(el.id, { fontSize: `${e.target.value}px` })}
                      />
                    </div>
                  )}
                  {el.type === 'shape' && (
                    <input
                      type="color"
                      className="w-4 h-4 rounded overflow-hidden p-0 border-0"
                      onChange={(e) => updateStyle(el.id, { backgroundColor: e.target.value })}
                    />
                  )}
                </div>

                {/* resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-primary/50 cursor-se-resize rounded-tl opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setdragState({
                      id: el.id,
                      mode: 'resize',
                      startX: e.clientX,
                      startY: e.clientY,
                      initial: { w: el.w, h: el.h }
                    });
                  }}
                />
              </div>
            ))}
          </div>

          {/* floating hud */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button variant="secondary" onClick={handleSave} size="icon" title="save board"><Save className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setScale(s => s + 0.1)}><ZoomIn className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.1, s - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
          </div>

          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
            long-press anywhere to add items
          </div>

        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={() => addElement('text')}>
          <Type className="mr-2 h-4 w-4" /> add text
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          const url = prompt("Enter Image URL:");
          if (url) addElement('image', url);
        }}>
          <ImageIcon className="mr-2 h-4 w-4" /> add image
        </ContextMenuItem>
        <ContextMenuItem onClick={() => addElement('shape')}>
          <Palette className="mr-2 h-4 w-4" /> add color card
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <MoreHorizontal className="mr-2 h-4 w-4" /> add database
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {collections.map((col: { name: string; title?: string }) => (
              <ContextMenuItem key={col.name} onClick={() => addElement('view', col.name)}>
                {col.title || col.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
