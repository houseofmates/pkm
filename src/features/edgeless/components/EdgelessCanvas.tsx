import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as fabric from 'fabric'
import { useEdgelessStore } from '../store'
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
import { useContextMenuStore } from '@/components/ui/context-menu-store'
import { useCanvasEvents } from '../hooks/use-canvas-events'
import { useGestureManager } from '@/hooks/use-gesture-manager'

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

  const {
    fabricCanvas,
    setFabricCanvas,
    elements,
    viewPort,
    setViewport,
    activeTool,
    selectionMode,
    selectedIds,
    pdfDoc,
    canvasConfig
  } = useEdgelessStore()

  const { handleDrop } = useCanvasEvents()
  useCanvasSafe()
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })

  // track last stateful action to decide empty-space two-finger undo
  useEffect(() => {
    lastStateChangeRef.current = Date.now()
  }, [viewPort, elements.length])

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

    ;(fabric.Object.prototype as any).transparentCorners = false
    ;(fabric.Object.prototype as any).cornerColor = '#f6b012'
    ;(fabric.Object.prototype as any).cornerStyle = 'circle'

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
  // read reactive brush/eraser settings from the store so we can
  // reconfigure the fabric brush whenever they change.
  const { penWidth, penColor, penOpacity, eraserWidth, eraserOpacity, stabilizerLevel } = useEdgelessStore();

  useEffect(() => {
    if (!fabricCanvas) return

    if (activeTool === 'pen') {
      fabricCanvas.isDrawingMode = true
      const brush = new fabric.PencilBrush(fabricCanvas) as any
      brush.width = penWidth
      brush.color = penColor
      brush.opacity = (penOpacity ?? 100) / 100
      // apply smoothing/decimation; higher stabilizer => less decimate
      // cap between 1 and 8
      brush.decimate = Math.max(1, 8 - (stabilizerLevel || 0))
      fabricCanvas.freeDrawingBrush = brush
    } else if (activeTool === 'eraser') {
      fabricCanvas.isDrawingMode = true
      // fabric's types do not export EraserBrush so we access dynamically to avoid
      // esbuild treating it as a named import and failing when the symbol is missing.
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
        fabricCanvas.zoomToPoint({ x: event.offsetX, y: event.offsetY }, zoom)
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

    const handlePointerMove = (e: PointerEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY })
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
          fabricCanvas.zoomToPoint({ x: e.clientX, y: e.clientY }, zoom)
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
    }
  }, [fabricCanvas, activeTool])

  useEffect(() => {
    if (!fabricCanvas) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const target = fabricCanvas.findTarget(e as any, false)

      if (target) {
        fabricCanvas.setActiveObject(target)
        fabricCanvas.requestRenderAll()

        const data = (target as any).data || {}
        useContextMenuStore.getState().openMenu(
          e.clientX,
          e.clientY,
          data.id || (target as any).name,
          'canvas-object',
          { ...data, type: target.type }
        )
      } else {
        // blank canvas click: if drawing or eraser tool active, show tool menu
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

    // @ts-expect-error fabric-types-issue
    const upperCanvas = fabricCanvas.upperCanvasEl
    upperCanvas.addEventListener('contextmenu', handleContextMenu)
    return () => upperCanvas.removeEventListener('contextmenu', handleContextMenu)
  }, [fabricCanvas])

  const getScreenPos = (el: any) => {
    if (!fabricCanvas) return { x: 0, y: 0, w: 0, h: 0 }
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0]
    const zoom = vpt[0]
    const panX = vpt[4]
    const panY = vpt[5]

    return {
      x: el.x * zoom + panX,
      y: el.y * zoom + panY,
      w: el.width * zoom,
      h: el.height * zoom,
    }
  }

  const overlayElements = useMemo(() => {
    if (!fabricCanvas) return null
    const out: React.ReactNode[] = []

    // Determine pointer behavior based on tool mode
    // GRAB (Select Tool) -> pointer-events: none (pass through to canvas for drag)
    // CURSOR (Interact Tool) -> pointer-events: auto (interact with widget)
    // Draw/Eraser -> pointer-events: none
    const isInteractMode = activeTool === 'select' && selectionMode === 'cursor';
    const globalPointerEvents = isInteractMode ? 'pointer-events-auto' : 'pointer-events-none';

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const { x: screenX, y: screenY, w: screenW, h: screenH } = getScreenPos(el)
      const isSelected = selectedIds.has(el.id)

      // If interact mode, always interact. If grab mode, only interact if explicitly not covering?
      // Actually, we want the ability to drag "windows".
      // If Grab mode: pointer-events: none on content, but maybe auto on a "handle"?
      // The overlay is the *content*. The fabric object underneath handles the drag.
      // So if pointer-events is none, clicks go to fabric -> drag works.
      // If pointer-events is auto, clicks go to overlay -> drag FAILS.

      // So:
      // Grab Mode -> pointer-events: none
      // Interact Mode -> pointer-events: auto

      const pointerClass = globalPointerEvents;

      const elementStyle = {
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        transformOrigin: 'top left',
      }

      switch (el.type) {
        case 'pdf-page':
          out.push(
            <div
              key={el.id}
              className={`absolute bg-[#090909] border border-white/10 shadow-lg ${pointerClass}`}
              style={elementStyle}
            >
              <PdfElement element={el} pdfDocument={pdfDoc} />
            </div>
          )
          break
        case 'image':
          out.push(
            <div key={el.id} className={`absolute shadow-lg ${pointerClass}`} style={elementStyle}>
              <img src={el.data?.src || el.data?.url} className="w-full h-full object-cover" draggable={false} />
            </div>
          )
          break
        case 'embed':
        case 'embed-web':
        case 'embed-nocobase':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <EmbedElement element={el} />
            </div>
          )
          break
        case 'link-card':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <LinkElement element={el} />
            </div>
          )
          break
        case 'record-node':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <RecordNodeElement element={el} />
            </div>
          )
          break
        case 'database-card':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <CanvasCard
                data={el.data.row}
                collection={el.data.collection}
                fields={el.data.fields || []}
                layout={{ x: 0, y: 0, width: el.width, height: el.height }}
                isSelected={false}
                className="w-full h-full"
                onUpdate={el.data.onUpdate}
              />
            </div>
          )
          break
        case 'portal':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <PortalElement element={el} />
            </div>
          )
          break
        case 'eternal-flame':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <EternalFlame element={el} />
            </div>
          )
          break
        case 'contact-card':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <ContactElement element={el} />
            </div>
          )
          break
        case 'offering-drop':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <OfferingDrop element={el} />
            </div>
          )
          break
        case 'shopping-card':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <ShoppingCard element={el} />
            </div>
          )
          break
        case 'gold-pile':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <GoldPile element={el} />
            </div>
          )
          break
        case 'floating-reminder':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <FloatingReminder element={el} />
            </div>
          )
          break
        case 'tier-list':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <TierListElement element={el} />
            </div>
          )
          break
        case 'sleep-ring':
          out.push(
            <div key={el.id} className={`absolute ${pointerClass}`} style={elementStyle}>
              <SleepRing element={el} />
            </div>
          )
          break
        case 'connector':
          out.push(<ConnectorElement key={el.id} element={el} />)
          break
        case 'smart-text':
          out.push(
            <div
              key={el.id}
              className={`absolute ${pointerClass}`}
              style={{
                ...elementStyle,
                height: 'auto',
                minHeight: 50,
                zIndex: 10,
              }}
            >
              <SmartTextElement element={el} />
            </div>
          )
          break
        default:
          break
      }
    }
    return out
  }, [elements, selectedIds, fabricCanvas, viewPort.x, viewPort.y, viewPort.zoom, pdfDoc, activeTool, selectionMode])

  // Upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }

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
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          className="p-2 bg-black border border-white/20 rounded-md shadow hover:bg-white/10 transition-colors text-foreground"
          onClick={() => fileInputRef.current?.click()}
          title="upload image/pdf"
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

      {fabricCanvas && overlayElements}

      {activeTool === 'eraser' && (
        <div
          className="pointer-events-none fixed rounded-full"
          style={{
            top: cursorPos.y - eraserWidth / 2,
            left: cursorPos.x - eraserWidth / 2,
            width: eraserWidth,
            height: eraserWidth,
            display: cursorPos.x > -50 ? 'block' : 'none',
            zIndex: 99999,
            boxSizing: 'border-box',
            border: '3px solid #f6b012',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      )}
    </div>
  )
}
