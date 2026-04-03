import React, { useRef, useEffect, useMemo, useState, useCallback, memo } from 'react'
import * as fabric from 'fabric'
import { useEdgelessStore, useViewport, useElementIds, useElement, useActiveTool, useSelectionMode } from '../store'
import type { EdgelessElement } from '../store'
import { useCanvasSafe } from '../hooks/use-canvas-safe'
import { PdfElement } from './elements/PdfElement'
import { EmbedElement } from './elements/EmbedElement'
import { LinkElement } from './elements/LinkElement'
import { RecordNodeElement } from './elements/RecordNodeElement'
import { CanvasCard } from '@/features/databases/components/canvas/CanvasCard'
import { PortalElement } from './elements/PortalElement'
import { EternalFlame } from './elements/EternalFlame'
import { ContactElement } from './elements/ContactElement'
import { OfferingDrop } from './elements/OfferingDrop'
import { ShoppingCard } from './elements/ShoppingCard'
import { GoldPile } from './elements/GoldPile'
import { FloatingReminder } from './elements/FloatingReminder'
import { TierListElement } from './elements/TierListElement'
import { SleepRing } from './elements/SleepRing'
import { ConnectorElement } from './elements/ConnectorElement'
import { SmartTextElement } from './elements/SmartTextElement'
import { WidgetElement } from './elements/WidgetElement'
import { useContextMenuStore } from '@/components/ui/context-menu-store'
import { useCanvasEvents } from '../hooks/use-canvas-events'
import { useGestureManager } from '@/hooks/use-gesture-manager'
import { buildOverlaySpatialIndex } from '../spatial/spatial-index'
import { useDrawingTools } from '../hooks/use-drawing-tools'
import { applyOp, compactOplog, resolveConflicts } from '../storage/oplog'

// --- Canvas element pooling (reduces GC and keeps redraws snappy) ---
const canvasPool: HTMLCanvasElement[] = []

function borrowCanvas(): HTMLCanvasElement {
  const c = canvasPool.pop() || document.createElement('canvas')
  c.width = 0
  c.height = 0
  return c
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  canvas.width = 0
  canvas.height = 0
  canvasPool.push(canvas)
}

// ─── Brush / Eraser cursor (SVG data-URL) ───────────────────────────────────────
// Renders a thin circle outline that rings the pointer tip.
// Using a CSS custom cursor is the only approach that works correctly in Electron
// AppImage builds — it bypasses all parent-transform / coordinate-space issues.
function makeBrushCursor(px: number): string {
  const d = Math.max(4, Math.round(px))
  // Add 2px padding on each side so the 1.5px stroke is never clipped
  const sz = d + 4
  const c = sz / 2
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}'>`
    + `<circle cx='${c}' cy='${c}' r='${d / 2}' fill='none' stroke='rgba(255,255,255,0.85)' stroke-width='1.5'/>`
    + `</svg>`
  const hotspot = Math.round(c)
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot} ${hotspot}, crosshair`
}

// ─── Custom Hand Cursor for Panning ─────────────────────────────────────────────
// Small white hand cursor (20x20px) with hotspot at center (10,10)
const HAND_CURSOR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-3.3 0-6.4-2.5-7.7-5.6l-1.3-3.1A2 2 0 0 1 3 11.5V9a2 2 0 0 1 2-2v0"/></svg>`)}`;
const getHandCursor = (grabbing = false) => `url("${HAND_CURSOR_SVG}") 10 10, ${grabbing ? 'grabbing' : 'grab'}`;

// ─── Memoized per-element wrapper ─────────────────────────────────────────────
// Each element subscribes to its own data via useElement(id).
// Re-renders ONLY when that specific element object changes in the store.

interface CanvasElementProps {
  id: string
  pointerClass: string
  pdfDoc: any
}

const CanvasElement = memo(function CanvasElement({ id, pointerClass, pdfDoc }: CanvasElementProps) {
  const element = useElement(id)
  if (!element) return null

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const data = element.data as Record<string, any>
    useContextMenuStore.getState().openMenu(
      e.clientX, e.clientY,
      element.id, 'canvas-object',
      { ...data, type: element.type, title: data?.title }
    )
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const store = useEdgelessStore.getState()
    const isGrab = store.activeTool === 'select' && store.selectionMode === 'grab'
    if (!isGrab) return
    if (element.locked) return

    e.stopPropagation()
    e.preventDefault()

    store.setSelectedIds(new Set([element.id]))

    const startX = e.clientX
    const startY = e.clientY
    const origX = element.x
    const origY = element.y
    const zoom = store.viewPort.zoom

    const handleMove = (moveE: PointerEvent) => {
      const dx = (moveE.clientX - startX) / zoom
      const dy = (moveE.clientY - startY) / zoom
      useEdgelessStore.getState().updateElement(element.id, { x: origX + dx, y: origY + dy })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transformOrigin: 'top left',
  }

  switch (element.type) {
    case 'pdf-page':
      return (
        <div className={`absolute bg-[#090909] border border-white/10 shadow-lg ${pointerClass}`} style={style}>
          <PdfElement element={element} pdfDocument={pdfDoc} />
        </div>
      )
    case 'image':
      return (
        <div className={`absolute shadow-lg ${pointerClass}`} style={style}>
          <img src={(element.data as any)?.src || (element.data as any)?.url} className="w-full h-full object-cover" draggable={false} />
        </div>
      )
    case 'embed':
    case 'embed-web':
    case 'embed-nocobase':
      return (
        <div
          className={`absolute ${pointerClass}`}
          style={style}
          onContextMenu={handleContextMenu}
          onPointerDown={handlePointerDown}
        >
          <EmbedElement element={element} />
        </div>
      )
    case 'link-card':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <LinkElement element={element} />
        </div>
      )
    case 'record-node':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <RecordNodeElement element={element} />
        </div>
      )
    case 'database-card':
      const dbData = element.data as any
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <CanvasCard
            data={dbData?.row}
            collection={dbData?.collection}
            fields={dbData?.fields || []}
            layout={{ x: 0, y: 0, width: element.width, height: element.height }}
            isSelected={false}
            className="w-full h-full"
            onUpdate={dbData?.onUpdate}
          />
        </div>
      )
    case 'portal':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <PortalElement element={element} />
        </div>
      )
    case 'eternal-flame':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <EternalFlame element={element} />
        </div>
      )
    case 'contact-card':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <ContactElement element={element} />
        </div>
      )
    case 'offering-drop':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <OfferingDrop element={element} />
        </div>
      )
    case 'shopping-card':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <ShoppingCard element={element} />
        </div>
      )
    case 'gold-pile':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <GoldPile element={element} />
        </div>
      )
    case 'floating-reminder':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <FloatingReminder element={element} />
        </div>
      )
    case 'tier-list':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <TierListElement element={element} />
        </div>
      )
    case 'sleep-ring':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <SleepRing element={element} />
        </div>
      )
    case 'connector':
      return <ConnectorElement element={element} />
    case 'smart-text':
      return (
        <div
          className={`absolute ${pointerClass}`}
          style={{
            ...style,
            height: 'auto',
            minHeight: 50,
            zIndex: 10,
          }}
        >
          <SmartTextElement element={element} />
        </div>
      )
    case 'widget':
      return (
        <div
          className={`absolute ${pointerClass}`}
          style={style}
          onContextMenu={handleContextMenu}
          onPointerDown={handlePointerDown}
        >
          <WidgetElement element={element} />
        </div>
      )
    default:
      return null
  }
}, (prev, next) => prev.id === next.id && prev.pointerClass === next.pointerClass && prev.pdfDoc === next.pdfDoc)


// ─── Visible element list (viewport-culled) ────────────────────────────────────

interface OverlayLayerProps {
  pointerClass: string
  pdfDoc: any
}

/** Renders only elements whose IDs are within the current viewport.
 *  The overlay container uses a CSS transform so pan/zoom is handled by the
 *  GPU compositor — no React re-renders needed for viewport movement. */
const OverlayLayer = memo(function OverlayLayer({ pointerClass, pdfDoc }: OverlayLayerProps) {
  const elementIds = useElementIds()
  const elements = useEdgelessStore((s) => s.elements)
  const viewPort = useViewport()

  // Build a lightweight spatial index from the current elements for viewport culling.
  // This recomputes only when the elements array reference changes (add/remove/move).
  const overlaySpatialIndex = useMemo(() => {
    return buildOverlaySpatialIndex(elements)
  }, [elements])

  // Compute visible IDs – we use a strict 20% screen buffer for aggressive virtualization.
  // Nodes outside this buffer are completely unmounted from the DOM.
  const visibleIds = useMemo(() => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080
    // queryViewportIds now handles the 20% buffer calculation internally
    return overlaySpatialIndex.queryViewportIds(
      viewPort.x, viewPort.y, viewPort.zoom,
      screenW, screenH, 0.2
    )
  }, [overlaySpatialIndex, viewPort.x, viewPort.y, viewPort.zoom])

  // True virtualization: only render elements that are within the buffered viewport.
  // This ensures nodes are completely unmounted when off-screen.
  const idsToRender = useMemo(() => {
    return elementIds.filter((id) => visibleIds.has(id))
  }, [elementIds, visibleIds])

  return (
    <>
      {idsToRender.map((id) => (
        <CanvasElement key={id} id={id} pointerClass={pointerClass} pdfDoc={pdfDoc} />
      ))}
    </>
  )
})


// ─── types ──────────────────────────────────────────────────────────────────────

export type HistoryAction =
  | { type: 'add'; obj: fabric.Object }
  | { type: 'remove'; obj: fabric.Object }
  | { type: 'modify'; obj: fabric.Object; before: any; after: any }
  | { type: 'erase'; replacements: { old: fabric.Object; new: fabric.Object | null }[] }

export interface EdgelessCanvasProps {
  onObjectModified?: (e: any) => void
  className?: string
  onLoad?: () => void
  children?: React.ReactNode
}

export function EdgelessCanvas({ onObjectModified: _onObjectModified, className, onLoad, children }: EdgelessCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasEl = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isPanningRef = useRef(false)
  const lastStateChangeRef = useRef<number>(0)
  const pointerStateRef = useRef({
    isPanning: false,
    isPinching: false,
    lastX: 0,
    lastY: 0,
    initialDistance: 0,
    initialZoom: 1,
    pointers: new Map<number, PointerEvent>(),
  })
  
  const viewportRafRef = useRef<number | null>(null)

  // ── Undo / Redo history (O(1) Differential Actions) ──
  const historyRef = useRef<HistoryAction[]>([])
  const redoRef = useRef<HistoryAction[]>([])
  const isLoadingStateRef = useRef(false)

  const lastSaveTimerRef = useRef<number | null>(null)

  const pushHistoryAction = useCallback((action: HistoryAction) => {
    if (isLoadingStateRef.current) return
    historyRef.current.push(action)
    redoRef.current = [] // clear redo on new action
    if (historyRef.current.length > 200) {
      historyRef.current.shift()
    }
  }, [])

  const performUndo = useCallback(() => {
    const action = historyRef.current.pop()
    if (!action) return
    redoRef.current.push(action)

    const fc = useEdgelessStore.getState().fabricCanvas
    if (!fc) return

    isLoadingStateRef.current = true
    
    switch (action.type) {
      case 'add':
        fc.remove(action.obj)
        break
      case 'remove':
        fc.add(action.obj)
        break
      case 'modify':
        action.obj.set(action.before)
        action.obj.setCoords()
        break
      case 'erase':
        action.replacements.forEach(r => {
          if (r.new) fc.remove(r.new)
          fc.add(r.old)
        })
        break
    }
    
    fc.requestRenderAll()
    isLoadingStateRef.current = false
  }, [])

  const performRedo = useCallback(() => {
    const action = redoRef.current.pop()
    if (!action) return
    historyRef.current.push(action)

    const fc = useEdgelessStore.getState().fabricCanvas
    if (!fc) return

    isLoadingStateRef.current = true
    
    switch (action.type) {
      case 'add':
        fc.add(action.obj)
        break
      case 'remove':
        fc.remove(action.obj)
        break
      case 'modify':
        action.obj.set(action.after)
        action.obj.setCoords()
        break
      case 'erase':
        action.replacements.forEach(r => {
          fc.remove(r.old)
          if (r.new) fc.add(r.new)
        })
        break
    }
    
    fc.requestRenderAll()
    isLoadingStateRef.current = false
  }, [])

  // Wire store undo/redo to fabric undo/redo (for gesture taps)
  useEffect(() => {
    const store = useEdgelessStore.getState() as any
    store._fabricUndo = performUndo
    store._fabricRedo = performRedo
  }, [performUndo, performRedo])

  // ── Store subscriptions (granular) ──
  const fabricCanvas = useEdgelessStore((s) => s.fabricCanvas)
  const setFabricCanvas = useEdgelessStore((s) => s.setFabricCanvas)
  const viewPort = useViewport()
  const setViewport = useEdgelessStore((s) => s.setViewport)
  const activeTool = useActiveTool()
  const selectionMode = useSelectionMode()
  const pdfDoc = useEdgelessStore((s) => s.pdfDoc)
  const canvasConfig = useEdgelessStore((s) => s.canvasConfig)
  const mode = useEdgelessStore((s) => s.mode)
  const elementsLength = useEdgelessStore((s) => s.elements.length)

  const { handleDrop } = useCanvasEvents()
  useCanvasSafe()
  
  // Initialize drawing tools (lasso, transform, custom brush/eraser)
  useDrawingTools(fabricCanvas, pushHistoryAction)

  // Pen/eraser settings
  const penWidth = useEdgelessStore((s) => s.penWidth)
  const penColor = useEdgelessStore((s) => s.penColor)
  const penOpacity = useEdgelessStore((s) => s.penOpacity)
  const eraserWidth = useEdgelessStore((s) => s.eraserWidth)
  const eraserOpacity = useEdgelessStore((s) => s.eraserOpacity)
  const stabilizerLevel = useEdgelessStore((s) => s.stabilizerLevel)

  // track last stateful action to decide empty-space two-finger undo
  useEffect(() => {
    lastStateChangeRef.current = Date.now()
  }, [viewPort, elementsLength])

  useGestureManager(
    wrapperRef,
    {
      onTwoFingerTap: (e) => {
        e.stopPropagation()
        performUndo()
      },
      onThreeFingerTap: (e) => {
        e.stopPropagation()
        performRedo()
      },
      onEmptyTwoFingerTap: (e) => {
        const target = e.target as HTMLElement
        const isEmpty = wrapperRef.current === target
        const recentChange = Date.now() - lastStateChangeRef.current < 4000
        if (isEmpty && recentChange) {
          e.stopPropagation()
          performUndo()
        }
      },
    },
    {
      movementTolerance: 10,
      longPressMs: 400,
      doubleTapMs: 280,
      preventDefault: true,
    }
  )

  useEffect(() => {
    if (!canvasEl.current || fabricCanvas) return

    const canvas = new fabric.Canvas(canvasEl.current as HTMLCanvasElement, {
      width: window.innerWidth,
      height: window.innerHeight,
      selection: true,
      preserveObjectStacking: true,
      backgroundVpt: false,
      renderOnAddRemove: true,
      enableRetinaScaling: false,
      enablePointerEvents: true,
      fireRightClick: true,
      stopContextMenu: true,
    })

      // Configure transform controls on all fabric objects
      ; (fabric.Object.prototype as any).transparentCorners = false
      ; (fabric.Object.prototype as any).cornerColor = '#f6b012'
      ; (fabric.Object.prototype as any).cornerStyle = 'circle'
      ; (fabric.Object.prototype as any).cornerSize = 10
      ; (fabric.Object.prototype as any).borderColor = '#f6b012'
      ; (fabric.Object.prototype as any).borderScaleFactor = 1.5
      ; (fabric.Object.prototype as any).padding = 4
      // Rotation control: outside dot with connecting line
      // Ensure controls object exists (Fabric.js v6+ may not have it initialized yet)
      if (!(fabric.Object.prototype as any).controls) {
        (fabric.Object.prototype as any).controls = {}
      }
      // Also ensure controlsUtils is available
      const controlsUtils = (fabric as any).controlsUtils || {}
      ; (fabric.Object.prototype as any).controls.mtr = new fabric.Control({
        x: 0,
        y: -0.5,
        offsetY: -30,
        withConnection: true,
        actionHandler: controlsUtils.rotationWithSnapping,
        cursorStyleHandler: controlsUtils.rotationStyleHandler,
        actionName: 'rotate',
      })

    setFabricCanvas(canvas)
    // Save initial empty canvas state as history baseline
    historyRef.current = [] // O(1) log
    if (onLoad) onLoad()

    const resizeObserver = new ResizeObserver(() => {
      if (wrapperRef.current) {
        canvas.setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight,
        })
      }
    })
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)

    return () => {
      resizeObserver.disconnect()
      canvas.dispose()
      setFabricCanvas(null)
    }
  }, [])
  
  // ── Global hooks for saving and event listener for loading ──
  useEffect(() => {
    if (!fabricCanvas) return;

    // Ensure fabric is globally available for oplog utils
    (window as any).fabric = fabric;

    (window as any).pkmGetCanvasJSON = () => {
      const canvasJson = (fabricCanvas as any).toJSON(['data', 'id', 'name', 'locked', 'selectable', 'evented']);
      const elements = useEdgelessStore.getState().elements;
      return { canvas: canvasJson, elements };
    };
    (window as any).pkmGetCanvasThumbnail = () => {
      try {
        return fabricCanvas.toDataURL({ multiplier: 1, format: 'webp', quality: 0.1 });
      } catch (e) {
        return null;
      }
    };

    const handleLoadOplog = async (e: any) => {
      const { drawingId: id, checkpoint, ops } = e.detail;
      if (id !== useEdgelessStore.getState().drawingId) return;

      isLoadingStateRef.current = true;
      try {
        if (checkpoint?.state) {
        const state = checkpoint.state as any;
        if (state && state.canvas) {
          await fabricCanvas.loadFromJSON(state.canvas);
          // restore overlay elements (widgets, notes, cards, etc.)
          useEdgelessStore.getState().setElements(state.elements || []);
        } else {
          await fabricCanvas.loadFromJSON(state);
        }
      } else {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#050505';
      }

        if (Array.isArray(ops) && ops.length > 0) {
          const compacted = compactOplog(resolveConflicts(ops));
          for (const entry of compacted) {
            await applyOp(fabricCanvas, entry.op);
          }
        }
        
        fabricCanvas.requestRenderAll();
        // Save initial state to history baseline
        historyRef.current = [];
      } catch (err) {
        console.error('[canvas] failed to load drawing from oplog:', err);
      } finally {
        isLoadingStateRef.current = false;
      }
    };

    window.addEventListener('pkm:load-oplog', handleLoadOplog as EventListener);
    
    // Set current drawing ID for recovery
    (window as any).__pkmCurrentDrawingId = useEdgelessStore.getState().drawingId;

    return () => {
      delete (window as any).pkmGetCanvasJSON;
      delete (window as any).pkmGetCanvasThumbnail;
      window.removeEventListener('pkm:load-oplog', handleLoadOplog as EventListener);
      (window as any).__pkmCurrentDrawingId = null;
    };
  }, [fabricCanvas]);

  // Tool Configuration (Drawing / Eraser)
  useEffect(() => {
    if (!fabricCanvas) return

    // Tool logic overrides
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = false;
    fabricCanvas.defaultCursor = 'default';

    if (activeTool === 'pen') {
      fabricCanvas.isDrawingMode = true
      // Apply SVG brush cursor immediately (the useEffect also re-applies on size changes)
      const cursorUrl = makeBrushCursor(penWidth * viewPort.zoom)
      fabricCanvas.freeDrawingCursor = cursorUrl
      fabricCanvas.defaultCursor = cursorUrl
      fabricCanvas.hoverCursor = cursorUrl
      document.body.style.cursor = ''
      document.body.classList.remove('cursor-none')
      // Disable selection on objects during drawing
      fabricCanvas.getObjects().forEach((obj: any) => {
        // Allow selecting path objects even in pen mode so they can be 'edited' (resized/moved)
        if (obj.type === 'path' && obj.globalCompositeOperation !== 'destination-out') {
          obj.set({ selectable: true, evented: true });
        } else {
          obj.set({ selectable: false, evented: false });
        }
      });

      // Custom pressure-sensitive brush
      class PressureSensitivePencilBrush extends (fabric.PencilBrush as any) {
        private pressures: number[] = []
        private baseWidth: number = penWidth
        private pressureEnabled: boolean = useEdgelessStore.getState().pressureEnabled

        // Pressure curve: maps 0-1 pressure to 0-1 output (cubic bezier approximation)
        private applyPressureCurve(pressure: number): number {
          const [x1, y1, x2, y2] = [0.25, 0.1, 0.25, 1.0]
          const t = Math.max(0, Math.min(1, pressure))
          const mt = 1 - t
          return 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t
        }

        onMouseDown(pointer: { x: number; y: number }, options: any) {
          // Capture pressure from the original pointer event
          const pointerEvent = options?.e as PointerEvent | undefined
          const pressure = (pointerEvent?.pressure ?? 0.5) || 0.5
          this.pressures = [pressure]
          this.baseWidth = useEdgelessStore.getState().penWidth
          this.pressureEnabled = useEdgelessStore.getState().pressureEnabled
          super.onMouseDown(pointer, options)
        }

        onMouseMove(pointer: { x: number; y: number }, options: any) {
          // Capture pressure from the original pointer event
          const pointerEvent = options?.e as PointerEvent | undefined
          const pressure = (pointerEvent?.pressure ?? 0.5) || 0.5
          this.pressures.push(pressure)
          super.onMouseMove(pointer, options)
        }

        _render() {
          const ctx = this.canvas.contextTop
          if (!ctx) return

          ctx.beginPath()
          const points = this._points
          if (points.length < 2) return

          this._saveAndTransform(ctx)

          // Draw segments with varying width based on pressure
          for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i]
            const p2 = points[i + 1]
            const pressure1 = this.pressureEnabled ? this.applyPressureCurve(this.pressures[i] ?? 0.5) : 0.5
            const pressure2 = this.pressureEnabled ? this.applyPressureCurve(this.pressures[i + 1] ?? 0.5) : 0.5

            // Average pressure for this segment
            const avgPressure = (pressure1 + pressure2) / 2
            const dynamicWidth = Math.max(0.5, this.baseWidth * avgPressure)

            ctx.beginPath()
            ctx.lineWidth = dynamicWidth
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }

          ctx.restore()
        }

        onMouseUp(options: any) {
          this.pressures = []
          super.onMouseUp(options)
        }

        _reset() {
          this.pressures = []
          super._reset()
        }
      }

      const brush: any = new PressureSensitivePencilBrush()
      brush.canvas = fabricCanvas
      brush.width = penWidth
      // Canvas 2D API doesn't support CSS variables — resolve to computed color
      let resolvedColor = penColor
      if (penColor.startsWith('var(')) {
        const temp = document.createElement('div')
        temp.style.color = penColor
        document.body.appendChild(temp)
        resolvedColor = getComputedStyle(temp).color || '#ffffff'
        document.body.removeChild(temp)
      }
      brush.color = resolvedColor
      brush.opacity = (penOpacity ?? 100) / 100
      brush.decimate = Math.max(1, 8 - (stabilizerLevel || 0))
      fabricCanvas.freeDrawingBrush = brush
    } else if (activeTool === 'eraser') {
      // Eraser uses manual pointer events (use-drawing-tools.ts) for
      // live pixel-by-pixel erasing — no PencilBrush, no visible stroke.
      fabricCanvas.isDrawingMode = false
      fabricCanvas.selection = false
      // SVG cursor applied immediately; useEffect re-applies on size changes
      const cursorUrl = makeBrushCursor(eraserWidth * viewPort.zoom)
      fabricCanvas.defaultCursor = cursorUrl
      fabricCanvas.hoverCursor = cursorUrl
      document.body.style.cursor = ''
      document.body.classList.remove('cursor-none')
      fabricCanvas.getObjects().forEach((obj: any) => {
        obj.set({ selectable: false, evented: false });
      });
      // Clear any residual brush artifacts on contextTop
      const topCtx = (fabricCanvas as any).contextTop as CanvasRenderingContext2D | null
      if (topCtx) topCtx.clearRect(0, 0, fabricCanvas.width || 0, fabricCanvas.height || 0)
    } else if (activeTool === 'lasso' || activeTool === 'transform' || activeTool === 'hand' || activeTool === 'text' || activeTool === 'smart-text' || activeTool === 'select' || activeTool === 'selection') {
      fabricCanvas.isDrawingMode = false;

      if (activeTool === 'lasso') {
        // Lasso: custom overlay for drawing, selection disabled during draw
        fabricCanvas.selection = false;
        fabricCanvas.defaultCursor = 'crosshair';
        // Restore body cursor when not in pen/eraser mode
        document.body.style.cursor = '';
        document.body.classList.remove('cursor-none');
        // Make objects non-interactive during lasso drawing
        fabricCanvas.getObjects().forEach((obj: any) => {
          obj.set({ selectable: false, evented: false });
        });
      } else if (activeTool === 'selection') {
        // Marquee selection: custom overlay for drawing rect
        fabricCanvas.selection = false;
        fabricCanvas.defaultCursor = 'crosshair';
        // Restore body cursor when not in pen/eraser mode
        document.body.style.cursor = '';
        document.body.classList.remove('cursor-none');
        fabricCanvas.getObjects().forEach((obj: any) => {
          obj.set({ selectable: false, evented: false });
        });
      } else if (activeTool === 'transform') {
        // Transform: selection = true so fabric can find targets on click
        // and start drag. Uses bounding-box hit testing (not pixel-level)
        // so thin strokes are easy to click on.
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'default';
        // Restore body cursor when not in pen/eraser mode
        document.body.style.cursor = '';
        document.body.classList.remove('cursor-none');
        fabricCanvas.getObjects().forEach((obj: any) => {
          if (obj.globalCompositeOperation === 'destination-out' || (obj as any)._isEraserPath) {
            obj.set({ selectable: false, evented: false });
          } else {
            obj.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              lockMovementX: false,
              lockMovementY: false,
              lockRotation: false,
              lockScalingX: false,
              lockScalingY: false,
              perPixelTargetFind: false,
            });
          }
        });
        fabricCanvas.requestRenderAll();
      } else if (activeTool === 'hand') {
        fabricCanvas.selection = false;
        // Use a custom hand cursor for better visibility
        fabricCanvas.defaultCursor = getHandCursor(false);
        // Restore body cursor when not in pen/eraser mode
        document.body.style.cursor = '';
        document.body.classList.remove('cursor-none');
      } else if (activeTool === 'text' || activeTool === 'smart-text') {
        fabricCanvas.selection = false;
        fabricCanvas.defaultCursor = 'text';
        // Restore body cursor when not in pen/eraser mode
        document.body.style.cursor = '';
        document.body.classList.remove('cursor-none');
      } else if (activeTool === 'select') {
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'default';
        // Restore body cursor when not in pen/eraser mode
        document.body.style.cursor = '';
        document.body.classList.remove('cursor-none');
        // Make all non-eraser objects selectable, eraser paths always hidden
        fabricCanvas.getObjects().forEach((obj: any) => {
          if (obj.globalCompositeOperation === 'destination-out') {
            obj.set({ selectable: false, evented: false });
          } else {
            obj.set({ selectable: true, evented: true });
          }
        });
      }
    }
  }, [activeTool, fabricCanvas, penWidth, penColor, penOpacity, eraserWidth, eraserOpacity, stabilizerLevel])

  // Spacebar Pan Logic & Pointer-based pan/zoom
  useEffect(() => {
    if (!fabricCanvas) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        performUndo()
        return
      }
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z  or  Ctrl+Y
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault()
        performRedo()
        return
      }

      if (e.key === ' ' && !isPanningRef.current) {
        isPanningRef.current = true
        // Use custom hand cursor for spacebar panning (grabbing variant when actively panning)
        fabricCanvas.defaultCursor = getHandCursor(true)
        fabricCanvas.selection = false
        if (activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'lasso') {
          fabricCanvas.isDrawingMode = false
        }
        fabricCanvas.requestRenderAll()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        isPanningRef.current = false
        // Restore cursor based on active tool
        if (activeTool === 'hand') {
          fabricCanvas.defaultCursor = getHandCursor(false)
        } else {
          fabricCanvas.defaultCursor = 'default'
        }
        // Restore selection state for tools that use it
        if (activeTool === 'select' || activeTool === 'transform') {
          fabricCanvas.selection = true
        }
        if (activeTool === 'pen' || activeTool === 'eraser') {
          fabricCanvas.isDrawingMode = activeTool === 'pen'
          fabricCanvas.selection = false
          // SVG cursor is applied by the brush-cursor useEffect
          document.body.style.cursor = ''
          document.body.classList.remove('cursor-none')
        } else if (activeTool === 'lasso') {
          fabricCanvas.defaultCursor = 'crosshair'
          document.body.style.cursor = ''
          document.body.classList.remove('cursor-none')
        } else {
          // Restore body cursor for other tools
          document.body.style.cursor = ''
          document.body.classList.remove('cursor-none')
        }
        fabricCanvas.requestRenderAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const upperCanvas = fabricCanvas.upperCanvasEl as HTMLCanvasElement | undefined
    if (upperCanvas) {
      upperCanvas.style.touchAction = 'none'
    }

    const scheduleViewport = (vpt: number[]) => {
      if (!vpt) return
      if (viewportRafRef.current) cancelAnimationFrame(viewportRafRef.current)
      viewportRafRef.current = requestAnimationFrame(() => {
        setViewport({ zoom: vpt[0], x: vpt[4], y: vpt[5] })
        viewportRafRef.current = null
      })
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (!fabricCanvas) return
      if (event.ctrlKey || event.metaKey) {
        let zoom = fabricCanvas.getZoom()
        zoom *= 0.999 ** event.deltaY
        zoom = Math.min(Math.max(zoom, 0.01), 20)
        fabricCanvas.zoomToPoint(new fabric.Point(event.offsetX, event.offsetY), zoom)
      } else {
        const vpt = fabricCanvas.viewportTransform
        if (!vpt) return
        vpt[4] -= event.deltaX
        vpt[5] -= event.deltaY
        fabricCanvas.requestRenderAll()
        scheduleViewport(vpt)
      }

      const vpt = fabricCanvas.viewportTransform
      if (vpt) scheduleViewport(vpt)
    }

    const getDistance = (a: PointerEvent, b: PointerEvent) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

    const handlePointerDown = (e: PointerEvent) => {
      // Determine if we should pan: spacebar held, middle-click, alt-click, or hand tool
      const shouldPan = isPanningRef.current || e.button === 1 || e.altKey || activeTool === 'hand'

      // For ALL tools except hand/panning — let fabric.js and useDrawingTools handle events natively.
      // We only intercept when panning.
      if (!shouldPan) {
        // Text tool: create text on click, then let fabric handle it
        if (activeTool === 'text' || activeTool === 'smart-text') {
          const { x: vx, y: vy, zoom } = useEdgelessStore.getState().viewPort;
          const canvasX = (e.clientX - vx) / zoom;
          const canvasY = (e.clientY - vy) / zoom;

          if (activeTool === 'text') {
            // Wait for Varela Round font to load, then create text
            document.fonts.ready.then(() => {
              const textObj = new fabric.Textbox('text', {
                left: canvasX,
                top: canvasY,
                fill: penColor,
                fontSize: useEdgelessStore.getState().textSize || 24,
                fontFamily: 'Varela Round, sans-serif',
                width: 200,
                editable: true,
                selectable: true,
                hasControls: true,
                hasBorders: true,
                lockRotation: false,
              });
              fabricCanvas.add(textObj);
              fabricCanvas.setActiveObject(textObj);
              textObj.enterEditing();
              textObj.selectAll();
              fabricCanvas.requestRenderAll();
            });
          } else if (activeTool === 'smart-text') {
            useEdgelessStore.getState().addElement({
              type: 'smart-text',
              x: canvasX,
              y: canvasY,
              width: 300,
              height: 100,
              data: { text: '' }
            });
          }
          useEdgelessStore.getState().setTool('select');
          // Don't stop propagation — still allow fabric to process
        }
        // For pen, eraser, select, lasso, selection, transform, text:
        // Do NOT call preventDefault, stopPropagation, or setPointerCapture.
        // Let fabric.js and useDrawingTools handle everything.
        return
      }

      // ── Panning mode: we take over ──
      e.preventDefault()
      e.stopPropagation()
      upperCanvas?.setPointerCapture?.(e.pointerId)

      const state = pointerStateRef.current
      state.pointers.set(e.pointerId, e)
      state.lastX = e.clientX
      state.lastY = e.clientY
      state.isPanning = true
      state.isPinching = state.pointers.size === 2

      if (state.isPinching) {
        const [p1, p2] = Array.from(state.pointers.values())
        state.initialDistance = getDistance(p1, p2)
        state.initialZoom = fabricCanvas.getZoom()
      }

      fabricCanvas.selection = false
    }

    // ── pointer move: panning only (cursor tracking is handled separately via window mousemove) ──
    const handlePointerMove = (e: PointerEvent) => {
      // Only handle panning — everything else goes to fabric/useDrawingTools
      const state = pointerStateRef.current
      if (!state.isPanning) return
      if (!state.pointers.has(e.pointerId)) return
      state.pointers.set(e.pointerId, e)

      const vpt = fabricCanvas.viewportTransform
      if (!vpt) return

      if (state.isPinching && state.pointers.size >= 2) {
        const [p1, p2] = Array.from(state.pointers.values())
        const dist = getDistance(p1, p2)
        if (state.initialDistance > 0) {
          let zoom = state.initialZoom * (dist / state.initialDistance)
          zoom = Math.min(Math.max(zoom, 0.01), 20)
          fabricCanvas.zoomToPoint(new fabric.Point(e.clientX, e.clientY), zoom)
          fabricCanvas.requestRenderAll()
          scheduleViewport(fabricCanvas.viewportTransform!)
        }
      } else {
        vpt[4] += e.clientX - state.lastX
        vpt[5] += e.clientY - state.lastY
        fabricCanvas.requestRenderAll()
        state.lastX = e.clientX
        state.lastY = e.clientY
        scheduleViewport(vpt)
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      // Only handle pan cleanup — everything else goes to fabric/useDrawingTools
      const state = pointerStateRef.current
      if (!state.isPanning) return

      e.preventDefault()
      e.stopPropagation()
      upperCanvas?.releasePointerCapture?.(e.pointerId)
      state.pointers.delete(e.pointerId)
      if (state.pointers.size < 2) {
        state.isPinching = false
        state.initialDistance = 0
      }
      if (state.pointers.size === 0) {
        state.isPanning = false
        // Restore cursor and selection based on active tool
        if (activeTool === 'pen' || activeTool === 'eraser') {
          fabricCanvas.isDrawingMode = true
          if (activeTool === 'eraser') {
            fabricCanvas.selection = false
          }
        }
        if (activeTool === 'lasso' || activeTool === 'selection') {
          fabricCanvas.selection = false
          fabricCanvas.defaultCursor = 'crosshair'
        } else if (activeTool === 'hand') {
          fabricCanvas.selection = false
          // Use custom hand cursor
          fabricCanvas.defaultCursor = getHandCursor(false)
        } else if (activeTool === 'select' || activeTool === 'transform') {
          fabricCanvas.selection = true
          fabricCanvas.defaultCursor = 'default'
        } else if (activeTool === 'pen' || activeTool === 'eraser') {
          // SVG cursor applied by brush-cursor useEffect — nothing to do here
        }
      }
    }

    upperCanvas?.addEventListener('wheel', handleWheel, { passive: false })
    upperCanvas?.addEventListener('pointerdown', handlePointerDown, { passive: false })
    upperCanvas?.addEventListener('pointermove', handlePointerMove, { passive: false })
    upperCanvas?.addEventListener('pointerup', handlePointerUp, { passive: false })
    upperCanvas?.addEventListener('pointercancel', handlePointerUp, { passive: false })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      upperCanvas?.removeEventListener('wheel', handleWheel)
      upperCanvas?.removeEventListener('pointerdown', handlePointerDown)
      upperCanvas?.removeEventListener('pointermove', handlePointerMove)
      upperCanvas?.removeEventListener('pointerup', handlePointerUp)
      upperCanvas?.removeEventListener('pointercancel', handlePointerUp)
      if (viewportRafRef.current) cancelAnimationFrame(viewportRafRef.current)
      // Restore body cursor on cleanup
      document.body.style.cursor = ''
      document.body.classList.remove('cursor-none')
    }
  }, [fabricCanvas, activeTool])

  // Context menu
  useEffect(() => {
    if (!fabricCanvas) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const target = (fabricCanvas as any).findTarget(e)
      const activeToolCurrent = useEdgelessStore.getState().activeTool

      if (target && typeof (target as any).onSelect === 'function') {
        try {
          fabricCanvas.setActiveObject(target as any)
          fabricCanvas.requestRenderAll()
        } catch (_) { /* target may not be a valid fabric object */ }

        const data = (target as any).data || {}
        useContextMenuStore.getState().openMenu(
          e.clientX,
          e.clientY,
          data.id || (target as any).name,
          'canvas-object',
          { ...data, type: (target as any).type }
        )
      } else {
        if (activeToolCurrent === 'pen' || activeToolCurrent === 'eraser') {
          const extra: any = { tool: activeToolCurrent };
          if (activeToolCurrent === 'pen') extra.color = useEdgelessStore.getState().penColor;
          useContextMenuStore.getState().openMenu(
            e.clientX,
            e.clientY,
            activeToolCurrent,
            'tool',
            extra
          )
        }
      }
    }

    const upperCanvas = fabricCanvas.upperCanvasEl as HTMLCanvasElement | undefined
    if (!upperCanvas) return
    upperCanvas.addEventListener('contextmenu', handleContextMenu)
    return () => upperCanvas.removeEventListener('contextmenu', handleContextMenu)
  }, [fabricCanvas])

  const handleSurfaceContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (activeTool !== 'pen' && activeTool !== 'eraser') return
    const extra: any = { tool: activeTool }
    if (activeTool === 'pen') extra.color = useEdgelessStore.getState().penColor
    useContextMenuStore.getState().openMenu(
      e.clientX,
      e.clientY,
      activeTool,
      'tool',
      extra
    )
  }, [activeTool])

  // ── Brush / eraser cursor: SVG data-URL applied directly to the fabric canvas ──
  // This is the only approach that works correctly in Electron AppImage builds.
  // Native CSS cursors are positioned by the browser itself with zero offset,
  // completely bypassing any parent-transform / containing-block issues.
  useEffect(() => {
    if (!fabricCanvas) return
    const isPenEraser = activeTool === 'pen' || activeTool === 'eraser'
    if (!isPenEraser) return

    const brushSize = activeTool === 'pen' ? penWidth : eraserWidth
    const cursorUrl = makeBrushCursor(brushSize * viewPort.zoom)

    // Set cursor through fabric.js API — fabric overrides element.style.cursor
    // on every pointer event, so setting it on the DOM directly gets stomped.
    if (activeTool === 'pen') {
      fabricCanvas.freeDrawingCursor = cursorUrl
    }
    // defaultCursor is used when not drawing (eraser mode uses manual drawing)
    fabricCanvas.defaultCursor = cursorUrl
    fabricCanvas.hoverCursor = cursorUrl

    // Also set on elements as a backup for when fabric hasn't rendered yet
    const upperCanvas = (fabricCanvas as any).upperCanvasEl as HTMLElement | undefined
    const lowerCanvas = (fabricCanvas as any).lowerCanvasEl as HTMLElement | undefined
    if (upperCanvas) upperCanvas.style.cursor = cursorUrl
    if (lowerCanvas) lowerCanvas.style.cursor = cursorUrl
    if (wrapperRef.current) wrapperRef.current.style.cursor = cursorUrl
    // Reset body so the SVG cursor shows over the canvas area
    document.body.style.cursor = ''
    document.body.classList.remove('cursor-none')
  }, [activeTool, penWidth, eraserWidth, viewPort.zoom, fabricCanvas])

  // ── Make drawn paths selectable/editable + pixel eraser + undo snapshots ──
  useEffect(() => {
    if (!fabricCanvas) return

    // Ensure eraser paths are ALWAYS non-selectable, even after undo/redo/load
    const isEraserObj = (obj: any) =>
      obj && (obj.globalCompositeOperation === 'destination-out' || obj._isEraserPath)

    const enforceEraserPaths = (e: any) => {
      const obj = e.target || e
      if (isEraserObj(obj)) {
        obj.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
        })
      }
    }
    fabricCanvas.on('object:added', enforceEraserPaths)

    // Strip eraser paths from ANY selection — belt-and-suspenders guard so
    // the user can never accidentally select, move, or highlight eraser strokes.
    const stripEraserFromSelection = (e: any) => {
      const sel = fabricCanvas.getActiveObject()
      if (!sel) return
      if (sel instanceof fabric.ActiveSelection) {
        const objs = sel.getObjects().filter((o: any) => !isEraserObj(o))
        if (objs.length !== sel.getObjects().length) {
          fabricCanvas.discardActiveObject()
          if (objs.length === 1) {
            fabricCanvas.setActiveObject(objs[0])
          } else if (objs.length > 1) {
            fabricCanvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas: fabricCanvas }))
          }
          fabricCanvas.requestRenderAll()
        }
      } else if (isEraserObj(sel)) {
        fabricCanvas.discardActiveObject()
        fabricCanvas.requestRenderAll()
      }
    }
    fabricCanvas.on('selection:created', stripEraserFromSelection)
    fabricCanvas.on('selection:updated', stripEraserFromSelection)

    const handlePathCreated = (e: any) => {
      const path = e.path
      if (!path) return

      const currentTool = useEdgelessStore.getState().activeTool

      // Eraser mode: bake the erasure into each overlapping object using
      // native Canvas2D rendering (completely bypasses fabric's render pipeline
      // to avoid caching / viewport / context issues on offscreen canvases).
      if (currentTool === 'eraser') {
        path.set({
          globalCompositeOperation: 'destination-out',
          selectable: false,
          evented: false,
        })

        const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0]
        const zoom = vpt[0] || 1
        const panX = vpt[4] || 0
        const panY = vpt[5] || 0

        // Convert viewport-pixel bounding rect to fabric coordinates
        const toFabric = (br: { left: number; top: number; width: number; height: number }) => ({
          left: (br.left - panX) / zoom,
          top: (br.top - panY) / zoom,
          width: br.width / zoom,
          height: br.height / zoom,
        })

        const eraserBR = toFabric(path.getBoundingRect())

        // Find overlapping objects and PRE-COMPUTE their fabric-space rects
        // (must happen before any viewport changes)
        const objects = fabricCanvas.getObjects()
        const affected: { obj: any; objBR: ReturnType<typeof toFabric> }[] = []
        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i]
          if (obj === path) continue
          if (obj.globalCompositeOperation === 'destination-out') continue
          if ((obj as any)._isEraserPath) continue
          const r = toFabric(obj.getBoundingRect())
          const overlaps = !(
            r.left > eraserBR.left + eraserBR.width ||
            r.left + r.width < eraserBR.left ||
            r.top > eraserBR.top + eraserBR.height ||
            r.top + r.height < eraserBR.top
          )
          if (overlaps) affected.push({ obj, objBR: r })
        }

        // ── Native Canvas2D helpers (no fabric render dependency) ──
        const drawNativePath = (ctx: CanvasRenderingContext2D, cmds: any[]) => {
          ctx.beginPath()
          for (const c of cmds) {
            switch (c[0]) {
              case 'M': ctx.moveTo(c[1], c[2]); break
              case 'L': ctx.lineTo(c[1], c[2]); break
              case 'Q': ctx.quadraticCurveTo(c[1], c[2], c[3], c[4]); break
              case 'C': ctx.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]); break
              case 'Z': case 'z': ctx.closePath(); break
            }
          }
        }

        // Draw a fabric object using its calcTransformMatrix + native 2D calls
        const drawObjNative = (ctx: CanvasRenderingContext2D, o: any) => {
          ctx.save()
          ctx.globalAlpha = o.opacity ?? 1
          const m = o.calcTransformMatrix()
          ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5])

          if (o.path && Array.isArray(o.path)) {
            // Path object (pen strokes)
            ctx.translate(-(o.pathOffset?.x || 0), -(o.pathOffset?.y || 0))
            if (o.fill && o.fill !== '' && o.fill !== 'transparent') {
              ctx.fillStyle = o.fill
              drawNativePath(ctx, o.path)
              ctx.fill()
            }
            if (o.stroke) {
              ctx.strokeStyle = o.stroke
              ctx.lineWidth = o.strokeWidth || 1
              ctx.lineCap = o.strokeLineCap || 'round'
              ctx.lineJoin = o.strokeLineJoin || 'round'
              drawNativePath(ctx, o.path)
              ctx.stroke()
            }
          } else if (typeof o.getElement === 'function') {
            // Image object (e.g. previously rasterized by eraser)
            const el = o.getElement()
            if (el) {
              const w = o.width || el.width
              const h = o.height || el.height
              ctx.drawImage(el, -w / 2, -h / 2, w, h)
            }
          }
          ctx.restore()
        }

        // Suppress intermediate renders during bulk replacement
        const savedRender = fabricCanvas.renderOnAddRemove
        fabricCanvas.renderOnAddRemove = false

        const replacements: { obj: any; img: fabric.Image; idx: number }[] = []

        const recordDelete = (target: any) => {
          const targetId = target?.data?.id || target?.name
          if (!targetId) return
          useEdgelessStore.getState().recordOp({
            type: 'delete',
            targetId,
            layerId: target.data?.layerId || useEdgelessStore.getState().activeLayerId,
          } as any)
        }

        const recordBitmapReplace = (target: any, payload: {
          dataUrl: string,
          width: number,
          height: number,
          left: number,
          top: number,
          scaleX: number,
          scaleY: number,
          angle: number,
          opacity?: number
        }) => {
          const targetId = target?.data?.id || target?.name
          if (!targetId) return
          useEdgelessStore.getState().recordOp({
            type: 'bitmap-replace',
            targetId,
            layerId: target.data?.layerId || useEdgelessStore.getState().activeLayerId,
            ...payload,
          } as any)
        }

        for (const { obj, objBR } of affected) {
          let offCanvas: HTMLCanvasElement | undefined
          try {
            const PAD = Math.max(path.strokeWidth || 20, 4) + 2
            const uL = Math.floor(objBR.left) - PAD
            const uT = Math.floor(objBR.top) - PAD
            const uR = Math.ceil(objBR.left + objBR.width) + PAD
            const uB = Math.ceil(objBR.top + objBR.height) + PAD
            const w = uR - uL
            const h = uB - uT
            if (w <= 0 || h <= 0) continue

            const dpr = window.devicePixelRatio || 1
            offCanvas = borrowCanvas()
            offCanvas.width = Math.ceil(w * dpr)
            offCanvas.height = Math.ceil(h * dpr)
            const offCtx = offCanvas.getContext('2d')!

            // Scale for DPR, then shift so fabric coord (uL, uT) → pixel (0, 0)
            offCtx.scale(dpr, dpr)
            offCtx.translate(-uL, -uT)

            // 1) Draw original object with native Canvas2D
            drawObjNative(offCtx, obj)

            // 2) Draw eraser with destination-out
            offCtx.save()
            offCtx.globalCompositeOperation = 'destination-out'
            offCtx.globalAlpha = 1
            const em = path.calcTransformMatrix()
            offCtx.transform(em[0], em[1], em[2], em[3], em[4], em[5])
            offCtx.translate(-(path.pathOffset?.x || 0), -(path.pathOffset?.y || 0))
            offCtx.lineWidth = path.strokeWidth || 20
            offCtx.lineCap = (path as any).strokeLineCap || 'round'
            offCtx.lineJoin = (path as any).strokeLineJoin || 'round'
            offCtx.strokeStyle = 'rgba(0,0,0,1)'
            drawNativePath(offCtx, path.path)
            offCtx.stroke()
            offCtx.restore()

            // 3) Trim transparent borders so the bounding box only
            //    covers remaining visible pixels (erased areas vanish).
            const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height)
            const pxData = imgData.data
            let tMinX = offCanvas.width, tMinY = offCanvas.height
            let tMaxX = 0, tMaxY = 0
            for (let py = 0; py < offCanvas.height; py++) {
              for (let px = 0; px < offCanvas.width; px++) {
                if (pxData[(py * offCanvas.width + px) * 4 + 3] > 0) {
                  if (px < tMinX) tMinX = px
                  if (px > tMaxX) tMaxX = px
                  if (py < tMinY) tMinY = py
                  if (py > tMaxY) tMaxY = py
                }
              }
            }

            // If nothing visible remains the object was fully erased — skip replacement
            if (tMaxX < tMinX || tMaxY < tMinY) {
              const removeIdx = fabricCanvas._objects.indexOf(obj)
              if (removeIdx >= 0) {
                recordDelete(obj)
                fabricCanvas.remove(obj)
              }
              releaseCanvas(offCanvas)
              continue
            }

            // Crop to the tight bounding box
            const trimW = tMaxX - tMinX + 1
            const trimH = tMaxY - tMinY + 1
            const trimCanvas = borrowCanvas()
            trimCanvas.width = trimW
            trimCanvas.height = trimH
            const trimCtx = trimCanvas.getContext('2d')!
            trimCtx.putImageData(
              offCtx.getImageData(tMinX, tMinY, trimW, trimH),
              0, 0,
            )

            // 4) Create replacement image with per-pixel hit detection
            //    so transparent (erased) areas cannot be selected/clicked.
            const left = uL + tMinX / dpr
            const top = uT + tMinY / dpr
            const scaleX = 1 / dpr
            const scaleY = 1 / dpr

            const img = new fabric.Image(trimCanvas, {
              left,
              top,
              scaleX,
              scaleY,
              originX: 'left',
              originY: 'top',
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              perPixelTargetFind: true,
            })
            const dataUrl = trimCanvas.toDataURL('image/png')
            
            // Critical for lag: override getSrc so `fabricCanvas.toJSON()` doesn't rebuild the dataURL 
            // from the canvas context on every single stroke/saveHistoryState.
            img.getSrc = () => dataUrl;
            
            // Critical for persistence: preserve data.id so the image can be erased/transformed again later 
            img.set('data', { id: obj.data?.id || obj.name, layerId: obj.data?.layerId || useEdgelessStore.getState().activeLayerId })
            img.setCoords()

            const idx = fabricCanvas._objects.indexOf(obj)
            if (idx >= 0) {
              replacements.push({ obj, img, idx })
              recordBitmapReplace(obj, {
                dataUrl,
                width: trimW,
                height: trimH,
                left,
                top,
                scaleX,
                scaleY,
                angle: obj.angle || 0,
                opacity: obj.opacity ?? 1,
              })
            }
          } catch (err) {
            console.error('Eraser rasterize failed:', err)
            if (offCanvas) releaseCanvas(offCanvas)
          }
        }

        // Apply replacements in reverse z-order so indices stay valid
        replacements.sort((a, b) => b.idx - a.idx)
        for (const { obj, img, idx } of replacements) {
          fabricCanvas.remove(obj)
          fabricCanvas.insertAt(idx, img)
        }

        // Remove the eraser path — it was only needed for offscreen rasterization
        fabricCanvas.remove(path)

        fabricCanvas.renderOnAddRemove = savedRender
        pushHistoryAction({ 
          type: 'erase', 
          replacements: replacements.map(r => ({ old: r.obj, new: r.img }))
        })
        fabricCanvas.requestRenderAll()
        return
      }

      // Save state AFTER the new pen stroke is on the canvas

      // Pen mode: Ensure the drawn path is a fully interactive vector object
      path.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
        perPixelTargetFind: true,
        transparentCorners: false,
        cornerColor: '#f6b012',
        cornerStyle: 'circle',
        cornerSize: 8,
        borderColor: '#f6b012',
        borderScaleFactor: 1.5,
        decimate: 1.5,
      })

      // Save history AFTER setting properties so the snapshot is complete
      pushHistoryAction({ type: 'add', obj: path })

      fabricCanvas.requestRenderAll()

      // Ensure path has a unique ID for the oplog
      const pathId = `path-${Math.random().toString(36).slice(2, 9)}`;
      path.set({ data: { id: pathId, layerId: useEdgelessStore.getState().activeLayerId } });

      // Record op for persistence
      const op = {
        type: 'path',
        layerId: useEdgelessStore.getState().activeLayerId,
        pathData: (path as any).path || [],
        stroke: path.stroke,
        strokeWidth: path.strokeWidth,
        left: path.left,
        top: path.top,
        targetId: pathId, // although not in interface, good for reference
        data: { id: pathId }
      };
      // useEdgelessStore.getState().recordOp(op as any); // TEST: Commented out to isolate IndexedDB lag
    }

    // Save state after object modifications (move, scale, rotate)
    const handleObjectModified = (e: any) => {
      const target = e.target;
      if (target && e.transform && e.transform.original) {
        const after = {
          left: target.left, top: target.top, 
          scaleX: target.scaleX, scaleY: target.scaleY, 
          angle: target.angle, skewX: target.skewX, skewY: target.skewY
        }
        pushHistoryAction({ type: 'modify', obj: target, before: e.transform.original, after })
      }
      
      if (target) {
          const op = {
              type: 'transform',
              targetId: target.data?.id || target.name,
              layerId: target.data?.layerId || 'default',
              position: { x: target.left, y: target.top },
              scale: { x: target.scaleX, y: target.scaleY },
              angle: target.angle,
              matrix: target.calcTransformMatrix()
          };
          useEdgelessStore.getState().recordOp(op as any);
      }
    }

    fabricCanvas.on('path:created', handlePathCreated)
    fabricCanvas.on('object:modified', handleObjectModified)
    return () => {
      fabricCanvas.off('path:created', handlePathCreated)
      fabricCanvas.off('object:modified', handleObjectModified)
      fabricCanvas.off('object:added', enforceEraserPaths)
      fabricCanvas.off('selection:created', stripEraserFromSelection)
      fabricCanvas.off('selection:updated', stripEraserFromSelection)
    }
  }, [fabricCanvas, pushHistoryAction])

  // ── Pointer interaction class ──
  const isSelectMode = activeTool === 'select' || activeTool === 'hand'
  const pointerClass = isSelectMode ? 'pointer-events-auto' : 'pointer-events-none'
  const childrenPointerClass = mode === 'interact' ? 'pointer-events-auto' : 'pointer-events-none'

  // Upload
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (f) => {
      const data = f.target?.result
      if (typeof data === 'string') {
        handleDrop({
          dataTransfer: {
            types: ['Files'],
            files: [file]
          },
          preventDefault: () => { },
          stopPropagation: () => { },
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2
        } as any)
      }
    }
    reader.readAsDataURL(file)
  }, [handleDrop])

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full overflow-hidden ${className || ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onContextMenu={handleSurfaceContextMenu}
    >
      <div className="absolute top-4 right-4 z-50 flex flex-row items-center gap-2 pointer-events-auto">
        {/* Lock / Unlock Button */}
        <button
          className="p-2 bg-black/80 backdrop-blur border border-white/20 rounded-md shadow hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
          onClick={() => {
            const el = useEdgelessStore.getState().elements.find(e => e.id === useEdgelessStore.getState().activeElementId)
            if (el) useEdgelessStore.getState().toggleElementLock(el.id)
            else if (useEdgelessStore.getState().activeLayerId) {
              const layer = useEdgelessStore.getState().layers.find(l => l.id === useEdgelessStore.getState().activeLayerId)
              if (layer) useEdgelessStore.getState().toggleLayerLock(layer.id)
            }
          }}
          title="lock/unlock (ctrl+l)"
        >
          {(() => {
            const el = useEdgelessStore.getState().elements.find(e => e.id === useEdgelessStore.getState().activeElementId)
            const isLocked = el ? el.locked : useEdgelessStore.getState().layers.find(l => l.id === useEdgelessStore.getState().activeLayerId)?.locked
            return isLocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
            )
          })()}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleUpload}
          accept="image/*,application/pdf"
        />
        <button
          className="p-2 bg-black/80 backdrop-blur border border-white/20 rounded-md shadow hover:bg-white/10 transition-colors text-foreground"
          onClick={() => fileInputRef.current?.click()}
          title="upload image/pdf"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>
      </div>

      <canvas ref={canvasEl} />

      {/* Page Boundary Indicator */}
      {(() => {
        if (canvasConfig && canvasConfig.mode === 'edgeless') return null
        const width = canvasConfig && canvasConfig.mode === 'desktop-8k' ? 7680 : 4320
        const height = canvasConfig && canvasConfig.mode === 'desktop-8k' ? 4320 : 9360
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
              transformOrigin: 'top left',
            }}
          >
            <div className="absolute -top-6 left-0 text-xs text-muted-foreground font-mono lowercase">
              {canvasConfig && canvasConfig.mode === 'desktop-8k' ? '8k desktop (7680x4320)' : '8k iphone (4320x9360)'}
            </div>
          </div>
        )
      })()}

      {/* Children transform layer */}
      <div
        className="absolute inset-0 pointer-events-none origin-top-left"
        style={{
          transform: `matrix(${viewPort.zoom}, 0, 0, ${viewPort.zoom}, ${viewPort.x}, ${viewPort.y})`,
          width: '100%',
          height: '100%',
        }}
      >
        <div className={childrenPointerClass}>{children}</div>
      </div>

      {/* ── Overlay elements: rendered in canvas-space inside a CSS-transformed container ──
           Pan/zoom is handled entirely by the CSS transform on this wrapper div.
           Individual elements render at their raw (x, y, w, h) world coordinates.
           The GPU compositor handles the transform — zero React re-renders for pan/zoom. */}
      {fabricCanvas && (
        <div
          className="absolute inset-0 pointer-events-none origin-top-left"
          style={{
            transform: `matrix(${viewPort.zoom}, 0, 0, ${viewPort.zoom}, ${viewPort.x}, ${viewPort.y})`,
            width: '100%',
            height: '100%',
          }}
        >
          <OverlayLayer pointerClass={pointerClass} pdfDoc={pdfDoc} />
        </div>
      )}

    </div>
  )
}
