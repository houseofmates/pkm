import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus, Database, Trash2, Move, Minimize2,
  Lock, Unlock, Pencil, Eraser, MousePointer2, Check, Wand2, FileText, ExternalLink, X, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCollections } from '@/hooks/use-collections';
import { VIEW_REGISTRY, VIEW_OPTIONS } from '@/components/views/registry';
import type { ViewType } from '@/components/views/registry';
import { useAuth } from '@/contexts/auth-context';
import { useDroppable } from '@dnd-kit/core';
import { useAppSetting } from '@/hooks/use-app-setting';
import { HexColorPicker } from 'react-colorful';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getColorStyles } from '@/utils/color-generator';
import { DatabaseWidget } from '@/features/databases/components/database-widget';
import { useFronter } from '@/contexts/fronter-context';
import { HeadmateCard } from '@/features/headmates/components/headmate-card';

type WidgetType = 'view' | 'document' | 'contact';
interface WidgetDefinition {
  id: string;
  type: WidgetType;
  title: string;
  collectionName: string;
  viewType: ViewType;
  viewConfig?: {
  sort?: string[];
  filter?: Record<string, any>;
  viewType?: ViewType;
  };
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
}

export function DashboardGrid({ layoutKey = 'dashboard_widgets_v2' }: { layoutKey?: string }) {
    const [cursorMenu, setCursorMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
    const [drawingTool, setDrawingTool] = useState<'none' | 'pencil' | 'eraser' | 'lasso'>('none');
    const lastDrawingToolRef = useRef<typeof drawingTool | null>(null);
    const [selectionMode, setSelectionMode] = useState<'free' | 'rect' | 'magic'>('free');
    const [brushColor, setBrushColor] = useState('#ffffff');
    const lastCursorModeRef = useRef<'select' | 'pan' | null>(null);
    const [brushSize, setBrushSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(20);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [eraserMenuOpen, setEraserMenuOpen] = useState(false);
    const [lassoMenuOpen, setLassoMenuOpen] = useState(false);
    const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number, y: number } | null>(null);
    const eraserTimerRef = useRef<any>(null);

    // Undo/Redo State
    const undoStack = useRef<ImageData[]>([]);
    const redoStack = useRef<ImageData[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const [lassoPoints, setLassoPoints] = useState<{ x: number, y: number }[]>([]);
    interface FloatingSelection {
        image: string; // Data URL
        x: number;
        y: number;
        w: number;
        h: number;
    }
    const [floatingSelection, _setFloatingSelection] = useState<FloatingSelection | null>(null);
    // Wrap setter to persist changes via setting
    const setFloatingSelection = (v: any) => {
        _setFloatingSelection(v);
    };

    // Save timer ref for debounced autosave
    const saveTimerRef = useRef<number | null>(null);
    // --- Effects ---

    // Mouse Position for Cursor
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Synced Canvas Data - may be a string (legacy) or an object { id, url, data }
    const [savedCanvasData, setSavedCanvasData, , flushSavedCanvas] = useAppSetting<any>('dashboard_canvas_data', null);

    // Persist floating selection separately so it can be resumed across devices
    const [savedFloatingSelection, setSavedFloatingSelection, , flushSavedFloating] = useAppSetting<any>('dashboard_floating_selection_v2', null);

    const lastSyncedUrlRef = useRef<string | null>(null);
    const canvasDirtyRef = useRef(false);
    // Auth client and token for uploads/downloads
    const { client, token, isAuthenticated, login } = useAuth();
    const [apiKey, setApiKey] = useState('');
    
    // Collections and members
    const { collections } = useCollections();
    const { members } = useFronter();

    // UI state for widget adding / wizard
    const [isEditMode, setIsEditMode] = useState(false);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [wizardTab, setWizardTab] = useState<'databases'|'documents'|'contacts'>('databases');
    const [wizardStep, setWizardStep] = useState<'collection'|'view'>('collection');
    const [wizardSearch, setWizardSearch] = useState('');
    const [selectedCollectionForWizard, setSelectedCollectionForWizard] = useState<string | null>(null);
    const [localDocs] = useState<Array<{ id: string, title: string }>>([]);

    // Cursor / selection state
    const [cursorMode, setCursorMode] = useState<'select'|'pan'>('select');
    // Widgets state (persisted to localStorage under the layoutKey)
    const [widgets, setWidgets] = useState<WidgetDefinition[]>(() => {
        try {
            const raw = localStorage.getItem(layoutKey);
            if (raw) return JSON.parse(raw) as WidgetDefinition[];
        } catch (e) { }
        return [] as WidgetDefinition[];
    });

    useEffect(() => {
        try {
            localStorage.setItem(layoutKey, JSON.stringify(widgets));
        } catch (e) { }
    }, [widgets, layoutKey]);

    // DOM refs and pointer tracking
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const pointersRef = useRef<Map<number, { x: number; y: number; type: string }>>(new Map());
    const panningRef = useRef<{ active: boolean; lastX?: number; lastY?: number; lastCentroid?: { x: number; y: number } }>({ active: false });


    // Internal helper to save current state to undo stack
    const saveSnapshot = useCallback(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Limit stack size to 20
        if (undoStack.current.length > 20) undoStack.current.shift();

        undoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        // Clear redo stack on new action
        redoStack.current = [];

        setCanUndo(true);
        setCanRedo(false);
    }, []);

    const performUndo = useCallback(() => {
        if (undoStack.current.length === 0 || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Save current to redo
        redoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));

        const previousState = undoStack.current.pop();
        if (previousState) {
            ctx.putImageData(previousState, 0, 0);
            saveCanvas(); // Save but don't snapshot
        }

        setCanUndo(undoStack.current.length > 0);
        setCanRedo(true);
    }, []);

    const performRedo = useCallback(() => {
        if (redoStack.current.length === 0 || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Save current to undo
        undoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));

        const nextState = redoStack.current.pop();
        if (nextState) {
            ctx.putImageData(nextState, 0, 0);
            saveCanvas();
        }

        setCanUndo(true);
        setCanRedo(redoStack.current.length > 0);
    }, []);

    // Load Canvas
    useEffect(() => {
        // Determine incoming URL (supports legacy string or object shape)
        const incomingUrl = typeof savedCanvasData === 'string' ? savedCanvasData : (savedCanvasData && savedCanvasData.url ? savedCanvasData.url : null);
        // Only load if different from what we last synced (avoid overwritting local edits)
        if (incomingUrl && (incomingUrl !== lastSyncedUrlRef.current || !lastSyncedUrlRef.current)) {
            // Check existence of local undo stack to prevent overwriting WIP
            if (undoStack.current.length > 0 && incomingUrl === lastSyncedUrlRef.current) return;

            const loadCanvasImage = async () => {
                try {
                    // savedCanvasData may be a string (legacy) or an object { id, url, data }
                    let fileUrl: string | null = null;
                    let backupDataUrl: string | undefined;
                    if (typeof savedCanvasData === 'string') {
                        fileUrl = savedCanvasData;
                    } else if (savedCanvasData && typeof savedCanvasData === 'object') {
                        fileUrl = savedCanvasData.url || null;
                        backupDataUrl = savedCanvasData.data;
                    }

                    // If we have inline data backup, use it first (this avoids auth/fetch issues)
                    if (backupDataUrl) {
                        try {
                            const img = new Image();
                            img.onload = () => {
                                const ctx = canvasRef.current?.getContext('2d');
                                if (ctx && canvasRef.current) {
                                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                    ctx.drawImage(img, 0, 0);
                                    lastSyncedUrlRef.current = fileUrl; // mark origin URL if present
                                    if (undoStack.current.length === 0) saveSnapshot();
                                }
                            };
                            img.src = backupDataUrl;
                            return; // done
                        } catch (e) {
                            console.warn('Failed to load inline data backup', e);
                        }
                    }

                    if (!fileUrl) {
                        // Nothing to load
                        return;
                    }

                    // Prefer server-side proxied download (avoids CORS); fall back to direct fetch if proxy isn't available
                    try {
                        const attachId = savedCanvasData && typeof savedCanvasData === 'object' ? savedCanvasData.id : null;
                        if (attachId && client && (client as any).downloadAttachmentBlob) {
                            const blob = await (client as any).downloadAttachmentBlob(String(attachId));
                            if (blob instanceof Blob) {
                                const objectUrl = URL.createObjectURL(blob);
                                const img = new Image();
                                img.onload = () => {
                                    const ctx = canvasRef.current?.getContext('2d');
                                    if (ctx && canvasRef.current) {
                                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                        ctx.drawImage(img, 0, 0);
                                        lastSyncedUrlRef.current = savedCanvasData?.url || null;
                                        URL.revokeObjectURL(objectUrl);
                                        console.log("Canvas loaded successfully via proxied download.");
                                        if (undoStack.current.length === 0) saveSnapshot();
                                    }
                                };
                                img.src = objectUrl;
                                return;
                            }
                        }
                    } catch (e) {
                        console.warn('Proxied download also failed for canvas background:', e);
                    }

                    // Fallback: try direct fetch (may fail due to CORS)
                    try {
                        console.log("Fetching canvas blob from:", fileUrl);
                        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
                        const response = await fetch(fileUrl, { headers });
                        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        console.log("Blob fetch success, objectUrl:", objectUrl);

                        const img = new Image();
                        img.onload = () => {
                            const ctx = canvasRef.current?.getContext('2d');
                            if (ctx && canvasRef.current) {
                                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                ctx.drawImage(img, 0, 0);
                                lastSyncedUrlRef.current = fileUrl;
                                URL.revokeObjectURL(objectUrl);
                                console.log("Canvas loaded successfully.");
                                // Initialize undo stack with this state if empty
                                if (undoStack.current.length === 0) {
                                    saveSnapshot();
                                }
                            }
                        };
                        img.src = objectUrl;


                    } catch (e) {
                        console.warn("Direct fetch failed for canvas background:", e);

                        // Attempt to fetch via server-side proxy (attachment download) using attachment id
                        try {
                            const attachId = savedCanvasData && typeof savedCanvasData === 'object' ? savedCanvasData.id : null;
                            if (attachId && client && (client as any).downloadAttachmentBlob) {
                                const blob = await (client as any).downloadAttachmentBlob(String(attachId));
                                if (blob instanceof Blob) {
                                    const objectUrl = URL.createObjectURL(blob);
                                    const img = new Image();
                                    img.onload = () => {
                                        const ctx = canvasRef.current?.getContext('2d');
                                        if (ctx && canvasRef.current) {
                                            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                            ctx.drawImage(img, 0, 0);
                                            lastSyncedUrlRef.current = savedCanvasData?.url || null;
                                            URL.revokeObjectURL(objectUrl);
                                            console.log("Canvas loaded successfully via proxied download.");
                                            if (undoStack.current.length === 0) saveSnapshot();
                                        }
                                    };
                                    img.src = objectUrl;
                                    return;
                                }
                            }
                        } catch (e2) {
                            console.error('Proxied download also failed for canvas background:', e2);
                        }

                        console.error("Failed to load canvas background:", e);
                    }
                } catch (err) {
                    console.error("Critical error in loadCanvasImage:", err);
                }
            };
            loadCanvasImage();
        }
    }, [savedCanvasData, saveSnapshot]);

    // Load persisted floating selection (if any)
    useEffect(() => {
        if (savedFloatingSelection) {
            try {
                const parsed = JSON.parse(savedFloatingSelection);
                if (parsed && parsed.image) {
                    _setFloatingSelection(parsed);
                    return;
                }
            } catch (e) {
                console.error('Failed to parse saved floating selection:', e);
            }
        }
        // Fallback to local persisted floating selection if available
        try {
            const local = localStorage.getItem('dashboard_floating_local');
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed && parsed.image) _setFloatingSelection(parsed);
            }
        } catch (e) { }
    }, [savedFloatingSelection]);

    // Persist floating selection when it changes (debounced)
    useEffect(() => {
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = (window.setTimeout(() => {
            try {
                if (floatingSelection) setSavedFloatingSelection(JSON.stringify(floatingSelection));
                else setSavedFloatingSelection(null);
            } catch (e) {
                console.error('Failed to persist floating selection:', e);
            }
        }, 200) as unknown) as number;
        return () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); };
    }, [floatingSelection, setSavedFloatingSelection]);

    const saveCanvas = useCallback(async () => {
        if (!canvasRef.current) return;

        return new Promise<void>((resolve, reject) => {
            canvasRef.current?.toBlob(async (blob) => {
                if (!blob) {
                    console.error("Canvas toBlob failed (empty or tainted?)");
                    reject(new Error("Canvas export failed"));
                    return;
                }
                // Also store a local fallback dataURL
                try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        try { localStorage.setItem('dashboard_canvas_local', reader.result as string); } catch (e) { }
                    };
                    reader.readAsDataURL(blob);
                } catch (e) { /* ignore local fallback errors */ }

                const file = new File([blob], "canvas_state.png", { type: "image/png" });
                try {
                    const res = await client.upload(file);

                    // Handle variable response structures
                    const uploadedUrl = res?.data?.url || res?.url;

                    if (uploadedUrl) {
                        const url = uploadedUrl;
                        const id = res?.data?.id || res?.id;

                        // Create helper to convert Blob -> dataURL
                        const blobToDataURL = async (b: Blob): Promise<string | undefined> => {
                            return await new Promise((resolve) => {
                                try {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result as string);
                                    reader.onerror = () => resolve(undefined);
                                    reader.readAsDataURL(b);
                                } catch (e) { resolve(undefined); }
                            });
                        };

                        // Prefer server-side proxied download (avoids CORS); fall back to direct fetch if proxy isn't available
                        // Use the local blob directly to create the backup dataURL
                        // This avoids the 500/403 errors when trying to fetch back the image we just uploaded
                        const dataUrl = await blobToDataURL(blob);

                        const payload: any = { id, url };
                        if (dataUrl && dataUrl.length < 1_000_000) payload.data = dataUrl; // include small backup

                        lastSyncedUrlRef.current = url;
                        setSavedCanvasData(payload);

                        // Force a flush so the setting persists immediately and is visible to other devices
                        try {
                            await (flushSavedCanvas?.(payload) ?? Promise.resolve());
                            resolve();
                        } catch (e) {
                            console.error('Failed to flush saved canvas setting', e);
                            reject(e);
                        }

                        canvasDirtyRef.current = false;
                    } else {
                        console.error("Upload succeeded but no URL found in response:", res);
                        reject(new Error("Upload succeeded but provided no URL"));
                    }
                } catch (e) {
                    console.error("Canvas sync failed", e);
                    toast.error("Failed to sync canvas");
                    reject(e);
                }
            });
        });
    }, [client, setSavedCanvasData, token, flushSavedCanvas]);



    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                performUndo();
            }
            // Support both Ctrl+V and Ctrl+Y for redo (user requested Ctrl+V as redo)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'y')) {
                e.preventDefault();
                performRedo();
            }

            // Space: temporary pan while held (press-and-hold to pan)
            if (e.code === 'Space') {
                if (!e.repeat) {
                    // remember previous mode and switch to pan
                    lastCursorModeRef.current = cursorMode;
                    setCursorMode('pan');
                }
            }

            // E key: if double-pressed, toggle back to last drawing tool before eraser
            if (e.key.toLowerCase() === 'e') {
                // simple single/double press detection
                const now = Date.now();
                if ((window as any).__lastEPress && now - (window as any).__lastEPress < 400) {
                    // double press
                    if (drawingTool === 'eraser' && lastDrawingToolRef.current) {
                        setDrawingTool(lastDrawingToolRef.current);
                        lastDrawingToolRef.current = null;
                    }
                } else {
                    // single press: toggle eraser
                    if (drawingTool === 'eraser') {
                        // restore last
                        if (lastDrawingToolRef.current) setDrawingTool(lastDrawingToolRef.current);
                        else setDrawingTool('none');
                        lastDrawingToolRef.current = null;
                    } else {
                        lastDrawingToolRef.current = drawingTool;
                        setDrawingTool('eraser');
                    }
                }
                (window as any).__lastEPress = now;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                // revert to previous cursor mode when space released
                if (lastCursorModeRef.current) {
                    setCursorMode(lastCursorModeRef.current);
                    lastCursorModeRef.current = null;
                } else {
                    setCursorMode('select');
                }
            }
        };
        window.addEventListener('keyup', handleKeyUp);

        // Save local fallback when user leaves the page to avoid losing progress
        const handleBeforeUnload = () => {
            try {
                if (!canvasRef.current) return;
                const dataUrl = canvasRef.current.toDataURL('image/png');
                localStorage.setItem('dashboard_canvas_local', dataUrl);
                // also persist floating selection
                if (floatingSelection) {
                    localStorage.setItem('dashboard_floating_local', JSON.stringify(floatingSelection));
                } else {
                    localStorage.removeItem('dashboard_floating_local');
                }
            } catch (e) { /* ignore */ }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [performUndo, performRedo, floatingSelection]);


    // Fetch Widget Data Removed


    // --- Widget Operations ---

    const handleAddWidget = (collectionName: string, viewType: ViewType) => {
        const col = collections.find(c => c.name === collectionName);
        const newWidget: WidgetDefinition = {
            id: Math.random().toString(36).substring(7),
            type: 'view',
            title: col?.title || collectionName,
            collectionName,
            viewType,
            x: 0,
            y: 0,
            w: 600,
            h: 400,
            zIndex: 10
        };
        setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
    };

    const handleAddDocumentWidget = (docId: string, title: string) => {
        const newWidget: WidgetDefinition = {
            id: Math.random().toString(36).substring(7),
            type: 'document',
            title: title,
            collectionName: docId, // overload collectionName for docId
            viewType: 'table', // dummy
            x: 0,
            y: 0,
            w: 300,
            h: 150,
            zIndex: 10
        };
        setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
    };



    // ... (Drawing State omitted, matching existing code structure) 
    // Wait, I shouldn't replace lines I don't see.
    // I will target the exact block around line 50-60 and add `members` and update `wizardTab`.

    // Actually, to make it safe, I'll just Replace the single line 55 and Add `members` line 46.
    // But I can't do non-contiguous edits in one replace_file_content unless contiguous.
    // I'll use multi_replace for this.

    // Oh wait, I am in replace_file_content tool block. I should use multi_replace?
    // Use multi_replace for safer edits.

    // I will cancel this tool call and use multi_replace.
    // Wait, I can't cancel. I must output something.
    // I will output the handler function only, inserting it before `handleRemoveWidget`.

    const handleAddContactWidget = (memberId: string) => {
        const member = members.find(m => m.id === memberId);
        const newWidget: WidgetDefinition = {
            id: Math.random().toString(36).substring(7),
            type: 'contact',
            title: member?.name || 'Unknown Contact',
            collectionName: memberId, // storing memberId in collectionName
            viewType: 'table', // dummy
            x: 0,
            y: 0,
            w: 300,
            h: 350,
            zIndex: 10
        };
        setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets((prev: WidgetDefinition[]) => prev.filter(w => w.id !== id));
    };
    }
    }}
  />
  ))}
  </>
   )}
   </div>
   )
 }

 // render Document Widget
 if (widget.type === 'document') {
   return (
   <div
   key={widget.id}
   data-id={widget.id}
   className={`dashboard-widget absolute flex flex-col Select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`}
   style={{
  left: widget.x,
  top: widget.y,
  width: widget.w,
  height: widget.h,
  zIndex: widget.zIndex,
   }}
   onMouseDown={() => bringToFront(widget.id)}
   >
   <Card className="w-full h-full flex flex-col shadow-lg border-2 border-border/50 group overflow-hidden rounded-xl isolate">
  <CardHeader
  className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/20 handle cursor-move rounded-t-[inherit]"
  onMouseDown={(e) => {
  if (!isEditMode) return;
  e.preventDefault();
  setDragState({
    id: widget.id,
    startX: e.clientX, startY: e.clientY,
    initialX: widget.x, initialY: widget.y,
    initialW: widget.w, initialH: widget.h,
    mode: 'move'
  });
  }}
  >
  <div className="flex items-center gap-2">
  <FileText className="h-4 w-4 text-[var(--primary)]" />
  <CardTitle className="text-sm font-bold flex items-center gap-2 truncate">
    {widget.title}
  </CardTitle>
  </div>
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveWidget(widget.id)} title="Remove Widget">
    <X className="h-3 w-3" />
  </Button>
  </div>
  </CardHeader>
  <CardContent className="flex-1 flex items-center justify-center bg-background p-4 flex-col text-center gap-2 rounded-b-[inherit]">
  <Button
  variant="secondary"
  className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
  onClick={() => navigate(`/canvas/${widget.collectionName}`)}
  >
  <ExternalLink className="h-6 w-6 mb-1 opacity-50" />
  <span className="text-xs">Open Canvas</span>
  </Button>
  </CardContent>
   </Card>

   {isEditMode && (
  <div
  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
  onMouseDown={(e) => {
  e.stopPropagation(); e.preventDefault();
  setDragState({
    id: widget.id,
    startX: e.clientX, startY: e.clientY,
    initialX: widget.x, initialY: widget.y,
    initialW: widget.w, initialH: widget.h,
    mode: 'resize'
  });
  }}
  >
  <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
  </div>
   )}

   {/* resize Handles (Only if selected) */}
   {selectedWidgetId === widget.id && drawingTool === 'none' && (
  <>
  {/* border Highlighting */}
  <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />
  {/* handles */}
  {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
  <div
    key={h}
    className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
    style={{
    cursor: `${h}-resize`,
    top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
    left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
    }}
    onPointerDown={(e) => {
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const wrapper = canvasRef.current?.parentElement;
    if (wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    resizeStateRef.current = {
   active: true,
   handle: h as any,
   startMouse: { x, y },
   startWidget: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    };
    }
    }}
  />
  ))}
  </>
   )}
   </div>
   );
 }

 const col = collections.find(c => c.name === widget.collectionName);
 if (!col) return null;

 return (
   <div
   key={widget.id}
   data-id={widget.id}
   className={`dashboard-widget absolute flex flex-col Select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`} // removed border/bg since Widget has it
   style={{
   left: widget.x,
   top: widget.y,
   width: widget.w,
   height: widget.h,
   zIndex: widget.zIndex,
   }}
   onMouseDown={() => bringToFront(widget.id)}
   >
   <DatabaseWidget
   collection={col}
   initialView={widget.viewType}
   className="w-full h-full"
   onRemove={() => handleRemoveWidget(widget.id)}
   viewConfig={widget.viewConfig}
   onConfigChange={(newConfig) => {
  setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, viewConfig: newConfig } : w));
   }}
   onHeaderMouseDown={(e) => {
  if (!isEditMode) return;
  e.preventDefault();
  setDragState({
  id: widget.id,
  startX: e.clientX, startY: e.clientY,
  initialX: widget.x, initialY: widget.y,
  initialW: widget.w, initialH: widget.h,
  mode: 'move'
  });
   }}
   />

   {isEditMode && (
   <div
  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
  onMouseDown={(e) => {
  e.stopPropagation(); e.preventDefault();
  setDragState({
  id: widget.id,
  startX: e.clientX, startY: e.clientY,
  initialX: widget.x, initialY: widget.y,
  initialW: widget.w, initialH: widget.h,
  mode: 'resize'
  });
  }}
   >
  <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
   </div>
   )}

   {/* resize Handles (Only if selected) */}
   {selectedWidgetId === widget.id && drawingTool === 'none' && (
   <>
  {/* border Highlighting */}
  <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />

  {/* handles */}
  {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
  <div
  key={h}
  className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
  style={{
    cursor: `${h}-resize`,
    top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
    left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
  }}
  onPointerDown={(e) => {
    e.stopPropagation(); // stop drag/Select
    e.currentTarget.setPointerCapture(e.pointerId);

    // calc start pos relative to container
    const wrapper = canvasRef.current?.parentElement;
    if (wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    resizeStateRef.current = {
    active: true,
    handle: h as any,
    startMouse: { x, y },
    startWidget: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    };
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative no-scrollbar">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-primary bg-background z-[70] shadow-sm h-16 relative">
                <div className="flex items-center gap-2">
                    {/* Grid Icon Removed */}
                    {isOver && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">drop to add</span>}
                </div>

                <div className="flex items-center gap-2 relative">

                    {/* Drawing Tools */}
                    <div className="flex items-center bg-muted/20 rounded-lg p-1 mr-2 border">
                        <div className="relative">
                            <Button
                                variant={drawingTool === 'pencil' ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setDrawingTool(drawingTool === 'pencil' ? 'none' : 'pencil')}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setColorPickerOpen(!colorPickerOpen);
                                }}
                                title="pencil (right-click for options)"
                                className={drawingTool === 'pencil' ? "bg-accent" : ""}
                            >
                                <Pencil className="h-4 w-4" style={{ color: drawingTool === 'pencil' ? brushColor : 'var(--primary)' }} />
                            </Button>
                            {colorPickerOpen && (
                                <div className="absolute top-12 left-0 z-50 p-3 bg-popover border rounded-xl shadow-xl w-64 space-y-3">
                                    <div className="fixed inset-0 z-40" onClick={() => setColorPickerOpen(false)} />
                                    <div className="relative z-50 space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                                <span>brush size</span>
                                                <span>{brushSize}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="50"
                                                value={brushSize}
                                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <HexColorPicker color={brushColor} onChange={setBrushColor} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <Button
                                variant={drawingTool === 'eraser' ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setDrawingTool(drawingTool === 'eraser' ? 'none' : 'eraser')}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setEraserMenuOpen(!eraserMenuOpen);
                                }}
                                onTouchStart={() => {
                                    eraserTimerRef.current = setTimeout(() => setEraserMenuOpen(true), 600);
                                }}
                                onTouchEnd={() => {
                                    if (eraserTimerRef.current) clearTimeout(eraserTimerRef.current);
                                }}
                                className={drawingTool === 'eraser' ? "bg-accent" : ""}
                            >
                                <Eraser className="h-4 w-4 text-[var(--primary)]" />
                            </Button>
                            {eraserMenuOpen && (
                                <div className="absolute top-12 left-0 z-50 p-3 bg-popover border rounded-xl shadow-xl w-48">
                                    <div className="fixed inset-0 z-40" onClick={() => setEraserMenuOpen(false)} />
                                    <div className="relative z-50 space-y-1">
                                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                            <span>eraser size</span>
                                            <span>{eraserSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="5"
                                            max="100"
                                            value={eraserSize}
                                            onChange={(e) => setEraserSize(Number(e.target.value))}
                                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <Button
                                variant={drawingTool === 'lasso' ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => {
                                    if (floatingSelection) pasteSelection();
                                    setDrawingTool(drawingTool === 'lasso' ? 'none' : 'lasso');
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setLassoMenuOpen(!lassoMenuOpen);
                                }}
                                className={drawingTool === 'lasso' ? "bg-accent" : ""}
                                title="lasso (right-click for options)"
                            >
                                {selectionMode === 'rect' ? (
                                    <div className="h-4 w-4 border-2 border-current rounded-sm" />
                                ) : selectionMode === 'magic' ? (
                                    <Wand2 className="h-4 w-4 text-[var(--primary)]" />
                                ) : (
                                    <div className="h-4 w-4 relative">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 16.5l5.5-12.5l6 7l-5.5 12.5z" strokeDasharray="4" /></svg>
                                    </div>
                                )}
                            </Button>
                            {lassoMenuOpen && (
                                <div className="absolute top-12 left-0 z-50 p-3 bg-popover border rounded-xl shadow-xl w-48 space-y-2">
                                    <div className="fixed inset-0 z-40" onClick={() => setLassoMenuOpen(false)} />
                                    <div className="relative z-50 flex flex-col gap-1">
                                        <div className="text-xs font-medium text-muted-foreground mb-1 px-2">selection mode</div>
                                        <button
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectionMode === 'free' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                                            onClick={() => { setSelectionMode('free'); setDrawingTool('lasso'); setLassoMenuOpen(false); }}
                                        >
                                            <div className="h-4 w-4 relative"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 16.5l5.5-12.5l6 7l-5.5 12.5z" strokeDasharray="4" /></svg></div>
                                            freehand
                                        </button>
                                        <button
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectionMode === 'rect' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                                            onClick={() => { setSelectionMode('rect'); setDrawingTool('lasso'); setLassoMenuOpen(false); }}
                                        >
                                            <div className="h-4 w-4 border-2 border-current rounded-sm" />
                                            rectangle
                                        </button>
                                        <button
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectionMode === 'magic' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                                            onClick={() => { setSelectionMode('magic'); setDrawingTool('lasso'); setLassoMenuOpen(false); }}
                                        >
                                            <Wand2 className="h-4 w-4" />
                                            magic lasso
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button
                            variant={drawingTool === 'none' ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => {
                                if (floatingSelection) pasteSelection();
                                setDrawingTool('none');
                            }}
                            title="cursor (move widgets)"
                            className={drawingTool === 'none' ? "bg-accent" : ""}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                // Toggle persistent cursor mode between select and pan
                                setCursorMode(prev => prev === 'select' ? 'pan' : 'select');
                            }}
                        >
                            {cursorMode === 'pan' ? <Hand className="h-4 w-4 text-[var(--primary)]" /> : <MousePointer2 className="h-4 w-4 text-[var(--primary)]" />}
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-border mx-2" />

                    <Button
                        variant={isEditMode ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsEditMode(!isEditMode)}
                        title={isEditMode ? "lock layout" : "unlock layout"}
                    >
                        {isEditMode ? <Unlock className="h-4 w-4 text-[var(--primary)]" /> : <Lock className="h-4 w-4 text-[var(--primary)]" />}
                    </Button>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAddMenuOpen(!addMenuOpen);
                            setWizardStep('collection');
                            setWizardSearch('');
                        }}
                        variant={addMenuOpen ? "secondary" : "default"}
                        size="icon"
                        title="add view"
                    >
                        <Plus className="h-4 w-4 text-[var(--primary)]" />
                    </Button>

                    {addMenuOpen && (
                        <div
                            className="absolute top-full right-0 mt-2 w-72 bg-popover border rounded-xl shadow-2xl z-[80] overflow-hidden flex flex-col"
                            style={{ maxHeight: '400px' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Tabs for Databases / Documents */}
                            <div className="flex border-b">
                                <button
                                    className={`flex-1 py-2 text-xs font-semibold ${wizardTab === 'databases' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
                                    onClick={() => setWizardTab('databases')}
                                >
                                    databases
                                </button>
                                <button
                                    className={`flex-1 py-2 text-xs font-semibold ${wizardTab === 'documents' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
                                    onClick={() => setWizardTab('documents')}
                                >
                                    documents
                                </button>
                                <button
                                    className={`flex-1 py-2 text-xs font-semibold ${wizardTab === 'contacts' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
                                    onClick={() => setWizardTab('contacts')}
                                >
                                    contacts
                                </button>
                            </div>

                            {/* Wizard Header */}
                            {wizardTab === 'databases' && (
                                <div className="p-3 border-b bg-muted/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        {wizardStep === 'view' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 -ml-1"
                                                onClick={() => { setWizardStep('collection'); setWizardSearch(''); }}
                                            >
                                                <div className="rotate-180">➤</div>
                                            </Button>
                                        )}
                                        <span className="text-sm font-semibold">
                                            {wizardStep === 'collection' ? 'select database' : 'select view type'}
                                        </span>
                                    </div>
                                    <Input
                                        placeholder={wizardStep === 'collection' ? "search collections..." : "search view types..."}
                                        value={wizardSearch}
                                        onChange={e => setWizardSearch(e.target.value)}
                                        className="h-8 text-xs bg-background"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Documents Header */}
                            {(wizardTab === 'documents' || wizardTab === 'contacts') && (
                                <div className="p-3 border-b bg-muted/30">
                                    <Input
                                        placeholder={`Search ${wizardTab}...`}
                                        value={wizardSearch}
                                        onChange={e => setWizardSearch(e.target.value)}
                                        className="h-8 text-xs bg-background"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Wizard Body */}
                            <div className="overflow-y-auto flex-1 p-1">
                                {wizardTab === 'databases' && wizardStep === 'collection' && (
                                    <div className="space-y-1">
                                        {collections
                                            .filter(c => (c.title || c.name).toLowerCase().includes(wizardSearch.toLowerCase()))
                                            .map(col => (
                                                <button
                                                    key={col.name}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors"
                                                    onClick={() => {
                                                        setSelectedCollectionForWizard(col.name);
                                                        setWizardStep('view');
                                                        setWizardSearch('');
                                                    }}
                                                >
                                                    <Database className="mr-2 h-4 w-4 opacity-50" />
                                                    <div className="flex-1 truncate">
                                                        {col.title || col.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">➤</div>
                                                </button>
                                            ))}
                                        {collections.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">no collections found</div>}
                                    </div>
                                )}

                                {wizardTab === 'databases' && wizardStep === 'view' && (
                                    <div className="grid grid-cols-1 gap-1">
                                        {VIEW_OPTIONS
                                            .filter(v => v.label.toLowerCase().includes(wizardSearch.toLowerCase()))
                                            .map(view => (
                                                <button
                                                    key={view.id}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors group"
                                                    onClick={() => {
                                                        if (selectedCollectionForWizard) {
                                                            handleAddWidget(selectedCollectionForWizard, view.id);
                                                            setAddMenuOpen(false);
                                                        }
                                                    }}
                                                >
                                                    <span className="w-8 h-8 rounded bg-muted flex items-center justify-center mr-3 group-hover:bg-background transition-colors">
                                                        {view.icon ? <view.icon className="h-4 w-4" /> : <div className="h-4 w-4" />}
                                                    </span>
                                                    <div>
                                                        <div className="font-medium">{view.label}</div>
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                )}

                                {wizardTab === 'documents' && (
                                    <div className="space-y-1">
                                        {localDocs
                                            .filter(d => d.title.toLowerCase().includes(wizardSearch.toLowerCase()))
                                            .map(doc => (
                                                <button
                                                    key={doc.id}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors"
                                                    onClick={() => {
                                                        handleAddDocumentWidget(doc.id, doc.title);
                                                        setAddMenuOpen(false);
                                                    }}
                                                >
                                                    <FileText className="mr-2 h-4 w-4 text-[var(--primary)]" />
                                                    <div className="flex-1 truncate">
                                                        {doc.title}
                                                    </div>
                                                    <Plus className="h-3 w-3 opacity-50" />
                                                </button>
                                            ))}
                                        {localDocs.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">no documents found</div>}
                                    </div>
                                )}

                                {wizardTab === 'contacts' && (
                                    <div className="space-y-1">
                                        {members
                                            .filter(m => m.name.toLowerCase().includes(wizardSearch.toLowerCase()))
                                            .map(member => (
                                                <button
                                                    key={member.id}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors"
                                                    onClick={() => {
                                                        handleAddContactWidget(member.id);
                                                        setAddMenuOpen(false);
                                                    }}
                                                >
                                                    <User className="mr-2 h-4 w-4 text-primary" />
                                                    <div className="flex-1 truncate">
                                                        {member.name}
                                                    </div>
                                                    <Plus className="h-3 w-3 opacity-50" />
                                                </button>
                                            ))}
                                        {members.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">no contacts found</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="hidden md:flex items-center gap-2 mr-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={performUndo}
                            disabled={!canUndo}
                            title="Undo (Ctrl+Z)"
                        >
                            <span className="sr-only">undo</span>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--primary)]"><path d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={performRedo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+V / Ctrl+Y)"
                        >
                            <span className="sr-only">redo</span>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--primary)]"><path d="M10.1464 2.14645C10.3417 1.95118 10.6583 1.95118 10.8536 2.14645L12.8536 4.14645C13.0488 4.34171 13.0488 4.65829 12.8536 4.85355L10.8536 6.85355C10.6583 7.04882 10.3417 7.04882 10.1464 6.85355C9.95118 6.65829 9.95118 6.34171 10.1464 6.14645L11.2929 5H6C4.067 5 2.5 6.567 2.5 8.5C2.5 10.433 4.067 12 6 12H10C10.2761 12 10.5 12.2239 10.5 12.5C10.5 12.7761 10.2761 13 10 13H6C3.51472 13 1.5 10.9853 1.5 8.5C1.5 6.01472 3.51472 4 6 4H11.2929L10.1464 2.85355C9.95118 2.65829 9.95118 2.34171 10.1464 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                        </Button>
                    </div>


                </div>
            </div>

            {/* Mobile Undo/Redo Controls (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-[9999] md:hidden flex items-center gap-2">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={performUndo}
                    disabled={!canUndo}
                    className="shadow-md border border-border"
                >
                    <span className="sr-only">undo</span>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={performRedo}
                    disabled={!canRedo}
                    className="shadow-md border border-border"
                >
                    <span className="sr-only">redo</span>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M10.1464 2.14645C10.3417 1.95118 10.6583 1.95118 10.8536 2.14645L12.8536 4.14645C13.0488 4.34171 13.0488 4.65829 12.8536 4.85355L10.8536 6.85355C10.6583 7.04882 10.3417 7.04882 10.1464 6.85355C9.95118 6.65829 9.95118 6.34171 10.1464 6.14645L11.2929 5H6C4.067 5 2.5 6.567 2.5 8.5C2.5 10.433 4.067 12 6 12H10C10.2761 12 10.5 12.2239 10.5 12.5C10.5 12.7761 10.2761 13 10 13H6C3.51472 13 1.5 10.9853 1.5 8.5C1.5 6.01472 3.51472 4 6 4H11.2929L10.1464 2.85355C9.95118 2.65829 9.95118 2.34171 10.1464 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </Button>
            </div>

            {/* Canvas Area */}
            <div
                ref={(node) => {
                    containerRef.current = node;
                    setNodeRef(node);
                }}
                className={`flex-1 relative bg-[#060606] overflow-auto no-scrollbar ${drawingTool === 'none' ? (cursorMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default') : (drawingTool === 'eraser' ? 'cursor-none' : 'cursor-crosshair')} ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
                onClick={() => setAddMenuOpen(false)}
                onPointerDown={(e) => {
                    // Track pointer for multi-touch panning
                    try {
                        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: (e as any).pointerType || 'mouse' });
                    } catch (err) { }

                    const pointerCount = pointersRef.current.size;

                    // If two-finger touch or mouse drag (left button) and not drawing, start panning
                    const target = e.target as HTMLElement;
                    const interactiveHit = !!target.closest('button, input, textarea, a, .interactive-el');

                    if (drawingTool === 'none' && !interactiveHit) {
                        const handleEl = target.closest('.resize-handle');
                        if (handleEl) return; // let resize handlers own the event

                        const widgetEl = target.closest('.dashboard-widget');
                        if (widgetEl && widgets) {
                            const widgetId = widgetEl.getAttribute('data-id');
                            if (widgetId) setSelectedWidgetId(widgetId);
                        } else {
                            setSelectedWidgetId(null);
                        }

                        // Mouse: left-button drag to pan
                        if ((e as any).pointerType === 'mouse' && (e as any).button === 0) {
                            panningRef.current.active = true;
                            panningRef.current.lastX = e.clientX;
                            panningRef.current.lastY = e.clientY;
                            try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { }
                            e.preventDefault();
                            return;
                        }

                        // Touch: start panning when two pointers present
                        if (pointerCount >= 2 && (Array.from(pointersRef.current.values()).some(p => p.type === 'touch'))) {
                            // compute centroid
                            const pts = Array.from(pointersRef.current.values());
                            const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                            const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                            panningRef.current.active = true;
                            panningRef.current.lastCentroid = { x: cx, y: cy };
                            e.preventDefault();
                            return;
                        }
                    } else if (drawingTool !== 'none') {
                        // If drawing, deselect and start drawing if appropriate
                        setSelectedWidgetId(null);
                        const widgetEl = target.closest('.dashboard-widget');
                        const wrapper = canvasRef.current?.parentElement;
                        if (wrapper) {
                            const rect = wrapper.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            startDrawing(x, y, (e as any).pressure);
                            e.preventDefault();
                            try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { }
                        }
                    }
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    if (drawingTool === 'pencil') {
                        // Open color/size picker near cursor or toggle menu
                        // Ideally we'd have a localized context menu, for now let's toggle the toolbar one 
                        // or usage the global context menu position if we had one for tools.
                        // The user request: "allows you to change its size (or brush color)".
                        setColorPickerOpen(true);
                    } else if (drawingTool === 'eraser') {
                        setEraserMenuOpen(true);
                    } else if (drawingTool === 'none') {
                        // Select/Distort logic
                        const widgetEl = (e.target as HTMLElement).closest('.dashboard-widget');
                        if (widgetEl) {
                            // Logic to select widget and show context menu
                            // For now we just allow default or custom logic later
                            // We need to identify WHICH widget.
                            // We probably need to store 'selectedWidgetId' state.
                        }
                    }
                }}
                onPointerMove={(e) => {
                    // We need to track this on the container because the mouse might move fast

                    const wrapper = canvasRef.current?.parentElement;
                    if (!wrapper) return;
                    const rect = wrapper.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    // ALWAYS update mousePos for cursor visualization (Eraser)
                    setMousePos({ x, y });

                    // Handle Resize (8-direction)
                    if (resizeStateRef.current.active && selectedWidgetId) {
                        const { handle, startMouse, startWidget } = resizeStateRef.current;
                        // Avoid sub-pixel rendering jitter if needed, or simply round? keeping transparent for now.
                        const deltaX = x - startMouse.x;
                        const deltaY = y - startMouse.y;

                        setWidgets(prev => prev.map(w => {
                            if (w.id !== selectedWidgetId) return w;

                            let newX = startWidget.x;
                            let newY = startWidget.y;
                            let newW = startWidget.w;
                            let newH = startWidget.h;

                            // Horizontal constraints
                            if (handle?.includes('e')) {
                                newW = Math.max(100, startWidget.w + deltaX);
                            }
                            if (handle?.includes('w')) {
                                const proposedW = startWidget.w - deltaX;
                                if (proposedW >= 100) {
                                    newW = proposedW;
                                    newX = startWidget.x + deltaX;
                                } else {
                                    newW = 100;
                                    newX = startWidget.x + (startWidget.w - 100);
                                }
                            }

                            // Vertical constraints
                            if (handle?.includes('s')) {
                                newH = Math.max(100, startWidget.h + deltaY);
                            }
                            if (handle?.includes('n')) {
                                const proposedH = startWidget.h - deltaY;
                                if (proposedH >= 100) {
                                    newH = proposedH;
                                    newY = startWidget.y + deltaY;
                                } else {
                                    newH = 100;
                                    newY = startWidget.y + (startWidget.h - 100);
                                }
                            }

                            return { ...w, x: newX, y: newY, w: newW, h: newH };
                        }));
                        return;
                    }

                    if (!isDrawingRef.current) return;


                    // Direct context access to draw line
                    const ctx = canvasRef.current!.getContext('2d')!;

                    if (drawingTool === 'pencil' || drawingTool === 'eraser') {
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        canvasDirtyRef.current = true;
                        // Debounce save... (omitted implementation for brevity, reusing dirty flag)
                        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                        saveTimerRef.current = (setTimeout(() => {
                            if (canvasDirtyRef.current) saveCanvas();
                        }, 1000) as unknown) as number;
                    } else if (drawingTool === 'lasso') {
                        if (selectionMode === 'rect') {
                            setLassoPoints(prev => [prev[0], { x, y }]);
                        } else {
                            setLassoPoints(prev => [...prev, { x, y }]);
                        }
                    }
                }}
                onPointerUp={(e) => {
                    // Remove tracked pointer
                    try { pointersRef.current.delete(e.pointerId); } catch (err) { }

                    // End panning when appropriate
                    if (panningRef.current.active) {
                        const remaining = pointersRef.current.size;
                        if (remaining < 2 || (e as any).pointerType === 'mouse') {
                            panningRef.current.active = false;
                            panningRef.current.lastCentroid = undefined;
                            try { (e.target as Element).releasePointerCapture(e.pointerId); } catch (err) { }
                        }
                    }

                    handleCanvasUp();
                    if (isDrawingRef.current) {
                        try { (e.target as Element).releasePointerCapture(e.pointerId); } catch (err) { }
                    }
                    // End Resize
                    if (resizeStateRef.current.active) {
                        resizeStateRef.current.active = false;
                        try { (e.target as Element).releasePointerCapture(e.pointerId); } catch (err) { }
                    }
                }}
            >

                <div className="min-w-[2000px] min-h-[2000px] relative">

                    {/* Painting Canvas */}
                    <canvas
                        ref={canvasRef}
                        width={2000}
                        height={2000}
                        className="absolute inset-0 z-[60]"
                        style={{
                            pointerEvents: 'none', // Critical: Let events fall through to widgets/buttons
                            // We toggle cursor via container or handled elsewhere, but keeping specific CSS here is okay if we want visual cues
                            // Actually, if pointerEvents is none, checking cursor style of this element is invalid.
                            // We should set cursor on the Container or Body.
                        }}
                    // onContextMenu removed as it's blocked by pointerEvents non. 
                    // Handled by global/container logic if needed.
                    />

                    {/* Eraser Cursor */}
                    {drawingTool === 'eraser' && (
                        <div
                            className="absolute z-[100] pointer-events-none rounded-full bg-white/10 shadow-[0_0_2px_rgba(0,0,0,0.5)]"
                            style={{
                                left: mousePos.x,
                                top: mousePos.y,
                                width: eraserSize,
                                height: eraserSize,
                                transform: 'translate(-50%, -50%)',
                                border: '1px solid var(--primary)'
                            }}
                        />
                    )}

                    {/* Lasso Feedback */}
                    {drawingTool === 'lasso' && lassoPoints.length > 0 && (
                        <svg className="absolute inset-0 z-[65] pointer-events-none" width={2000} height={2000}>
                            {selectionMode === 'rect' && lassoPoints.length > 1 ? (
                                <rect
                                    x={Math.min(lassoPoints[0].x, lassoPoints[1].x)}
                                    y={Math.min(lassoPoints[0].y, lassoPoints[1].y)}
                                    width={Math.abs(lassoPoints[1].x - lassoPoints[0].x)}
                                    height={Math.abs(lassoPoints[1].y - lassoPoints[0].y)}
                                    fill="hsla(var(--primary), 0.1)"
                                    stroke="hsl(var(--primary))"
                                    strokeDasharray="2 4"
                                    strokeLinecap="round"
                                />
                            ) : (
                                <polygon
                                    points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill={selectionMode === 'magic' ? "hsla(var(--primary), 0.05)" : "hsla(var(--primary), 0.1)"}
                                    stroke="hsl(var(--primary))"
                                    strokeDasharray="2 4"
                                    strokeLinecap="round"
                                />
                            )}
                        </svg>
                    )}

                    {/* Floating Selection */}
                    {floatingSelection && (
                        <div
                            className="absolute z-[70] border-2 border-dashed border-[var(--primary)] group cursor-move"
                            style={{ left: floatingSelection.x, top: floatingSelection.y, width: floatingSelection.w, height: floatingSelection.h }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const initialX = floatingSelection.x;
                                const initialY = floatingSelection.y;

                                const handleMove = (e: MouseEvent) => {
                                    setFloatingSelection((prev: any) => prev ? ({ ...prev, x: initialX + (e.clientX - startX), y: initialY + (e.clientY - startY) }) : null);
                                };
                                const handleUp = () => {
                                    window.removeEventListener('mousemove', handleMove);
                                    window.removeEventListener('mouseup', handleUp);
                                };
                                window.addEventListener('mousemove', handleMove);
                                window.addEventListener('mouseup', handleUp);
                            }}
                        >
                            <img src={floatingSelection.image} className="w-full h-full pointer-events-none" />

                            {/* Resize Handle */}
                            <div
                                className="absolute -bottom-2 -right-2 w-4 h-4 bg-[var(--primary)] cursor-nwse-resize"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    const initialW = floatingSelection.w;
                                    const initialH = floatingSelection.h;

                                    const handleResize = (e: MouseEvent) => {
                                        setFloatingSelection((prev: any) => prev ? ({ ...prev, w: Math.max(10, initialW + (e.clientX - startX)), h: Math.max(10, initialH + (e.clientY - startY)) }) : null);
                                    };
                                    const handleUp = () => { window.removeEventListener('mousemove', handleResize); window.removeEventListener('mouseup', handleUp); };
                                    window.addEventListener('mousemove', handleResize);
                                    window.addEventListener('mouseup', handleUp);
                                }}
                            />
                            {/* Side Warp Handle */}
                            <div
                                className="absolute top-1/2 -right-2 w-2 h-4 bg-[var(--primary)] cursor-ew-resize -translate-y-1/2"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const initialW = floatingSelection.w;
                                    const handleWarp = (e: MouseEvent) => {
                                        setFloatingSelection((prev: any) => prev ? ({ ...prev, w: Math.max(10, initialW + (e.clientX - startX)) }) : null);
                                    };
                                    const handleUp = () => { window.removeEventListener('mousemove', handleWarp); window.removeEventListener('mouseup', handleUp); };
                                    window.addEventListener('mousemove', handleWarp);
                                    window.addEventListener('mouseup', handleUp);
                                }}
                            />

                            <div className="absolute -top-8 left-0 flex gap-2">
                                <Button size="sm" onClick={pasteSelection} variant="secondary">
                                    <Check className="h-3 w-3 mr-1" /> Done
                                </Button>
                            </div>
                        </div>
                    )}

                    {widgets.map(widget => {
                        // Render Contact Widget
                        if (widget.type === 'contact') {
                            const member = members.find(m => m.id === widget.collectionName);
                            return (
                                <div
                                    key={widget.id}
                                    data-id={widget.id}
                                    className={`dashboard-widget absolute flex flex-col select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`}
                                    style={{
                                        left: widget.x,
                                        top: widget.y,
                                        width: widget.w,
                                        height: widget.h,
                                        zIndex: widget.zIndex,
                                    }}
                                    onMouseDown={() => bringToFront(widget.id)}
                                >
                                    <div className="w-full h-full relative group">
                                        {member ? (
                                            <HeadmateCard member={member} className="w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground border rounded-xl">Contact Not Found</div>
                                        )}

                                        {/* Remove Button */}
                                        {isEditMode && (
                                            <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="secondary" size="icon" className="h-6 w-6 shadow-md" onClick={() => handleRemoveWidget(widget.id)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Move Handle (Top Zone) */}
                                        {isEditMode && (
                                            <div
                                                className="absolute inset-x-0 top-0 h-12 cursor-move z-40"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setDragState({
                                                        id: widget.id,
                                                        startX: e.clientX, startY: e.clientY,
                                                        initialX: widget.x, initialY: widget.y,
                                                        initialW: widget.w, initialH: widget.h,
                                                        mode: 'move'
                                                    });
                                                }}
                                            />
                                        )}

                                        {/* Resize Handle */}
                                        {isEditMode && (
                                            <div
                                                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation(); e.preventDefault();
                                                    setDragState({
                                                        id: widget.id,
                                                        startX: e.clientX, startY: e.clientY,
                                                        initialX: widget.x, initialY: widget.y,
                                                        initialW: widget.w, initialH: widget.h,
                                                        mode: 'resize'
                                                    });
                                                }}
                                            >
                                                <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Selection Handles */}
                                    {selectedWidgetId === widget.id && drawingTool === 'none' && (
                                        <>
                                            <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />
                                            {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
                                                <div
                                                    key={h}
                                                    className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
                                                    style={{
                                                        cursor: `${h}-resize`,
                                                        top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
                                                        left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
                                                    }}
                                                    onPointerMove={(e) => {
                                                        e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);

                                                        // Update tracked pointer position
                                                        if (pointersRef.current.has(e.pointerId)) {
                                                            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: (e as any).pointerType || 'mouse' });
                                                        }

                                                        const wrapper = canvasRef.current?.parentElement;
                                                        if (!wrapper) return;
                                                        const rect = wrapper.getBoundingClientRect();
                                                        const x = e.clientX - rect.left;
                                                        const y = e.clientY - rect.top;

                                                        // If panning is active, handle scroll updates and skip drawing/resizing
                                                        if (panningRef.current.active) {
                                                            const container = containerRef.current;
                                                            if (container) {
                                                                // Touch two-finger centroid panning
                                                                if (panningRef.current.lastCentroid) {
                                                                    const pts = Array.from(pointersRef.current.values());
                                                                    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                                                                    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                                                                    const dx = cx - (panningRef.current.lastCentroid.x || cx);
                                                                    const dy = cy - (panningRef.current.lastCentroid.y || cy);
                                                                    container.scrollLeft -= dx;
                                                                    container.scrollTop -= dy;
                                                                    panningRef.current.lastCentroid = { x: cx, y: cy };
                                                                } else {
                                                                    // Mouse drag panning
                                                                    const dx = e.clientX - panningRef.current.lastX;
                                                                    const dy = e.clientY - panningRef.current.lastY;
                                                                    container.scrollLeft -= dx;
                                                                    container.scrollTop -= dy;
                                                                    panningRef.current.lastX = e.clientX;
                                                                    panningRef.current.lastY = e.clientY;
                                                                }
                                                            }
                                                            return;
                                                        }

                                                        // ALWAYS update mousePos for cursor visualization (Eraser)
                                                        setMousePos({ x, y });
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            )
                        }

                        // Render Document Widget
                        if (widget.type === 'document') {
                            return (
                                <div
                                    key={widget.id}
                                    data-id={widget.id}
                                    className={`dashboard-widget absolute flex flex-col select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`}
                                    style={{
                                        left: widget.x,
                                        top: widget.y,
                                        width: widget.w,
                                        height: widget.h,
                                        zIndex: widget.zIndex,
                                    }}
                                    onMouseDown={() => bringToFront(widget.id)}
                                >
                                    <Card className="w-full h-full flex flex-col shadow-lg border-2 border-border/50 group overflow-hidden rounded-xl isolate">
                                        <CardHeader
                                            className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/20 handle cursor-move rounded-t-[inherit]"
                                            onMouseDown={(e) => {
                                                if (!isEditMode) return;
                                                e.preventDefault();
                                                setDragState({
                                                    id: widget.id,
                                                    startX: e.clientX, startY: e.clientY,
                                                    initialX: widget.x, initialY: widget.y,
                                                    initialW: widget.w, initialH: widget.h,
                                                    mode: 'move'
                                                });
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-[var(--primary)]" />
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 truncate">
                                                    {widget.title}
                                                </CardTitle>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveWidget(widget.id)} title="Remove Widget">
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex items-center justify-center bg-background p-4 flex-col text-center gap-2 rounded-b-[inherit]">
                                            <Button
                                                variant="secondary"
                                                className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                                                onClick={() => navigate(`/canvas/${widget.collectionName}`)}
                                            >
                                                <ExternalLink className="h-6 w-6 mb-1 opacity-50" />
                                                <span className="text-xs">Open Canvas</span>
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {isEditMode && (
                                        <div
                                            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
                                            onMouseDown={(e) => {
                                                e.stopPropagation(); e.preventDefault();
                                                setDragState({
                                                    id: widget.id,
                                                    startX: e.clientX, startY: e.clientY,
                                                    initialX: widget.x, initialY: widget.y,
                                                    initialW: widget.w, initialH: widget.h,
                                                    mode: 'resize'
                                                });
                                            }}
                                        >
                                            <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
                                        </div>
                                    )}

                                    {/* Resize Handles (Only if selected) */}
                                    {selectedWidgetId === widget.id && drawingTool === 'none' && (
                                        <>
                                            {/* Border Highlighting */}
                                            <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />
                                            {/* Handles */}
                                            {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
                                                <div
                                                    key={h}
                                                    className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
                                                    style={{
                                                        cursor: `${h}-resize`,
                                                        top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
                                                        left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
                                                    }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
                                                        const wrapper = canvasRef.current?.parentElement;
                                                        if (wrapper) {
                                                            const rect = wrapper.getBoundingClientRect();
                                                            const x = e.clientX - rect.left;
                                                            const y = e.clientY - rect.top;
                                                            resizeStateRef.current = {
                                                                active: true,
                                                                handle: h as any,
                                                                startMouse: { x, y },
                                                                startWidget: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
                                                            };
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            );
                        }

                        const col = collections.find(c => c.name === widget.collectionName);
                        if (!col) return null;

                        return (
                            <div
                                key={widget.id}
                                data-id={widget.id}
                                className={`dashboard-widget absolute flex flex-col select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`} // Removed border/bg since Widget has it
                                style={{
                                    left: widget.x,
                                    top: widget.y,
                                    width: widget.w,
                                    height: widget.h,
                                    zIndex: widget.zIndex,
                                }}
                                onMouseDown={() => bringToFront(widget.id)}
                            >
                                <DatabaseWidget
                                    collection={col}
                                    initialView={widget.viewType}
                                    className="w-full h-full"
                                    onRemove={() => handleRemoveWidget(widget.id)}
                                    viewConfig={widget.viewConfig}
                                    onConfigChange={(newConfig) => {
                                        setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, viewConfig: newConfig } : w));
                                    }}
                                    onHeaderMouseDown={(e) => {
                                        if (!isEditMode) return;
                                        e.preventDefault();
                                        setDragState({
                                            id: widget.id,
                                            startX: e.clientX, startY: e.clientY,
                                            initialX: widget.x, initialY: widget.y,
                                            initialW: widget.w, initialH: widget.h,
                                            mode: 'move'
                                        });
                                    }}
                                />

                                {isEditMode && (
                                    <div
                                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
                                        onMouseDown={(e) => {
                                            e.stopPropagation(); e.preventDefault();
                                            setDragState({
                                                id: widget.id,
                                                startX: e.clientX, startY: e.clientY,
                                                initialX: widget.x, initialY: widget.y,
                                                initialW: widget.w, initialH: widget.h,
                                                mode: 'resize'
                                            });
                                        }}
                                    >
                                        <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
                                    </div>
                                )}

                                {/* Resize Handles (Only if selected) */}
                                {selectedWidgetId === widget.id && drawingTool === 'none' && (
                                    <>
                                        {/* Border Highlighting */}
                                        <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />

                                        {/* Handles */}
                                        {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
                                            <div
                                                key={h}
                                                className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
                                                style={{
                                                    cursor: `${h}-resize`,
                                                    top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
                                                    left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
                                                }}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation(); // Stop drag/select
                                                    e.currentTarget.setPointerCapture(e.pointerId);

                                                    // Calc start pos relative to container
                                                    const wrapper = canvasRef.current?.parentElement;
                                                    if (wrapper) {
                                                        const rect = wrapper.getBoundingClientRect();
                                                        const x = e.clientX - rect.left;
                                                        const y = e.clientY - rect.top;

                                                        resizeStateRef.current = {
                                                            active: true,
                                                            handle: h as any,
                                                            startMouse: { x, y },
                                                            startWidget: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
                                                        };
                                                    }
                                                }}
                                            />
                                        ))}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Global Context Menu */}
                {globalContextMenu && (
                    <div
                        className="fixed z-[9999] p-4 bg-popover border rounded-xl shadow-2xl space-y-4 w-64 animate-in fade-in zoom-in-95 duration-100"
                        style={{ left: globalContextMenu.x, top: globalContextMenu.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="fixed inset-0 z-[-1]" onClick={() => setGlobalContextMenu(null)} />

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="font-semibold text-sm">Tools</span>
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setGlobalContextMenu(null)}>✕</Button>
                            </div>

                            {/* Hex Color Picker (Always) */}
                            <HexColorPicker color={brushColor} onChange={setBrushColor} style={{ width: '100%' }} />

                            {/* Brush Slider (Only if Brush) */}
                            {drawingTool === 'pencil' && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                        <span>Brush Size</span>
                                        <span>{brushSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            )}

                            {/* Eraser Slider (Always, per request) */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                    <span>Eraser Size</span>
                                    <span>{eraserSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="100"
                                    value={eraserSize}
                                    onChange={(e) => setEraserSize(Number(e.target.value))}
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
