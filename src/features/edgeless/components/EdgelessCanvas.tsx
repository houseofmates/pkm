import { useEffect, useRef, useState } from 'react'
import { Canvas, PencilBrush, Point } from 'fabric'
import { toast } from 'sonner'
import * as fabric from 'fabric' // Need full namespace for Polyline/Polygon etc
import { useEdgelessStore } from '../store'
import { useWindowSize } from 'react-use'
import { useDroppable } from '@dnd-kit/core'
import { PdfElement } from './elements/PdfElement'
import { EmbedElement } from './elements/EmbedElement'
import { LinkElement } from './elements/LinkElement'
import { RecordNodeElement } from './elements/RecordNodeElement'
import { PortalElement } from './elements/PortalElement'
import { EternalFlame } from './elements/EternalFlame'
import { OfferingDrop } from './elements/OfferingDrop'
import { ShoppingCard } from './elements/ShoppingCard'
import { GoldPile } from './elements/GoldPile'
import { FloatingReminder } from './elements/FloatingReminder'
import { TierListElement } from './elements/TierListElement'
import { SleepRing } from './elements/SleepRing'
import { ConnectorElement } from './elements/ConnectorElement'
import { SmartTextElement } from './elements/SmartTextElement'
import { useContextMenuStore } from '@/components/ui/context-menu-store'
import { ContactElement } from './elements/ContactElement'
import { CanvasCard } from '@/features/databases/components/canvas/CanvasCard'
import { useCanvasEvents } from '../hooks/use-canvas-events'
import * as pdfjsLib from 'pdfjs-dist'

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`

export interface EdgelessCanvasProps {
    onObjectModified?: (id: string, patch: any) => void;
    className?: string;
    onLoad?: () => void;
}

// --- CUSTOM SELECTION STYLE (Global Override) ---
// Must run before any canvas instantiation
fabric.Object.prototype.set({
    transparentCorners: false, // Force "filled" mode so we can control fill color
    cornerColor: 'rgba(0,0,0,0)', // Invisible fill
    cornerStrokeColor: 'rgba(0,0,0,0)', // Invisible stroke
    borderColor: 'rgba(255, 255, 255, 0.4)', // Faint outline
    cornerSize: 12, // Hitbox size
    padding: 8,
    borderScaleFactor: 1.5,
    borderDashArray: [4, 4],
    cornerStyle: 'rect' // Force rect to avoid circle drawing overhead/style
});

export function EdgelessCanvas({ onObjectModified, className, onLoad }: EdgelessCanvasProps) {
    const canvasEl = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const { width, height } = useWindowSize()

    // Drop Target Logic
    const { setNodeRef } = useDroppable({
        id: 'canvas-droppable',
    });

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const payload = JSON.parse(data);
            if (payload.type === 'pkm-record') {
                const canvas = fabricCanvas;
                if (!canvas) return;

                // Calculate drop position
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;

                const clientX = e.clientX;
                const clientY = e.clientY;

                // Convert to canvas coordinates
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                const zoom = canvas.getZoom();

                // x = (clientX - rect.left - vpt[4]) / zoom
                const x = (clientX - rect.left - vpt[4]) / zoom;
                const y = (clientY - rect.top - vpt[5]) / zoom;

                addElement({
                    type: 'record-node',
                    x,
                    y,
                    width: 200, // Default width
                    height: 60, // Default height
                    data: {
                        recordId: payload.id,
                        collectionName: payload.collection,
                        title: payload.title,
                        mode: 'node' as const // 'node' | 'card'
                    }
                });
            }
        } catch (err) {
            console.error('Failed to parse drop data', err);
        }
    };


    // Merge refs for container
    const setRefs = (node: HTMLDivElement) => {
        containerRef.current = node;
        setNodeRef(node);
    };

    const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()) // Track selected items for pointer-events
    const [pdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)

    // Store State
    const {
        elements,
        mode,
        addElement,
        setViewport,
        activeTool,
        penColor,
        penWidth,
        canvasConfig,
        viewPort,
        pushHistory, // Destructure here to check availability
        undo,
        redo,
        layers,
        activeLayerId,
        removeElement,
        setTool,
        setSelectionMode
    } = useEdgelessStore()

    // --- HOTKEYS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.closest('.ProseMirror');

            if (isTyping) return;

            const key = e.key.toLowerCase();
            if (key === 's') {
                setTool('select');
                setSelectionMode('cursor');
                toast.success('selection tool active', { duration: 1000, icon: '🔍' });
            } else if (key === 'b' || key === 'p') {
                setTool('pen');
                toast.success('brush tool active', { duration: 1000, icon: '✏️' });
            } else if (key === 'e') {
                setTool('eraser');
                toast.success('eraser tool active', { duration: 1000, icon: '🧼' });
            } else if (key === 't') {
                setTool('text');
                toast.success('text tool active', { duration: 1000, icon: '🔤' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setTool, setSelectionMode]);

    // 1. Initialize Canvas
    useEffect(() => {
        if (!canvasEl.current || fabricCanvas) return

        const canvas = new Canvas(canvasEl.current, {
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: '#060606', // Updated to #060606
            isDrawingMode: false,
            selection: true,
            selectionColor: 'hsla(var(--primary), 0.1)',
            selectionBorderColor: 'hsl(var(--primary))',
            selectionDashArray: [3, 3],
            selectionLineWidth: 1.5
        })


        // Scroll wheel: Pan by default, Zoom with Ctrl
        canvas.on('mouse:wheel', (opt: any) => {
            const evt = opt.e
            evt.preventDefault()
            evt.stopPropagation()

            console.log('Mouse wheel:', { ctrl: evt.ctrlKey, meta: evt.metaKey, deltaY: evt.deltaY });

            // Check for Ctrl/Cmd key for Zooming
            if (evt.ctrlKey || evt.metaKey) {
                // Zoom Logic
                const delta = evt.deltaY
                let zoom = canvas.getZoom()
                zoom *= 0.999 ** delta
                if (zoom > 20) zoom = 20
                if (zoom < 0.01) zoom = 0.01

                console.log('Zooming to:', zoom);

                canvas.zoomToPoint(new Point(evt.offsetX, evt.offsetY), zoom)
            } else {
                // Pan Logic (Standard Scroll / 2-Finger Drag)
                const vpt = canvas.viewportTransform
                if (vpt) {
                    vpt[4] -= evt.deltaX
                    vpt[5] -= evt.deltaY
                    canvas.requestRenderAll()
                }
            }

            setViewport({ x: (canvas.viewportTransform?.[4] || 0), y: (canvas.viewportTransform?.[5] || 0), zoom: canvas.getZoom() })
        })

        // Panning Logic (Mouse)
        let isDragging = false
        let lastPosX = 0;
        let lastPosY = 0;

        canvas.on('mouse:down', (opt: any) => {
            const evt = opt.e;
            if (activeTool === 'hand' || evt.altKey || evt.button === 1) { // Hand tool or Alt or Middle Click
                isDragging = true
                canvas.selection = false // Disable selection box
                lastPosX = evt.clientX
                lastPosY = evt.clientY
                canvas.defaultCursor = 'grabbing'
            }
        })

        canvas.on('mouse:move', (opt: any) => {
            if (isDragging) {
                const e = opt.e;
                const vpt = canvas.viewportTransform;
                if (vpt) {
                    vpt[4] += e.clientX - lastPosX
                    vpt[5] += e.clientY - lastPosY
                    canvas.requestRenderAll()
                    lastPosX = e.clientX
                    lastPosY = e.clientY
                    setViewport({ x: vpt[4], y: vpt[5], zoom: canvas.getZoom() })
                }
            }
        })

        canvas.on('mouse:up', () => {
            if (isDragging) {
                isDragging = false
                canvas.selection = true
                canvas.defaultCursor = 'default'
            }
        })

        setFabricCanvas(canvas)

        return () => {
            canvas.dispose()
        }
    }, [])

    // Expose Helpers & Listen for Load
    useEffect(() => {
        if (!fabricCanvas) return;

        // Load Handler
        const handleLoad = (e: CustomEvent) => {
            const data = e.detail;
            console.log('[Canvas] Received load event, objects:', data?.objects?.length || 0);
            if (data) {
                fabricCanvas.loadFromJSON(data, () => {
                    console.log('[Canvas] Loaded from JSON, requesting render');
                    fabricCanvas.requestRenderAll();
                    if (onLoad) onLoad();
                });
            }
        };
        window.addEventListener('pkm:load-canvas', handleLoad as any);

        // Check for pending data that was stored before canvas mounted
        const pendingData = (window as any).__pkmPendingCanvasData;
        if (pendingData) {
            console.log('[Canvas] Found pending data, loading:', pendingData?.objects?.length || 0, 'objects');
            fabricCanvas.loadFromJSON(pendingData, () => {
                console.log('[Canvas] Loaded pending data, requesting render');
                fabricCanvas.requestRenderAll();
                if (onLoad) onLoad();
            });
            // Clear pending data
            delete (window as any).__pkmPendingCanvasData;
        }

        // Expose Getters
        (window as any).pkmGetCanvasJSON = () => {
            return fabricCanvas.toJSON();
        };
        (window as any).pkmGetCanvasThumbnail = () => {
            // Generate low-res thumbnail
            return fabricCanvas.toDataURL({
                format: 'png',
                multiplier: 0.2,
                quality: 0.8
            });
        };

        return () => {
            window.removeEventListener('pkm:load-canvas', handleLoad as any);
            delete (window as any).pkmGetCanvasJSON;
            delete (window as any).pkmGetCanvasThumbnail;
        }
    }, [fabricCanvas]);

    // 2. Sync Elements from Store to Fabric
    // For non-canvas elements (like embeds), we overlay them using absolute positioning HTML.
    // For Fabric native objects (ink), we let Fabric handle it.

    // 3. Handle Tools
    useEffect(() => {
        if (!fabricCanvas) return

        if (mode === 'draw' && activeTool === 'pen') {
            fabricCanvas.isDrawingMode = true
            const brush = new PencilBrush(fabricCanvas)
            brush.color = penColor
            brush.width = penWidth
            fabricCanvas.freeDrawingBrush = brush
            fabricCanvas.defaultCursor = 'default'
        } else if (mode === 'draw' && activeTool === 'eraser') {
            // True Eraser
            fabricCanvas.isDrawingMode = false
            fabricCanvas.defaultCursor = 'none'
        } else if (activeTool === 'select') {
            const selMode = useEdgelessStore.getState().selectionMode

            if (selMode === 'cursor') {
                // Cursor Mode: Interact only, no modification
                fabricCanvas.isDrawingMode = false
                fabricCanvas.defaultCursor = 'default'
                fabricCanvas.selection = false
                // We'll handle object lock in a separate effect or here
            } else if (selMode === 'rect') {
                fabricCanvas.isDrawingMode = false
                fabricCanvas.defaultCursor = 'default'
                fabricCanvas.selection = true // Enable native box selection
            } else {
                // Lasso / Magic / Free
                fabricCanvas.isDrawingMode = false
                fabricCanvas.defaultCursor = 'crosshair'
                fabricCanvas.selection = false // We use custom lasso, not default rect
            }
        } else {
            // Fallback
            fabricCanvas.isDrawingMode = false
            fabricCanvas.defaultCursor = 'default'
            fabricCanvas.selection = true
        }

    }, [fabricCanvas, mode, activeTool, penColor, penWidth, useEdgelessStore.getState().selectionMode]) // NOTE: We might need to depend on store values more reactively if we want live updates, but usually tool change triggers this.

    // 3a. React to Pen Settings Changes (Live Update)
    const { stabilizerLevel, pressureEnabled } = useEdgelessStore()
    useEffect(() => {
        if (!fabricCanvas || activeTool !== 'pen' || mode !== 'draw') return

        // Update Brush
        const brush = fabricCanvas.freeDrawingBrush as PencilBrush
        if (brush) {
            brush.width = penWidth
            brush.color = penColor

            // Decimate ~ Stabilizer (higher decimate = smoother but less detail)
            // But 'decimate' is about pixel distance. 
            // Better stabilizer is usually tracking point average. 
            // Fabric 6/7 might have better brush options, but let's use decimate for now as proxy or implement custom if needed.
            // Let's use a weak proxy: decimate ranges from 0.4 (raw) to maybe 4 (smooth).
            brush.decimate = 0.4 + (stabilizerLevel / 100) * 5
        }

    }, [fabricCanvas, activeTool, mode, penWidth, penColor, stabilizerLevel, pressureEnabled])

    // 3b. Handle Interact / Cursor Mode (Lock Selection)
    useEffect(() => {
        if (!fabricCanvas) return

        const selMode = useEdgelessStore.getState().selectionMode
        const isCursorMode = (activeTool === 'select' && selMode === 'cursor')
        const isInteractMode = mode === 'interact'

        if (isInteractMode || isCursorMode) {
            // Interact/Cursor Mode: No fabric dragging, pass events to content
            fabricCanvas.selection = false // No selection box
            fabricCanvas.defaultCursor = 'default'

            fabricCanvas.forEachObject((obj) => {
                obj.selectable = false // Cannot select/move fabric objects

                // For "Cursor" mode, we want to allow clicking INSIDE the object (like links in HTML/SVG).
                // If the object is just a wrapper, we might need it to be evented=false so the DOM overlay receives events?
                // OR if we are using Fabric 6/7 controls, evented=true is needed?
                // Usually for "Interact" (Browse), we want `evented: false` so pointer-events go through canvas to the HTML overlay below/above?
                // The current implementation seems to assume HTML overlays based on "EdgelessCanvas.tsx" structure not fully visible but common pattern.
                // IF overlays are on top, `evented: false` is good.

                // User said: "cursor that is for interacting with database content inline"
                // This usually implies clicking buttons/inputs on the card.
                // So we want the Canvas to NOT consume the event.
                obj.evented = false
            })
            fabricCanvas.requestRenderAll()
        } else if (activeTool === 'select' && selMode === 'grab') {
            // Grab Mode: Default Fabric behavior
            // "simulating grabbing which... allows for rescaling and moving cards"
            fabricCanvas.selection = true // Allow multi-select with box
            fabricCanvas.defaultCursor = 'grab' // Or default, but grab hints behavior

            fabricCanvas.forEachObject((obj) => {
                obj.selectable = true
                obj.evented = true
            })
            fabricCanvas.requestRenderAll()
        } else if (activeTool === 'select' && (selMode === 'free' || selMode === 'magic')) {
            // Logic for Lasso handled in "Magic Lasso Tracking" effect?
            // "moving cards... is only done with the lasso tool" -> Current user wants "Grab" tool to do it too.
            // So we keep Lasso logic specific to Lasso.

            fabricCanvas.forEachObject((obj) => {
                obj.selectable = false // Disable direct click selection
                obj.evented = false
            })
        }
        else {
            // Fallback
            fabricCanvas.selection = false
            fabricCanvas.forEachObject((obj) => {
                obj.selectable = false
                obj.evented = false
            })
        }
    }, [fabricCanvas, mode, activeTool, useEdgelessStore.getState().selectionMode])

    // 3c. Implement Pressure Sensitivity for stylus/pen input
    useEffect(() => {
        if (!fabricCanvas) return

        const canvasEl = fabricCanvas.getElement()
        if (!canvasEl) return

        const basePenWidth = penWidth

        // Track pressure during drawing
        const handlePointerMove = (e: PointerEvent) => {
            // Only apply when drawing with pen tool and pressure is enabled
            const state = useEdgelessStore.getState()
            if (state.mode !== 'draw' || state.activeTool !== 'pen' || !state.pressureEnabled) return
            if (!fabricCanvas.isDrawingMode) return

            // Get pressure (0.0 to 1.0, 0.5 is default for mouse/touch without pressure)
            const pressure = e.pressure || 0.5

            // Only vary width if we have actual pressure data (not default 0.5 from mouse)
            // Pen/stylus typically report values other than 0.5
            if (e.pointerType === 'pen' || e.pointerType === 'touch') {
                const brush = fabricCanvas.freeDrawingBrush
                if (brush) {
                    // Scale width: min 20% of base, max 150% of base
                    const minScale = 0.2
                    const maxScale = 1.5
                    const scale = minScale + pressure * (maxScale - minScale)
                    brush.width = basePenWidth * scale
                }
            }
        }

        // Reset width when stroke ends
        const handlePointerUp = () => {
            const brush = fabricCanvas.freeDrawingBrush
            if (brush) {
                brush.width = basePenWidth
            }
        }

        // Use 'passive: false' to ensure we get accurate pressure readings
        canvasEl.addEventListener('pointermove', handlePointerMove, { passive: true })
        canvasEl.addEventListener('pointerup', handlePointerUp)
        canvasEl.addEventListener('pointerleave', handlePointerUp)

        return () => {
            canvasEl.removeEventListener('pointermove', handlePointerMove)
            canvasEl.removeEventListener('pointerup', handlePointerUp)
            canvasEl.removeEventListener('pointerleave', handlePointerUp)
        }
    }, [fabricCanvas, penWidth])

    // --- Sync Selection State (for Pointer Events) ---
    useEffect(() => {
        if (!fabricCanvas) return

        const updateSelection = () => {
            const active = fabricCanvas.getActiveObjects()
            const newSet = new Set(active.map((o: any) => o.data?.id).filter(Boolean))
            setSelectedIds(newSet)
        }

        fabricCanvas.on('selection:created', updateSelection)
        fabricCanvas.on('selection:updated', updateSelection)
        fabricCanvas.on('selection:cleared', updateSelection)

        return () => {
            fabricCanvas.off('selection:created', updateSelection)
            fabricCanvas.off('selection:updated', updateSelection)
            fabricCanvas.off('selection:cleared', updateSelection)
        }
    }, [fabricCanvas])

    // --- Selection Safeguards (Right-Click / Long-Press to Deselect) ---
    // User Request: "switch from a double click to a right click"
    // Logic: 
    // - Left Click Background -> Restore Selection (Ignored)
    // - Right Click Background -> Deselect
    // - Long Press Background -> Deselect
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!fabricCanvas) return

        const handleDown = (opt: any) => {
            const evt = opt.e
            const isRightClick = (evt.button === 2 || evt.which === 3)
            const isBackground = !opt.target

            // 1. Right Click Background -> Deselect
            if (isRightClick && isBackground) {
                fabricCanvas.discardActiveObject()
                fabricCanvas.requestRenderAll()
                return
            }

            // 2. Long Press Logic (Left Click Background only)
            if (isBackground && !isRightClick) {
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = setTimeout(() => {
                    // Valid Long Press -> Deselect (Programmatic)
                    fabricCanvas.discardActiveObject()
                    fabricCanvas.requestRenderAll()
                    if (navigator.vibrate) navigator.vibrate(50)
                }, 600)
            }
        }

        const handleUp = () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
            }
        }

        const handleSelectionCleared = (e: any) => {
            // 1. If no user event (programmatic deselect like Long Press / Right Click / Code), allow it.
            if (!e.e) return

            // 2. Did we click another object? (Switching active selection to new object)
            // findTarget checks if the user event actually hit a valid target.
            // If yes, we allow the "clear" because a "created" event will follow for the new selection.
            if (fabricCanvas.findTarget(e.e, false)) return

            // 3. Background Click (Left) -> RESTORE Selection
            // We consciously BLOCK single (and double) left clicks on background from clearing selection.
            const items = e.deselected || []
            if (items.length > 0) {
                if (items.length === 1) {
                    fabricCanvas.setActiveObject(items[0])
                } else {
                    const sel = new fabric.ActiveSelection(items, { canvas: fabricCanvas })
                    fabricCanvas.setActiveObject(sel)
                }
                fabricCanvas.requestRenderAll()
            }
        }

        // Suppress Context Menu on Canvas if clicking background
        const handleContextMenu = (e: MouseEvent) => {
            if (e.target === fabricCanvas.upperCanvasEl) {
                e.preventDefault()
            }
        }

        fabricCanvas.on('mouse:down', handleDown)
        fabricCanvas.on('mouse:up', handleUp)
        fabricCanvas.on('selection:cleared', handleSelectionCleared)

        if (fabricCanvas.upperCanvasEl) {
            fabricCanvas.upperCanvasEl.addEventListener('contextmenu', handleContextMenu)
        }

        return () => {
            fabricCanvas.off('mouse:down', handleDown)
            fabricCanvas.off('mouse:up', handleUp)
            fabricCanvas.off('selection:cleared', handleSelectionCleared)
            if (fabricCanvas.upperCanvasEl) {
                fabricCanvas.upperCanvasEl.removeEventListener('contextmenu', handleContextMenu)
            }
        }
    }, [fabricCanvas])
    useEffect(() => {
        if (!fabricCanvas) return

        // Only active if Magic Mode
        // We need component state to track the active line being drawn
        let isLassoing = false
        let points: Point[] = []
        let activeLine: any = null

        const handleDown = (opt: any) => {
            const state = useEdgelessStore.getState()
            if (state.activeTool === 'select' && (state.selectionMode === 'magic' || state.selectionMode === 'free')) {
                isLassoing = true
                points = []
                const ptr = fabricCanvas.getScenePoint(opt.e)
                points.push(ptr)

                // Create visual line
                // We use a Polyline for preview
                activeLine = new fabric.Polyline(points, {
                    stroke: 'hsl(var(--primary))',
                    strokeWidth: 2,
                    strokeDashArray: [2, 4],
                    strokeLineCap: 'round',
                    fill: 'transparent',
                    selectable: false,
                    evented: false,
                    opacity: 0.8
                })
                fabricCanvas.add(activeLine)
            }
        }

        const handleMove = (opt: any) => {
            if (!isLassoing || !activeLine) return
            const ptr = fabricCanvas.getScenePoint(opt.e)
            points.push(ptr)
            activeLine.set({ points: [...points] })
            fabricCanvas.requestRenderAll()
        }

        const handleUp = () => {
            if (!isLassoing) return
            isLassoing = false

            if (activeLine) {
                fabricCanvas.remove(activeLine)
                activeLine = null
            }

            if (points.length < 5) return // Too small

            // 1. Create a Polygon for "Inside" check
            const polygon = new fabric.Polygon(points, {})

            // 2. Buffer Logic: "Goes a pixel outside"
            const objects = fabricCanvas.getObjects()
            const toSelect: any[] = []
            const buffer = 10 // 10px tolerance

            objects.forEach(obj => {
                if (!obj.selectable && obj.type !== 'path' && obj.type !== 'group') return
                if (obj === activeLine) return

                // Check A: Centroid contained (Classic Lasso)
                if (polygon.containsPoint(obj.getCenterPoint())) {
                    toSelect.push(obj)
                    return
                }

                // Check B: Proper Intersection (Touching)
                if (polygon.intersectsWithObject(obj)) {
                    toSelect.push(obj)
                    return
                }

                // Check C: Buffer / Near Miss
                const rect = obj.getBoundingRect()
                const tl = new Point(rect.left - buffer, rect.top - buffer)
                const br = new Point(rect.left + rect.width + buffer, rect.top + rect.height + buffer)

                if (polygon.intersectsWithRect(tl, br)) {
                    toSelect.push(obj)
                }
            })

            if (toSelect.length > 0) {
                // UNLOCK SELECTED OBJECTS so they can be moved/grouped
                toSelect.forEach(obj => {
                    obj.selectable = true
                    obj.evented = true
                })

                const sel = new fabric.ActiveSelection(toSelect, { canvas: fabricCanvas })
                fabricCanvas.setActiveObject(sel)
                fabricCanvas.requestRenderAll()

                fabricCanvas.requestRenderAll()

                console.log('Lasso selection made, switching to grab mode');
                // Auto-switch to Move Mode (Lasso matches Free)
                useEdgelessStore.getState().setSelectionMode('grab');

                // Auto-switch to Move Mode (Lasso matches Free)
                // We stay in 'select' tool, 'free' mode, but now we have a selection.
                // The selection itself handles the dragging/resizing.

                // IMPORTANT: When selection is cleared, we must re-lock them?
                // Fabric's 'selection:cleared' event should handle that.
                // We need to add a listener for that.
            }

            points = []
        }

        const handleSelectionCleared = (e: any) => {
            // When selection is cleared, re-lock everything if we are in a locking mode (which we are if we used lasso)
            const objs = e.deselected || []
            objs.forEach((obj: any) => {
                obj.selectable = false
                obj.evented = false
            })
        }

        fabricCanvas.on('mouse:down', handleDown)
        fabricCanvas.on('mouse:move', handleMove)
        fabricCanvas.on('mouse:up', handleUp)
        fabricCanvas.on('selection:cleared', handleSelectionCleared)

        return () => {
            fabricCanvas.off('mouse:down', handleDown)
            fabricCanvas.off('mouse:move', handleMove)
            fabricCanvas.off('mouse:up', handleUp)
            fabricCanvas.off('selection:cleared', handleSelectionCleared)
        }
    }, [fabricCanvas]) // We read store state inside handlers to avoid re-bind loops

    // --- Eraser & Cursor Tracking ---
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
    const isErasingRef = useRef(false)

    // Track cursor via native DOM events for reliable display
    useEffect(() => {
        if (activeTool !== 'eraser') {
            setCursorPos({ x: -100, y: -100 })
            return
        }

        const handleNativeMouseMove = (e: MouseEvent) => {
            setCursorPos({ x: e.clientX, y: e.clientY })
        }

        const handleNativeTouchMove = (e: TouchEvent) => {
            if (e.touches[0]) {
                setCursorPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
            }
        }

        window.addEventListener('mousemove', handleNativeMouseMove)
        window.addEventListener('touchmove', handleNativeTouchMove)

        return () => {
            window.removeEventListener('mousemove', handleNativeMouseMove)
            window.removeEventListener('touchmove', handleNativeTouchMove)
        }
    }, [activeTool])

    useEffect(() => {
        if (!fabricCanvas) return

        // Helper: Sample points along a quadratic bezier curve
        const sampleQuadratic = (p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, steps = 10) => {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
                const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
                points.push({ x, y });
            }
            return points;
        };

        const handleDown = (opt: any) => {
            if (activeTool === 'eraser' && mode === 'draw') {
                isErasingRef.current = true
                doErase(opt)
            }
        }

        const handleUp = () => {
            isErasingRef.current = false
        }

        const doErase = (opt: any) => {
            const e = opt.e;
            const clientX = e.clientX || e.touches?.[0]?.clientX;
            const clientY = e.clientY || e.touches?.[0]?.clientY;
            if (clientX) setCursorPos({ x: clientX, y: clientY });

            if (activeTool !== 'eraser' || mode !== 'draw' || !isErasingRef.current) return;

            const pointer = fabricCanvas.getScenePoint(e);
            // Visual cursor has 3px border, so actual visible radius is (width/2 - 1.5px)
            // Use exactly the visible circle size for precision erasing
            const r = (useEdgelessStore.getState().eraserWidth / 2) - 1.5;


            const objects = [...fabricCanvas.getObjects()];

            const toRemove: fabric.Object[] = [];
            const toAdd: fabric.Object[] = [];

            // Helper: Split quadratic bezier at t
            const splitQuadAt = (p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, t: number) => {
                const q0 = { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) };
                const q1 = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                const r = { x: q0.x + t * (q1.x - q0.x), y: q0.y + t * (q1.y - q0.y) };
                return {
                    left: { p0, p1: q0, p2: r },
                    right: { p0: r, p1: q1, p2 }
                };
            };

            // Helper: Point on quadratic at t
            const quadAt = (p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, t: number) => {
                const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
                const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
                return { x, y };
            };

            for (const obj of objects) {
                if (!obj.visible) continue;
                if (obj.type !== 'path') {
                    const bounds = obj.getBoundingRect();
                    if (pointer.x >= bounds.left - r && pointer.x <= bounds.left + bounds.width + r &&
                        pointer.y >= bounds.top - r && pointer.y <= bounds.top + bounds.height + r) {
                        toRemove.push(obj);
                    }
                    continue;
                }

                const path = obj as fabric.Path;
                const pathData = path.path;
                if (!pathData || pathData.length < 2) continue;

                // For each path, we'll build new path commands, splitting where eraser touches
                const newPaths: any[][] = [];
                let currentPath: any[] = [];
                let currentPt = { x: 0, y: 0 };
                let pathModified = false;

                for (let i = 0; i < pathData.length; i++) {
                    const cmd = pathData[i];
                    const type = cmd[0] as string;

                    if (type === 'M') {
                        // If we have accumulated commands, save them
                        if (currentPath.length >= 2) {
                            newPaths.push([...currentPath]);
                        }
                        currentPt = { x: cmd[1] as number, y: cmd[2] as number };
                        currentPath = [['M', currentPt.x, currentPt.y]];
                    } else if (type === 'Q') {
                        const ctrlPt = { x: cmd[1] as number, y: cmd[2] as number };
                        const endPt = { x: cmd[3] as number, y: cmd[4] as number };

                        // Sample finely to find intersection regions
                        const samples = 50;
                        let lastInside = Math.hypot(currentPt.x - pointer.x, currentPt.y - pointer.y) < r;
                        let entryT = -1, exitT = -1;

                        for (let s = 1; s <= samples; s++) {
                            const t = s / samples;
                            const pt = quadAt(currentPt, ctrlPt, endPt, t);
                            const inside = Math.hypot(pt.x - pointer.x, pt.y - pointer.y) < r;

                            if (!lastInside && inside && entryT < 0) {
                                entryT = (s - 1) / samples;
                            }
                            if (lastInside && !inside) {
                                exitT = s / samples;
                            }
                            lastInside = inside;
                        }

                        // Check if entirely inside
                        const startInside = Math.hypot(currentPt.x - pointer.x, currentPt.y - pointer.y) < r;
                        const endInside = Math.hypot(endPt.x - pointer.x, endPt.y - pointer.y) < r;

                        if (startInside && endInside && entryT < 0) {
                            // Entire segment is erased
                            pathModified = true;
                            if (currentPath.length >= 2) {
                                newPaths.push([...currentPath]);
                            }
                            currentPath = [];
                            currentPt = endPt;
                        } else if (entryT >= 0 || exitT >= 0) {
                            // Partial erase - split the curve
                            pathModified = true;

                            if (entryT >= 0 && entryT > 0.01) {
                                // Keep part before entry
                                const split = splitQuadAt(currentPt, ctrlPt, endPt, entryT);
                                if (currentPath.length === 0) {
                                    currentPath.push(['M', currentPt.x, currentPt.y]);
                                }
                                currentPath.push(['Q', split.left.p1.x, split.left.p1.y, split.left.p2.x, split.left.p2.y]);
                                newPaths.push([...currentPath]);
                                currentPath = [];
                            } else if (currentPath.length >= 2) {
                                newPaths.push([...currentPath]);
                                currentPath = [];
                            }

                            if (exitT >= 0 && exitT < 0.99) {
                                // Keep part after exit
                                const split = splitQuadAt(currentPt, ctrlPt, endPt, exitT);
                                currentPath = [['M', split.right.p0.x, split.right.p0.y]];
                                currentPath.push(['Q', split.right.p1.x, split.right.p1.y, split.right.p2.x, split.right.p2.y]);
                            }

                            currentPt = endPt;
                        } else {
                            // No intersection, keep as is
                            if (currentPath.length === 0) {
                                currentPath.push(['M', currentPt.x, currentPt.y]);
                            }
                            currentPath.push(['Q', ctrlPt.x, ctrlPt.y, endPt.x, endPt.y]);
                            currentPt = endPt;
                        }
                    } else if (type === 'L') {
                        const endPt = { x: cmd[1] as number, y: cmd[2] as number };
                        // Simple line - check if it intersects
                        let hit = false;
                        for (let t = 0; t <= 20; t++) {
                            const px = currentPt.x + (endPt.x - currentPt.x) * (t / 20);
                            const py = currentPt.y + (endPt.y - currentPt.y) * (t / 20);
                            if (Math.hypot(px - pointer.x, py - pointer.y) < r) {
                                hit = true;
                                break;
                            }
                        }
                        if (hit) {
                            pathModified = true;
                            if (currentPath.length >= 2) {
                                newPaths.push([...currentPath]);
                            }
                            currentPath = [];
                        } else {
                            if (currentPath.length === 0) {
                                currentPath.push(['M', currentPt.x, currentPt.y]);
                            }
                            currentPath.push(['L', endPt.x, endPt.y]);
                        }
                        currentPt = endPt;
                    } else if (type === 'C') {
                        const endPt = { x: cmd[5] as number, y: cmd[6] as number };
                        // Cubic - check if it intersects (simplified)
                        let hit = false;
                        for (let t = 0; t <= 20; t++) {
                            const tt = t / 20;
                            const px = currentPt.x + (endPt.x - currentPt.x) * tt;
                            const py = currentPt.y + (endPt.y - currentPt.y) * tt;
                            if (Math.hypot(px - pointer.x, py - pointer.y) < r) {
                                hit = true;
                                break;
                            }
                        }
                        if (hit) {
                            pathModified = true;
                            if (currentPath.length >= 2) {
                                newPaths.push([...currentPath]);
                            }
                            currentPath = [];
                        } else {
                            if (currentPath.length === 0) {
                                currentPath.push(['M', currentPt.x, currentPt.y]);
                            }
                            currentPath.push([...cmd]);
                        }
                        currentPt = endPt;
                    }
                }

                // Final accumulated path
                if (currentPath.length >= 2) {
                    newPaths.push(currentPath);
                }

                if (pathModified) {
                    toRemove.push(obj);
                    for (const newCmds of newPaths) {
                        if (newCmds.length >= 2) {
                            try {
                                const newP = new fabric.Path(newCmds, {
                                    stroke: path.stroke,
                                    strokeWidth: path.strokeWidth,
                                    strokeLineCap: path.strokeLineCap,
                                    strokeLineJoin: path.strokeLineJoin,
                                    fill: undefined,
                                });
                                toAdd.push(newP);
                            } catch (e) { /* skip */ }
                        }
                    }
                }
            }

            if (toRemove.length > 0 || toAdd.length > 0) {
                toRemove.forEach(o => fabricCanvas.remove(o));
                toAdd.forEach(p => fabricCanvas.add(p));
                fabricCanvas.requestRenderAll();
            }
        };

        const handleMove = (opt: any) => {
            const e = opt.e;
            const clientX = e.clientX || e.touches?.[0]?.clientX;
            const clientY = e.clientY || e.touches?.[0]?.clientY;
            if (clientX && activeTool === 'eraser') {
                setCursorPos({ x: clientX, y: clientY });
            }

            if (isErasingRef.current) {
                doErase(opt);
            }
        };

        const handleContextMenu = (opt: any) => {
            opt.e.preventDefault();
            const target = opt.target;

            // If clicked on empty space, we might want a global menu?
            // For now, only objects.
            setTimeout(() => { // small delay to allow selection update
                const activeObj = fabricCanvas.getActiveObject();
                if (activeObj) {
                    // Get object data
                    const data = (activeObj as any).data || {};
                    const id = data.id || activeObj.name; // Fallback

                    if (id) {
                        useContextMenuStore.getState().openMenu(
                            opt.e.clientX,
                            opt.e.clientY,
                            id,
                            'canvas-object',
                            { ...data, type: (activeObj as any).type } // pass all visual props if possible
                        );
                    }
                }
            }, 10);
        };

        // Fabric "contextmenu" event is not standard, use 'mouse:down' with button checks?
        // Fabric handles right click as 'mouse:down' with button: 3.
        // But native contextmenu event is also fired.
        // Let's attach to the wrapper div or use fabric's internal handling if available?
        // Actually, preventing default on the container/canvas is best.

        // Fabric doesn't expose 'contextmenu' event directly in all versions.
        // We can add a standard DOM listener to the canvas element.
        const canvasEl = fabricCanvas.getElement(); // This is the UPPER canvas
        const upperCanvas = fabricCanvas.getSelectionElement();

        upperCanvas.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            // We need to find what was clicked. Fabric provides `findTarget`.
            const pointer = fabricCanvas.getPointer(e);

            // Fabric 6/7 api might differ slightly for findTarget.
            // But let's rely on selection: The user usually right clicks AFTER selecting or right click SELECTS.
            // Right click usually doesn't select in Fabric by default.
            // We should manually check target.

            const target = fabricCanvas.findTarget(e, false);
            if (target) {
                fabricCanvas.setActiveObject(target);
                fabricCanvas.requestRenderAll();

                const data = (target as any).data || {};
                useContextMenuStore.getState().openMenu(
                    e.clientX,
                    e.clientY,
                    data.id || (target as any).name,
                    'canvas-object',
                    { ...data, type: target.type }
                );
            }
        });

        fabricCanvas.on('mouse:down', handleDown)
        fabricCanvas.on('mouse:up', handleUp)
        fabricCanvas.on('mouse:move', handleMove)

        return () => {
            // Cleanup if we could removeEventListener easily... 
            // upperCanvas ref might change but effect depends on fabricCanvas which changes rarely.
            fabricCanvas.off('mouse:move', handleMove)
            fabricCanvas.off('mouse:down', handleDown)
            fabricCanvas.off('mouse:up', handleUp)
        }
    }, [fabricCanvas, activeTool, mode])

    // Monitor canvas changes for history (enables auto-save via historyStack)
    useEffect(() => {
        if (!fabricCanvas) return
        const handleChange = () => {
            const json = JSON.stringify(fabricCanvas.toJSON())
            pushHistory(json)
        }

        // Track all types of changes for auto-save
        fabricCanvas.on('object:added', handleChange)
        fabricCanvas.on('object:removed', handleChange)
        fabricCanvas.on('object:modified', (e) => {
            handleChange()

            // Handle External Sync
            if (onObjectModified) {
                const target = e.target as any
                if (target) {
                    // If it's a group, we might need to handle each object, but for now let's assume single object or ActiveSelection handling later
                    // Fabric's ActiveSelection doesn't always have data.id directly on it if it's a temporary group.
                    // But if it's a single object:
                    if (target.data?.id) {
                        onObjectModified(target.data.id, {
                            x: target.left,
                            y: target.top,
                            width: target.getScaledWidth(),
                            height: target.getScaledHeight(),
                            // Fabric uses scaleX/scaleY, but our store/DB might expect width/height at scale=1 or explicit scale
                            // Let's send what we can.
                        })
                    }
                }
            }
        })
        fabricCanvas.on('path:created', handleChange)

        return () => {
            fabricCanvas.off('object:added', handleChange)
            fabricCanvas.off('object:removed', handleChange)
            fabricCanvas.off('object:modified', handleChange)
            fabricCanvas.off('path:created', handleChange)
        }
    }, [fabricCanvas, pushHistory])

    // Shortcuts: Ctrl+Z (Undo), Ctrl+X (Redo)
    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault()
                const json = undo()
                if (json && fabricCanvas) {
                    fabricCanvas.loadFromJSON(JSON.parse(json), () => {
                        fabricCanvas.requestRenderAll()
                    })
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
                e.preventDefault()
                const json = redo()
                if (json && fabricCanvas) {
                    fabricCanvas.loadFromJSON(JSON.parse(json), () => {
                        fabricCanvas.requestRenderAll()
                    })
                }
            }
        }
        window.addEventListener('keydown', handleDown)
        return () => window.removeEventListener('keydown', handleDown)
    }, [fabricCanvas, undo, redo])

    // Shortcuts: Ctrl+Z  // Handle Delete/Backspace key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // const activeElement = document.activeElement as HTMLElement;
                // if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
                //     return; // Ignore if typing in an input
                // }

                const activeObjects = fabricCanvas?.getActiveObjects();
                if (activeObjects && activeObjects.length > 0) {
                    e.preventDefault();
                    activeObjects.forEach((obj: any) => {
                        if (obj.data?.id) {
                            removeElement(obj.data.id);
                        }
                    });
                    fabricCanvas?.discardActiveObject();
                    fabricCanvas?.requestRenderAll();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [fabricCanvas, removeElement]);

    // Gestures: 2-finger Pan, Pinch Zoom, 2-finger Undo, 3-finger Redo
    useEffect(() => {
        if (!fabricCanvas) return

        let fingers = 0
        let isPanning = false
        let lastCenter: { x: number, y: number } | null = null
        let lastDistance: number | null = null
        let startFingers = 0
        let hasMoved = false

        // Helper to get center of touches
        const getCenter = (touches: TouchList) => {
            if (touches.length < 2) return null
            const t1 = touches[0]
            const t2 = touches[1]
            return {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            }
        }

        // Helper to get distance between two touches
        const getDistance = (touches: TouchList) => {
            if (touches.length < 2) return null
            const t1 = touches[0]
            const t2 = touches[1]
            return Math.sqrt(
                Math.pow(t2.clientX - t1.clientX, 2) +
                Math.pow(t2.clientY - t1.clientY, 2)
            )
        }

        const handleTouchStart = (e: TouchEvent) => {
            fingers = e.touches.length
            startFingers = fingers
            hasMoved = false

            if (fingers === 2) {
                isPanning = true
                lastCenter = getCenter(e.touches)
                lastDistance = getDistance(e.touches)
                // Disable selection/drawing while panning
                fabricCanvas.selection = false
                fabricCanvas.isDrawingMode = false
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (fingers === 2 && isPanning && lastCenter) {
                const newCenter = getCenter(e.touches)
                const newDistance = getDistance(e.touches)

                if (newCenter && newDistance && lastDistance) {
                    const dx = newCenter.x - lastCenter.x
                    const dy = newCenter.y - lastCenter.y

                    // Pinch zoom calculation
                    const scale = newDistance / lastDistance

                    // Threshold to consider it a move/zoom
                    if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || Math.abs(scale - 1) > 0.01 || hasMoved) {
                        hasMoved = true

                        const vpt = fabricCanvas.viewportTransform
                        if (vpt) {
                            // Apply zoom centered on pinch point
                            if (Math.abs(scale - 1) > 0.005) {
                                let zoom = fabricCanvas.getZoom() * scale
                                if (zoom > 20) zoom = 20
                                if (zoom < 0.1) zoom = 0.1

                                // Zoom to pinch center
                                const rect = canvasContainer?.getBoundingClientRect()
                                const offsetX = newCenter.x - (rect?.left || 0)
                                const offsetY = newCenter.y - (rect?.top || 0)
                                fabricCanvas.zoomToPoint(new Point(offsetX, offsetY), zoom)
                            }

                            // Apply pan
                            vpt[4] += dx
                            vpt[5] += dy
                            fabricCanvas.requestRenderAll()
                            setViewport({ x: vpt[4], y: vpt[5], zoom: fabricCanvas.getZoom() })
                        }

                        lastCenter = newCenter
                        lastDistance = newDistance
                        e.preventDefault() // Prevent native scroll
                    }
                }
            }
        }

        const handleTouchEnd = (e: TouchEvent) => {
            // Check for Taps (Undo/Redo) if NOT moved
            if (!hasMoved) {
                if (startFingers === 2) {
                    const json = undo()
                    if (json && fabricCanvas) fabricCanvas.loadFromJSON(JSON.parse(json), () => fabricCanvas.requestRenderAll())
                }
                if (startFingers === 3) {
                    const json = redo()
                    if (json && fabricCanvas) fabricCanvas.loadFromJSON(JSON.parse(json), () => fabricCanvas.requestRenderAll())
                }
            }

            // Reset
            if (e.touches.length < 2) {
                isPanning = false
                lastCenter = null

                // Restore state
                if (mode === 'draw') {
                    fabricCanvas.isDrawingMode = true
                } else {
                    fabricCanvas.selection = true
                }
            }
            fingers = e.touches.length
        }

        const canvasContainer = fabricCanvas.getElement().parentElement
        if (canvasContainer) {
            canvasContainer.addEventListener('touchstart', handleTouchStart, { passive: false })
            canvasContainer.addEventListener('touchmove', handleTouchMove, { passive: false })
            canvasContainer.addEventListener('touchend', handleTouchEnd)
        }

        return () => {
            if (canvasContainer) {
                canvasContainer.removeEventListener('touchstart', handleTouchStart)
                canvasContainer.removeEventListener('touchmove', handleTouchMove)
                canvasContainer.removeEventListener('touchend', handleTouchEnd)
            }
        }
    }, [fabricCanvas, undo, redo, mode])

    // Resize Handler
    useEffect(() => {
        if (fabricCanvas) {
            fabricCanvas.setDimensions({ width, height })
        }
    }, [width, height, fabricCanvas])

    // Load PDF Test 
    // This would normally come from props or route
    useEffect(() => {
        // Mock load
        const load = async () => {
            // If we had a URL...
        }
        load()
    }, [])

    const fileInputRef = useRef<HTMLInputElement>(null)

    // 4. Handle Paste
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData('text')
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                // Create Embed
                const { x, y } = viewPort
                addElement({
                    type: 'embed-web',
                    x: -x + 100, // naive center
                    y: -y + 100,
                    width: 400,
                    height: 300,
                    data: { url: text },
                })
                useEdgelessStore.setState({ activeTool: 'select' })
            }
        }
        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [viewPort, addElement])

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const url = URL.createObjectURL(file)
        const { x, y, zoom } = viewPort

        const isPdf = file.type === 'application/pdf'

        addElement({
            type: isPdf ? 'pdf-page' : 'image',
            x: -x / zoom + 100,
            y: -y / zoom + 100,
            width: isPdf ? 600 : 400,
            height: isPdf ? 800 : 300,
            data: {
                src: url,
            }
        })

        useEdgelessStore.setState({ activeTool: 'select' })
    }

    // 5. Handle pkm:add-widget (Drag & Drop from Sidebar)
    return (
        <div
            className={`relative w-full h-full overflow-hidden ${className || ''}`}
            ref={setRefs}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onContextMenu={(e) => {
                // FORCE Deselect on Right Click (Native Override)
                e.preventDefault()
                // Only deselect if we are clicking the canvas/background, not dragging an overlay? 
                // Using fabricCanvas reference from closure
                if (fabricCanvas) {
                    fabricCanvas.discardActiveObject()
                    fabricCanvas.requestRenderAll()
                }
            }}
        >
            {/* Upload Button */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button
                    className="p-2 bg-black border border-white/20 rounded-md shadow hover:bg-white/10 transition-colors text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Image/PDF"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleUpload}
                    accept="image/*,application/pdf"
                />
            </div>

            {/* 1. Fabric Canvas (Base Layer) */}
            < canvas ref={canvasEl} />

            {/* Fixed Mode Page Boundary Indicator (Visual Only) */}
            {
                (() => {
                    if (canvasConfig.mode === 'edgeless') return null

                    const width = canvasConfig.mode === 'desktop-8k' ? 7680 : 4320
                    const height = canvasConfig.mode === 'desktop-8k' ? 4320 : 9360

                    const zoom = viewPort.zoom
                    const panX = viewPort.x
                    const panY = viewPort.y

                    return (
                        <div
                            className="absolute border-4 border-dashed border-primary/20 pointer-events-none z-0"
                            style={{
                                left: panX,
                                top: panY,
                                width: width * zoom,
                                height: height * zoom,
                                transformOrigin: 'top left'
                            }}
                        >
                            <div className="absolute -top-6 left-0 text-xs text-muted-foreground font-mono">
                                {canvasConfig.mode === 'desktop-8k' ? '8k desktop (7680x4320)' : '8k iphone (4320x9360)'}
                            </div>
                        </div>
                    )
                })()
            }

            {/* 2. React Overlay Layer (for Embeds & PDF Rendering) */}
            {
                fabricCanvas && elements.map((el: any) => {
                    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0]
                    const zoom = vpt[0]
                    const panX = vpt[4]
                    const panY = vpt[5]

                    const screenX = el.x * zoom + panX
                    const screenY = el.y * zoom + panY
                    const screenW = el.width * zoom
                    const screenH = el.height * zoom

                    // FIX: If selected, disable pointer events on HTML overlay to allow Fabric Drag/Resize
                    const isSelected = selectedIds.has(el.id)
                    const bgPointerEvents = isSelected ? 'pointer-events-none select-none' : 'pointer-events-auto'

                    if (el.type === 'pdf-page') {
                        return (
                            <div
                                key={el.id}
                                className={`absolute bg-[#090909] border border-white/10 shadow-lg ${bgPointerEvents}`}
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <PdfElement element={el} pdfDocument={pdfDoc} />
                            </div>
                        )
                    }

                    if (el.type === 'image') {
                        return (
                            <div
                                key={el.id}
                                className="absolute shadow-lg pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <img src={el.data?.src || el.data?.url} className="w-full h-full object-cover" draggable={false} />
                            </div>
                        )
                    }

                    if (el.type.startsWith('embed')) {
                        return (
                            <div
                                key={el.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <EmbedElement element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'link-card') {
                        return (
                            <div
                                key={el.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <LinkElement element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'record-node') {
                        return (
                            <div
                                key={el.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <RecordNodeElement element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'database-card') {
                        // Expect data to contain row data and collection info
                        return (
                            <div
                                key={el.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <CanvasCard
                                    data={el.data.row}
                                    collection={el.data.collection}
                                    fields={el.data.fields || []}
                                    layout={{ x: 0, y: 0, width: el.width, height: el.height }} // handled by wrapper
                                    isSelected={false} // Fabric selection handles visual border usually, or we can pass store selection
                                    className="w-full h-full"
                                    onUpdate={el.data.onUpdate} // This would need to be passed through or handled via store update > sync
                                />
                            </div>
                        )
                    }

                    if (el.type === 'portal') {
                        return (
                            <div
                                key={el.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <PortalElement element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'eternal-flame') {
                        return (
                            <div key={el.id} className="absolute pointer-events-auto" style={{ left: screenX, top: screenY, width: screenW, height: screenH }}>
                                <EternalFlame element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'contact-card') {
                        return (
                            <div
                                key={el.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: screenW,
                                    height: screenH,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <ContactElement element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'offering-drop') {
                        return (
                            <div key={el.id} className="absolute pointer-events-auto" style={{ left: screenX, top: screenY, width: screenW, height: screenH }}>
                                <OfferingDrop element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'shopping-card') {
                        return (
                            <div key={el.id} className="absolute pointer-events-auto" style={{ left: screenX, top: screenY, width: screenW, height: screenH }}>
                                <ShoppingCard element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'gold-pile') {
                        return (
                            <div key={el.id} className="absolute pointer-events-auto" style={{ left: screenX, top: screenY, width: screenW, height: screenH }}>
                                <GoldPile element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'floating-reminder') {
                        return (
                            <div key={el.id} className="absolute pointer-events-auto" style={{ left: screenX, top: screenY, width: screenW, height: screenH }}>
                                <FloatingReminder element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'tier-list') {
                        return (
                            <div key={el.id} className="absolute pointer-events-auto" style={{ left: screenX, top: screenY, width: screenW, height: screenH }}>
                                <TierListElement element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'sleep-ring') {
                        return (
                            <div key={el.id} className="absolute pointer-events-auto" style={{ left: screenX, top: screenY, width: screenW, height: screenH }}>
                                <SleepRing element={el} />
                            </div>
                        )
                    }

                    if (el.type === 'connector') {
                        return <ConnectorElement key={el.id} element={el} />
                    }

                    if (el.type === 'smart-text') {
                        return (
                            <div
                                key={el.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: screenX,
                                    top: screenY,
                                    width: el.width || 300,
                                    height: 'auto',
                                    minHeight: 50,
                                    zIndex: 10
                                }}
                            >
                                <SmartTextElement element={el} />
                            </div>
                        )
                    }

                    return null
                })
            }

            {/* Eraser Cursor Indicator - Outline Ring */}
            {
                activeTool === 'eraser' && (
                    <div
                        className="pointer-events-none fixed rounded-full"
                        style={{
                            top: cursorPos.y - (useEdgelessStore.getState().eraserWidth / 2),
                            left: cursorPos.x - (useEdgelessStore.getState().eraserWidth / 2),
                            width: useEdgelessStore.getState().eraserWidth,
                            height: useEdgelessStore.getState().eraserWidth,
                            display: cursorPos.x > -50 ? 'block' : 'none',
                            zIndex: 99999,
                            boxSizing: 'border-box',
                            border: '3px solid #f5b214',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                    />
                )
            }
        </div >
    )
}
