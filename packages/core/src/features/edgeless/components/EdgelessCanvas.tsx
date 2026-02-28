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
          <img src={element.data?.src || element.data?.url} className="w-full h-full object-cover" draggable={false} />
        </div>
      )
    case 'embed':
    case 'embed-web':
    case 'embed-nocobase':
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
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
      return (
        <div className={`absolute ${pointerClass}`} style={style}>
          <CanvasCard
            data={element.data.row}
            collection={element.data.collection}
            fields={element.data.fields || []}
            layout={{ x: 0, y: 0, width: element.width, height: element.height }}
            isSelected={false}
            className="w-full h-full"
            onUpdate={element.data.onUpdate}
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
        <div className={`absolute ${pointerClass}`} style={style}>
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


// ─── Main canvas component ─────────────────────────────────────────────────────

export interface EdgelessCanvasProps {
  onObjectModified?: (e: any) => void
  className?: string
  onLoad?: () => void
  children?: React.ReactNode
}

export function EdgelessCanvas({ onObjectModified: _onObjectModified, className, onLoad, children }: EdgelessCanvasProps) {
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

  // ── Ref-based cursor tracking (no React state) ──
  const cursorPosRef = useRef({ x: -100, y: -100 })
  const eraserCursorRef = useRef<HTMLDivElement>(null)
  const cursorRafRef = useRef<number | null>(null)

  // ── Store subscriptions (granular) ──
  const fabricCanvas = useEdgelessStore((s) => s.fabricCanvas)
  const setFabricCanvas = useEdgelessStore((s) => s.setFabricCanvas)
  const viewPort = useViewport()
  const setViewport = useEdgelessStore((s) => s.setViewport)
  const activeTool = useActiveTool()
  const selectionMode = useSelectionMode()
  const pdfDoc = useEdgelessStore((s) => s.pdfDoc)
  const canvasConfig = useEdgelessStore((s) => s.canvasConfig)
  const elementsLength = useEdgelessStore((s) => s.elements.length)

  const { handleDrop } = useCanvasEvents()
  useCanvasSafe()

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
        useEdgelessStore.getState().undo()
      },
      onThreeFingerTap: (e) => {
        e.stopPropagation()
        useEdgelessStore.getState().redo()
      },
      onEmptyTwoFingerTap: (e) => {
        const target = e.target as HTMLElement
        const isEmpty = wrapperRef.current === target
        const recentChange = Date.now() - lastStateChangeRef.current < 4000
        if (isEmpty && recentChange) {
          e.stopPropagation()
          useEdgelessStore.getState().undo()
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
      enableRetinaScaling: true,
      fireRightClick: true,
      stopContextMenu: true,
    })

      ; (fabric.Object.prototype as any).transparentCorners = false
      ; (fabric.Object.prototype as any).cornerColor = '#f6b012'
      ; (fabric.Object.prototype as any).cornerStyle = 'circle'

    setFabricCanvas(canvas)
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

  // Tool Configuration (Drawing / Eraser)
  useEffect(() => {
    if (!fabricCanvas) return

    if (activeTool === 'pen') {
      fabricCanvas.isDrawingMode = true
      const brush = new fabric.PencilBrush(fabricCanvas) as any
      brush.width = penWidth
      brush.color = penColor
      brush.opacity = (penOpacity ?? 100) / 100
      brush.decimate = Math.max(1, 8 - (stabilizerLevel || 0))
      fabricCanvas.freeDrawingBrush = brush
    } else if (activeTool === 'eraser') {
      fabricCanvas.isDrawingMode = true
      const EraserBrushConstructor = Object.getOwnPropertyDescriptor(fabric, ['Eraser', 'Brush'].join(''))?.value;
      if (EraserBrushConstructor) {
        const eraser = new EraserBrushConstructor(fabricCanvas) as any
        eraser.width = eraserWidth
        eraser.opacity = (eraserOpacity ?? 100) / 100
        fabricCanvas.freeDrawingBrush = eraser
      } else {
        const brush = new fabric.PencilBrush(fabricCanvas) as any
        brush.width = eraserWidth
        brush.color = '#090909'
        brush.opacity = (eraserOpacity ?? 100) / 100
        fabricCanvas.freeDrawingBrush = brush
      }
    } else {
      fabricCanvas.isDrawingMode = false
    }
  }, [activeTool, fabricCanvas, penWidth, penColor, penOpacity, eraserWidth, eraserOpacity, stabilizerLevel])

  // Spacebar Pan Logic & Pointer-based pan/zoom
  useEffect(() => {
    if (!fabricCanvas) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isPanningRef.current) {
        isPanningRef.current = true
        fabricCanvas.defaultCursor = 'grab'
        fabricCanvas.selection = false
        if (activeTool === 'pen' || activeTool === 'eraser') {
          fabricCanvas.isDrawingMode = false
        }
        fabricCanvas.requestRenderAll()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        isPanningRef.current = false
        fabricCanvas.defaultCursor = 'default'
        fabricCanvas.selection = true
        if (activeTool === 'pen' || activeTool === 'eraser') {
          fabricCanvas.isDrawingMode = true
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
      e.preventDefault()
      e.stopPropagation()
      upperCanvas?.setPointerCapture?.(e.pointerId)
      const state = pointerStateRef.current
      state.pointers.set(e.pointerId, e)
      state.lastX = e.clientX
      state.lastY = e.clientY
      const shouldPan = isPanningRef.current || e.button === 2 || e.altKey
      state.isPanning = shouldPan
      state.isPinching = state.pointers.size === 2
      if (state.isPinching) {
        const [p1, p2] = Array.from(state.pointers.values())
        state.initialDistance = getDistance(p1, p2)
        state.initialZoom = fabricCanvas.getZoom()
      }
      if (state.isPanning) {
        fabricCanvas.selection = false
        fabricCanvas.defaultCursor = 'grabbing'
      }
    }

    // ── pointer move: ref-based cursor, no React state ──
    const handlePointerMove = (e: PointerEvent) => {
      // Update cursor position via ref + RAF (bypasses React entirely)
      cursorPosRef.current.x = e.clientX
      cursorPosRef.current.y = e.clientY
      if (!cursorRafRef.current) {
        cursorRafRef.current = requestAnimationFrame(() => {
          const el = eraserCursorRef.current
          if (el) {
            const { x, y } = cursorPosRef.current
            const r = useEdgelessStore.getState().eraserWidth / 2
            el.style.transform = `translate(${x - r}px, ${y - r}px)`
            el.style.display = x > -50 ? 'block' : 'none'
          }
          cursorRafRef.current = null
        })
      }

      const state = pointerStateRef.current
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
      } else if (state.isPanning) {
        vpt[4] += e.clientX - state.lastX
        vpt[5] += e.clientY - state.lastY
        fabricCanvas.requestRenderAll()
        state.lastX = e.clientX
        state.lastY = e.clientY
        scheduleViewport(vpt)
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      upperCanvas?.releasePointerCapture?.(e.pointerId)
      const state = pointerStateRef.current
      state.pointers.delete(e.pointerId)
      if (state.pointers.size < 2) {
        state.isPinching = false
        state.initialDistance = 0
      }
      if (state.pointers.size === 0) {
        state.isPanning = false
        fabricCanvas.selection = true
        fabricCanvas.defaultCursor = isPanningRef.current ? 'grab' : 'default'
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
      if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current)
    }
  }, [fabricCanvas, activeTool])

  // Context menu
  useEffect(() => {
    if (!fabricCanvas) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const target = (fabricCanvas as any).findTarget(e)

      if (target) {
        fabricCanvas.setActiveObject(target as any)
        fabricCanvas.requestRenderAll()

        const data = (target as any).data || {}
        useContextMenuStore.getState().openMenu(
          e.clientX,
          e.clientY,
          data.id || (target as any).name,
          'canvas-object',
          { ...data, type: (target as any).type }
        )
      } else {
        if (activeTool === 'pen' || activeTool === 'eraser') {
          const extra: any = { tool: activeTool };
          if (activeTool === 'pen') extra.color = useEdgelessStore.getState().penColor;
          useContextMenuStore.getState().openMenu(
            e.clientX,
            e.clientY,
            activeTool,
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

  // ── Pointer interaction class ──
  const isInteractMode = activeTool === 'select' && selectionMode === 'cursor'
  const pointerClass = isInteractMode ? 'pointer-events-auto' : 'pointer-events-none'

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
      onContextMenu={(e) => {
        e.preventDefault()
      }}
    >
      <div className="absolute top-4 right-4 z-50 flex flex-row items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleUpload}
          accept="image/*,application/pdf"
        />
        <button
          className="p-2 bg-black border border-white/20 rounded-md shadow hover:bg-white/10 transition-colors text-foreground"
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
        <div className="pointer-events-auto">{children}</div>
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

      {/* Eraser cursor — driven by ref + RAF, no React state */}
      {activeTool === 'eraser' && (
        <div
          ref={eraserCursorRef}
          className="pointer-events-none fixed rounded-full"
          style={{
            top: 0,
            left: 0,
            width: eraserWidth,
            height: eraserWidth,
            display: 'none',
            zIndex: 99999,
            boxSizing: 'border-box',
            border: '3px solid #f6b012',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            willChange: 'transform',
          }}
        />
      )}
    </div>
  )
}
