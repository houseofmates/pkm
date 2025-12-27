import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Plus, LayoutGrid, Database, Trash2, Move, Minimize2,
    Lock, Unlock, Pencil, Eraser, MousePointer2, Check, Wand2
} from 'lucide-react';
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

type WidgetType = 'view';
interface Widget extends WidgetDefinition { }
interface WidgetDefinition {
    id: string;
    type: WidgetType;
    title: string;
    collectionName: string;
    viewType: ViewType;
    x: number;
    y: number;
    w: number;
    h: number;
    zIndex: number;
}

export function DashboardGrid() {
    // --- State ---
    // Widgets (Synced to Backend)
    const [widgets, setWidgets] = useAppSetting<WidgetDefinition[]>('dashboard_widgets', []);
    const { collections } = useCollections();
    const { client, token, isAuthenticated, login } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [isEditMode, setIsEditMode] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState<'collection' | 'view'>('collection');
    const [wizardSearch, setWizardSearch] = useState('');
    const [selectedCollectionForWizard, setSelectedCollectionForWizard] = useState<string | null>(null);

    // Data cache
    const [widgetData, setWidgetData] = useState<Record<string, { data: any[], loading: boolean }>>({});

    // Drawing State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [drawingTool, setDrawingTool] = useState<'none' | 'pencil' | 'eraser' | 'lasso'>('none');
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [brushSize] = useState(3);
    const [eraserSize] = useState(20);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);

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

                console.log("Canvas uploading blob size:", blob.size);
                const file = new File([blob], "canvas_state.png", { type: "image/png" });
                try {
                    const res = await client.upload(file);
                    console.log("Canvas full upload response:", res);

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
                        console.log("Generated inline backup from local blob (length: " + (dataUrl?.length || 0) + ")");

                        const payload: any = { id, url };
                        if (dataUrl && dataUrl.length < 1_000_000) payload.data = dataUrl; // include small backup

                        lastSyncedUrlRef.current = url;
                        setSavedCanvasData(payload);

                        // Force a flush so the setting persists immediately and is visible to other devices
                        try {
                            await (flushSavedCanvas?.(payload) ?? Promise.resolve());
                            console.log("Canvas setting flushed successfully:", url);
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
        };
        window.addEventListener('keydown', handleKeyDown);

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
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [performUndo, performRedo, floatingSelection]);

    // Fetch Widget Data
    useEffect(() => {
        widgets.forEach(widget => {
            if (!widgetData[widget.id] && !widgetData[widget.id]?.loading) {
                setWidgetData(prev => ({ ...prev, [widget.id]: { data: [], loading: true } }));
                client.listRecords(widget.collectionName).then(res => {
                    const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
                    setWidgetData(prev => ({ ...prev, [widget.id]: { data, loading: false } }));
                }).catch(err => {
                    console.error(err);
                    setWidgetData(prev => ({ ...prev, [widget.id]: { data: [], loading: false } }));
                });
            }
        });
    }, [widgets, client]);


    // --- Widget Operations ---

    const handleAddWidget = (collectionName: string, viewType: ViewType) => {
        const col = collections.find(c => c.name === collectionName);
        const title = `${col?.title || collectionName} (${viewType})`;
        const newWidget: WidgetDefinition = {
            id: `w_${Date.now()}`,
            type: 'view',
            title,
            collectionName,
            viewType,
            x: 50 + (widgets.length * 20),
            y: 50 + (widgets.length * 20),
            w: 400,
            h: 300,
            zIndex: widgets.length + 1
        };
        setWidgets(prev => [...prev, newWidget]);
        toast.success(`added ${title}`);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const bringToFront = (id: string) => {
        setWidgets(prev => {
            const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
            return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
        });
    };

    // --- Drawing Handlers ---
    const isDrawingRef = useRef(false);

    const handleCanvasDown = (e: React.MouseEvent) => {
        if (drawingTool === 'none') return;

        // Snapshot BEFORE drawing a new stroke
        saveSnapshot();

        isDrawingRef.current = true;
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
        const ctx = canvasRef.current!.getContext('2d')!;

        if (drawingTool === 'pencil') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (drawingTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = eraserSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (drawingTool === 'lasso') {
            setLassoPoints([{ x, y }]);
        }
    };

    const handleCanvasMove = (e: React.MouseEvent) => {
        // Track mouse for Eraser Cursor immediately
        setMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

        if (!isDrawingRef.current) return;
        if (drawingTool === 'none') return;

        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
        const ctx = canvasRef.current!.getContext('2d')!;

        if (drawingTool === 'pencil' || drawingTool === 'eraser') {
            ctx.lineTo(x, y);
            ctx.stroke();
            canvasDirtyRef.current = true;
            // debounce auto-save: schedule save 1s after last draw
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = (setTimeout(() => {
                if (canvasDirtyRef.current) saveCanvas();
            }, 1000) as unknown) as number;
        } else if (drawingTool === 'lasso') {
            setLassoPoints(prev => [...prev, { x, y }]);
        }
    };

    const handleCanvasUp = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        saveCanvas();

        if (drawingTool === 'lasso' && lassoPoints.length > 2) {
            // Finish Lasso - Extract Selection
            const ctx = canvasRef.current!.getContext('2d')!;

            // 1. Calc Bounds
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            lassoPoints.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
            const w = maxX - minX;
            const h = maxY - minY;

            if (w <= 0 || h <= 0) { setLassoPoints([]); return; }

            // 2. Clip and Extract
            ctx.save();
            ctx.beginPath();
            lassoPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.clip();

            const imageData = ctx.getImageData(minX, minY, w, h);

            // Clear original
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();

            // Store in temp canvas
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = w;
            cropCanvas.height = h;
            const cropCtx = cropCanvas.getContext('2d')!;
            cropCtx.putImageData(imageData, 0, 0);

            const newFloating = {
                image: cropCanvas.toDataURL(),
                x: minX,
                y: minY,
                w,
                h
            };
            setFloatingSelection(newFloating);
            // Persist floating selection so it can be resumed on another device
            try {
                setSavedFloatingSelection(JSON.stringify(newFloating));
                // Fire-and-forget flush to make sure it's on the server quickly
                flushSavedFloating?.(JSON.stringify(newFloating)).catch((e) => console.error('flush floating failed', e));
            } catch (e) {
                console.error('Failed to save floating selection:', e);
            }
            setLassoPoints([]);
        }
    };

    const pasteSelection = () => {
        if (!floatingSelection || !canvasRef.current) return;

        saveSnapshot(); // Snapshot before pasting back

        const ctx = canvasRef.current.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, floatingSelection.x, floatingSelection.y, floatingSelection.w, floatingSelection.h);
            saveCanvas();
            setFloatingSelection(null);
            // Remove persisted floating selection after it's pasted
            try { setSavedFloatingSelection(null); } catch (e) { /* ignore */ }
        };
        img.src = floatingSelection.image;
    };


    // --- Global Drag Logic (Widgets) ---
    const [dragState, setDragState] = useState<{
        id: string,
        startX: number,
        startY: number,
        initialX: number,
        initialY: number,
        initialW: number,
        initialH: number,
        mode: 'move' | 'resize'
    } | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState) return;
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;

            setWidgets(prev => prev.map(w => {
                if (w.id !== dragState.id) return w;
                if (dragState.mode === 'move') {
                    return { ...w, x: dragState.initialX + deltaX, y: dragState.initialY + deltaY };
                } else {
                    return { ...w, w: Math.max(200, dragState.initialW + deltaX), h: Math.max(150, dragState.initialH + deltaY) };
                }
            }));
        };
        const handleMouseUp = () => setDragState(null);

        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState]);

    const { setNodeRef, isOver } = useDroppable({ id: 'dashboard-canvas' });

    useEffect(() => {
        const handleExternalDrop = (e: CustomEvent<{ collectionName: string }>) => {
            handleAddWidget(e.detail.collectionName, 'table');
        };
        window.addEventListener('pkm:add-widget', handleExternalDrop as EventListener);
        return () => { window.removeEventListener('pkm:add-widget', handleExternalDrop as EventListener); };
    }, [widgets, collections]);

    if (!isAuthenticated) {
        return (
            <div className="p-4 md:p-8 h-full flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Connect NocoBase</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Token</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter NocoBase API Token"
                            />
                            <p className="text-xs text-muted-foreground">
                                Your token is stored locally.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <strong>Note:</strong> Dev servers use the full origin (host + port). If you started the dev server on a different port, you'll need to re-enter your API token for this origin.
                            </p>
                        </div>
                        <Button className="w-full" onClick={() => { if (apiKey) login(apiKey); }}>Connect</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b bg-background z-50 shadow-sm h-16 relative">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    {isOver && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">Drop to Add</span>}
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
                                title="Pencil (Right-click for color)"
                                className={drawingTool === 'pencil' ? "bg-accent" : ""}
                            >
                                <Pencil className="h-4 w-4" style={{ color: drawingTool === 'pencil' ? brushColor : 'currentColor' }} />
                            </Button>
                            {colorPickerOpen && (
                                <div className="absolute top-12 left-0 z-50 p-2 bg-popover border rounded shadow-xl">
                                    <div className="fixed inset-0 z-40" onClick={() => setColorPickerOpen(false)} />
                                    <div className="relative z-50">
                                        <HexColorPicker color={brushColor} onChange={setBrushColor} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button
                            variant={drawingTool === 'eraser' ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setDrawingTool(drawingTool === 'eraser' ? 'none' : 'eraser')}
                            className={drawingTool === 'eraser' ? "bg-accent" : ""}
                            title="Eraser"
                        >
                            <Eraser className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={drawingTool === 'lasso' ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => {
                                if (floatingSelection) pasteSelection();
                                setDrawingTool(drawingTool === 'lasso' ? 'none' : 'lasso');
                            }}
                            className={drawingTool === 'lasso' ? "bg-accent" : ""}
                            title="Lasso / Wand"
                        >
                            <Wand2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={drawingTool === 'none' ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => {
                                if (floatingSelection) pasteSelection();
                                setDrawingTool('none');
                            }}
                            title="Cursor (Move Widgets)"
                            className={drawingTool === 'none' ? "bg-accent" : ""}
                        >
                            <MousePointer2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-border mx-2" />

                    <Button
                        variant={isEditMode ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsEditMode(!isEditMode)}
                        title={isEditMode ? "Lock Layout" : "Unlock Layout"}
                    >
                        {isEditMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAddMenuOpen(!addMenuOpen);
                            setWizardStep('collection');
                            setWizardSearch('');
                        }}
                        variant={addMenuOpen ? "secondary" : "default"}
                    >
                        <Plus className="h-4 w-4 mr-2" /> add view
                    </Button>

                    {addMenuOpen && (
                        <div
                            className="absolute top-full right-0 mt-2 w-72 bg-popover border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
                            style={{ maxHeight: '400px' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Wizard Header */}
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
                                        {wizardStep === 'collection' ? 'Select Database' : 'Select View Type'}
                                    </span>
                                </div>
                                <Input
                                    placeholder={wizardStep === 'collection' ? "Search collections..." : "Search view types..."}
                                    value={wizardSearch}
                                    onChange={e => setWizardSearch(e.target.value)}
                                    className="h-8 text-xs bg-background"
                                    autoFocus
                                />
                            </div>

                            {/* Wizard Body */}
                            <div className="overflow-y-auto flex-1 p-1">
                                {wizardStep === 'collection' ? (
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
                                        {collections.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No collections found</div>}
                                    </div>
                                ) : (
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
                            <span className="sr-only">Undo</span>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={performRedo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+V / Ctrl+Y)"
                        >
                            <span className="sr-only">Redo</span>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M10.1464 2.14645C10.3417 1.95118 10.6583 1.95118 10.8536 2.14645L12.8536 4.14645C13.0488 4.34171 13.0488 4.65829 12.8536 4.85355L10.8536 6.85355C10.6583 7.04882 10.3417 7.04882 10.1464 6.85355C9.95118 6.65829 9.95118 6.34171 10.1464 6.14645L11.2929 5H6C4.067 5 2.5 6.567 2.5 8.5C2.5 10.433 4.067 12 6 12H10C10.2761 12 10.5 12.2239 10.5 12.5C10.5 12.7761 10.2761 13 10 13H6C3.51472 13 1.5 10.9853 1.5 8.5C1.5 6.01472 3.51472 4 6 4H11.2929L10.1464 2.85355C9.95118 2.65829 9.95118 2.34171 10.1464 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
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
                    <span className="sr-only">Undo</span>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={performRedo}
                    disabled={!canRedo}
                    className="shadow-md border border-border"
                >
                    <span className="sr-only">Redo</span>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M10.1464 2.14645C10.3417 1.95118 10.6583 1.95118 10.8536 2.14645L12.8536 4.14645C13.0488 4.34171 13.0488 4.65829 12.8536 4.85355L10.8536 6.85355C10.6583 7.04882 10.3417 7.04882 10.1464 6.85355C9.95118 6.65829 9.95118 6.34171 10.1464 6.14645L11.2929 5H6C4.067 5 2.5 6.567 2.5 8.5C2.5 10.433 4.067 12 6 12H10C10.2761 12 10.5 12.2239 10.5 12.5C10.5 12.7761 10.2761 13 10 13H6C3.51472 13 1.5 10.9853 1.5 8.5C1.5 6.01472 3.51472 4 6 4H11.2929L10.1464 2.85355C9.95118 2.65829 9.95118 2.34171 10.1464 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </Button>
            </div>

            {/* Canvas Area */}
            <div
                ref={(node) => {
                    containerRef.current = node;
                    setNodeRef(node);
                }}
                className={`flex-1 relative bg-neutral-50/50 dark:bg-neutral-900/20 overflow-auto cursor-grab active:cursor-grabbing ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
                onClick={() => setAddMenuOpen(false)}
            >
                <div className="min-w-[2000px] min-h-[2000px] relative">

                    {/* Painting Canvas */}
                    <canvas
                        ref={canvasRef}
                        width={2000}
                        height={2000}
                        className="absolute inset-0 z-[60] pointer-events-auto"
                        style={{
                            pointerEvents: drawingTool !== 'none' ? 'auto' : 'none',
                            cursor: drawingTool === 'eraser' ? 'none' : (drawingTool !== 'none' ? 'crosshair' : 'default')
                        }}
                        onMouseDown={handleCanvasDown}
                        onMouseMove={handleCanvasMove}
                        onMouseUp={handleCanvasUp}
                        onMouseLeave={handleCanvasUp}
                    />

                    {/* Eraser Cursor */}
                    {drawingTool === 'eraser' && (
                        <div
                            className="absolute z-[100] pointer-events-none border border-foreground/30 rounded-full bg-transparent"
                            style={{
                                left: mousePos.x,
                                top: mousePos.y,
                                width: eraserSize,
                                height: eraserSize,
                                transform: 'translate(-50%, -50%)',
                                borderWidth: '1px' // Ensure visible but thin
                            }}
                        />
                    )}

                    {/* Lasso Feedback */}
                    {drawingTool === 'lasso' && lassoPoints.length > 0 && (
                        <svg className="absolute inset-0 z-[65] pointer-events-none" width={2000} height={2000}>
                            <polygon
                                points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="#f6b01233"
                                stroke="#f6b012"
                                strokeDasharray="4"
                            />
                        </svg>
                    )}

                    {/* Floating Selection */}
                    {floatingSelection && (
                        <div
                            className="absolute z-[70] border-2 border-dashed border-[#f6b012] group cursor-move"
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
                                className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#f6b012] cursor-nwse-resize"
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
                                className="absolute top-1/2 -right-2 w-2 h-4 bg-[#f6b012] cursor-ew-resize -translate-y-1/2"
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
                        const ViewComponent = VIEW_REGISTRY[widget.viewType];
                        const data = widgetData[widget.id]?.data || [];

                        return (
                            <div
                                key={widget.id}
                                className="absolute bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden group select-none transition-shadow hover:shadow-md"
                                style={{
                                    left: widget.x,
                                    top: widget.y,
                                    width: widget.w,
                                    height: widget.h,
                                    zIndex: widget.zIndex,
                                }}
                                onMouseDown={() => bringToFront(widget.id)}
                            >
                                <div
                                    className={`flex items-center justify-between p-2 border-b bg-muted/10 cursor-move ${isEditMode ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity`}
                                    onMouseDown={(e) => {
                                        if (!isEditMode) return;
                                        e.preventDefault(); // This might block click propagation if not careful, but drag logic relies on it. 
                                        // Wait, drawingTool checks? Widgets are below canvas z-index 60, but if drawingTool is 'none', canvas is pointer-events-none.
                                        // So widgets get clicks. Good.
                                        setDragState({
                                            id: widget.id,
                                            startX: e.clientX, startY: e.clientY,
                                            initialX: widget.x, initialY: widget.y,
                                            initialW: widget.w, initialH: widget.h,
                                            mode: 'move'
                                        });
                                    }}
                                >
                                    <div className="font-medium text-xs flex items-center gap-2 text-muted-foreground">
                                        <Move className="h-3 w-3" />
                                        {widget.title}
                                    </div>
                                    {isEditMode && (
                                        <Button
                                            variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveWidget(widget.id); }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto p-2">
                                    <ViewComponent data={data} collection={collections.find(c => c.name === widget.collectionName)} loading={false} />
                                </div>

                                {isEditMode && (
                                    <div
                                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100"
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
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
