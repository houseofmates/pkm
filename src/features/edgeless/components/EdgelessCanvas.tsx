import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Canvas, PencilBrush, Point } from 'fabric'
import { toast } from 'sonner'
import * as fabric from 'fabric'
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
import * as pdfjsLib from 'pdfjs-dist'

// new oplog and spatial imports
import { applyOp, replayOplog, saveCheckpoint } from '../storage'
import { SpatialIndex } from '../spatial/spatial-index'
import { createConfiguredCanvas, cleanupFabricConfig } from '../config/fabric-config'

// worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`

export interface EdgelessCanvasProps {
  onObjectModified?: (id: string, patch: any) => void
  className?: string
  onLoad?: () => void
  children?: react.reactnode
}

export function EdgelessCanvas({ onobjectmodified, classname, onload, children }: edgelesscanvasprops) {
  const canvasel = useRef<HTMLCanvasElement>(null)
  const containerref = useRef<HTMLDivElement>(null)
  const { width, height } = useWindowSize()

  // drop target logic
  const { setNodeRef } = useDroppable({
    id: 'canvas-droppable',
  })

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const data = e.dataTransfer.getData('application/json')
    if (!data) return

    try {
      const payload = JSON.parse(data)
      if (payload.type === 'pkm-record') {
        const canvas = fabricCanvas
        if (!canvas) return

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const clientX = e.clientX
        const clientY = e.clientY

        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
        const zoom = canvas.getZoom()

        const x = (clientX - rect.left - vpt[4]) / zoom
        const y = (clientY - rect.top - vpt[5]) / zoom

        addElement({
          type: 'record-node',
          x,
          y,
          width: 200,
          height: 60,
          data: {
            recordId: payload.id,
            collectionName: payload.collection,
            title: payload.title,
            mode: 'node' as const,
          },
        })
      }
    } catch (err) {
      console.error('failed to parse drop data', err)
    }
  }

  const setRefs = (node: HTMLDivElement) => {
    containerref.current = node
    setnoderef(node)
  }

  const [fabriccanvas, setfabriccanvas] = useState<Canvas | null>(null)
  const [selectedids, setselectedids] = useState<Set<string>>(new set())
  const [pdfdoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)

  // spatial index ref for eraser performance
  const spatialindexref = useRef<SpatialIndex | null>(null)
  const rebuildspatialindexref = useRef<(() => void) | null>(null)

  // store state
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
    undo,
    redo,
    layers,
    activeLayerId,
    removeElement,
    setTool,
    setSelectionMode,
    recordOp,
    setSpatialIndex,
    drawingId,
  } = useEdgelessStore()

  // rebuild spatial index helper
  rebuildSpatialIndexRef.current = useCallback(() => {
    if (!fabricCanvas) return
    const index = new SpatialIndex(100)
    const objects = fabricCanvas.getObjects()

    for (const obj of objects) {
      const id = obj.data?.id || `obj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      if (!obj.data?.id) {
        obj.set('data', { ...(obj.data || {}), id })
      }

      const rect = obj.getBoundingRect()
      index.insert({
        id,
        bounds: {
          minX: rect.left,
          minY: rect.top,
          maxX: rect.left + rect.width,
          maxY: rect.top + rect.height,
        },
        layerId: obj.data?.layerId || activeLayerId,
        visible: obj.visible !== false,
        ref: obj,
      })
    }

    spatialIndexRef.current = index
    setSpatialIndex(index)
  }, [fabricCanvas, activeLayerId, setSpatialIndex])

  // hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.ProseMirror')

      if (isTyping) return

      const key = e.key.toLowerCase()
      if (key === 's') {
        setTool('select')
        setSelectionMode('cursor')
        toast.success('selection tool active', { duration: 1000, icon: '🔍' })
      } else if (key === 'b' || key === 'p') {
        setTool('pen')
        toast.success('brush tool active', { duration: 1000, icon: '✏️' })
      } else if (key === 'e') {
        setTool('eraser')
        toast.success('eraser tool active', { duration: 1000, icon: '🧼' })
      } else if (key === 't') {
        setTool('text')
        toast.success('text tool active', { duration: 1000, icon: '🔤' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTool, setSelectionMode])

  // initialize canvas with isolated config
  useEffect(() => {
    if (!canvasEl.current || fabricCanvas) return

    // create canvas with isolated config (no global prototype mutation)
    const canvas = createConfiguredCanvas(canvasEl.current, window.innerWidth, window.innerHeight)

    // scroll wheel: pan by default, zoom with ctrl
    canvas.on('mouse:wheel', (opt: any) => {
      const evt = opt.e
      evt.preventDefault()
      evt.stopPropagation()

      if (evt.ctrlKey || evt.metaKey) {
        const delta = evt.deltaY
        let zoom = canvas.getZoom()
        zoom *= 0.999 ** delta
        if (zoom > 20) zoom = 20
        if (zoom < 0.01) zoom = 0.01

        canvas.zoomToPoint(new Point(evt.offsetX, evt.offsetY), zoom)
      } else {
        const vpt = canvas.viewportTransform
        if (vpt) {
          vpt[4] -= evt.deltaX
          vpt[5] -= evt.deltaY
          canvas.requestRenderAll()
        }
      }

      setViewport({
        x: canvas.viewportTransform?.[4] || 0,
        y: canvas.viewportTransform?.[5] || 0,
        zoom: canvas.getZoom(),
      })
    })

    // panning logic
    let isDragging = false
    let lastPosX = 0
    let lastPosY = 0

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e
      if (activeTool === 'hand' || evt.altKey || evt.button === 1) {
        isDragging = true
        canvas.selection = false
        lastPosX = evt.clientX
        lastPosY = evt.clientY
        canvas.defaultCursor = 'grabbing'
      }
    })

    canvas.on('mouse:move', (opt: any) => {
      if (isDragging) {
        const e = opt.e
        const vpt = canvas.viewportTransform
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
      cleanupFabricConfig(canvas)
      canvas.dispose()
    }
  }, [])

  // oplog load handler
  useEffect(() => {
    if (!fabricCanvas) return

    const handleOplogLoad = async (e: CustomEvent) => {
      const { drawingId: loadId, checkpoint, ops } = e.detail
      console.log('[canvas] loading oplog:', loadId, { hasCheckpoint: !!checkpoint, opCount: ops?.length })

      try {
        await replayOplog(fabricCanvas, checkpoint, ops)
        rebuildSpatialIndexRef.current?.()

        if (onLoad) onLoad()
        toast.success('drawing loaded', { duration: 1500 })
      } catch (err) {
        console.error('[canvas] failed to replay oplog:', err)
        toast.error('failed to load drawing')
      }
    }

    window.addEventListener('pkm:load-oplog', handleOplogLoad as any)

    return () => {
      window.removeEventListener('pkm:load-oplog', handleOplogLoad as any)
    }
  }, [fabricCanvas, onLoad])

  // expose helpers
  useEffect(() => {
    if (!fabricCanvas) return

    ;(window as any).pkmGetCanvasJSON = () => {
      return fabricCanvas.toJSON()
    }
    ;(window as any).pkmGetCanvasThumbnail = () => {
      return fabricCanvas.toDataURL({
        format: 'png',
        multiplier: 0.2,
        quality: 0.8,
      })
    }

    return () => {
      delete (window as any).pkmGetCanvasJSON
      delete (window as any).pkmGetCanvasThumbnail
    }
  }, [fabricCanvas])

  // handle tools
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
      fabricCanvas.isDrawingMode = false
      fabricCanvas.defaultCursor = 'none'
    } else if (activeTool === 'select') {
      const selMode = useEdgelessStore.getState().selectionMode

      if (selMode === 'cursor') {
        fabricCanvas.isDrawingMode = false
        fabricCanvas.defaultCursor = 'default'
        fabricCanvas.selection = false
      } else if (selMode === 'rect') {
        fabricCanvas.isDrawingMode = false
        fabricCanvas.defaultCursor = 'default'
        fabricCanvas.selection = true
      } else {
        fabricCanvas.isDrawingMode = false
        fabricCanvas.defaultCursor = 'crosshair'
        fabricCanvas.selection = false
      }
    } else {
      fabricCanvas.isDrawingMode = false
      fabricCanvas.defaultCursor = 'default'
      fabricCanvas.selection = true
    }
  }, [fabricCanvas, mode, activeTool, penColor, penWidth])

  // pen settings
  const { stabilizerLevel, pressureEnabled } = useEdgelessStore()
  useEffect(() => {
    if (!fabricCanvas || activeTool !== 'pen' || mode !== 'draw') return

    const brush = fabricCanvas.freeDrawingBrush as PencilBrush
    if (brush) {
      brush.width = penWidth
      brush.color = penColor
      brush.decimate = 0.4 + (stabilizerLevel / 100) * 5
    }
  }, [fabricCanvas, activeTool, mode, penWidth, penColor, stabilizerLevel, pressureEnabled])

  // interact/cursor mode
  useEffect(() => {
    if (!fabriccanvas) return

    const selmode = useedgelessstore.getstate().selectionmode
    const iscursormode = activetool === 'select' && selmode === 'cursor'
    const isinteractmode = mode === 'interact'

    if (isinteractmode || iscursormode) {
      fabriccanvas.selection = false
      fabriccanvas.defaultcursor = 'default'

      const _objs = fabriccanvas.getobjects()
      for (let i = 0; i < _objs.length; i++) {
        _objs[i].selectable = false
        _objs[i].evented = false
      }
      fabricCanvas.requestRenderAll()
    } else if (activeTool === 'select' && selMode === 'grab') {
      fabricCanvas.selection = true
      fabricCanvas.defaultCursor = 'grab'

      const _objs = fabricCanvas.getObjects()
      for (let i = 0; i < _objs.length; i++) {
        _objs[i].selectable = true
        _objs[i].evented = true
      }
      fabricCanvas.requestRenderAll()
    } else if (activeTool === 'select' && (selMode === 'free' || selMode === 'magic')) {
      const _objs = fabricCanvas.getObjects()
      for (let i = 0; i < _objs.length; i++) {
        _objs[i].selectable = false
        _objs[i].evented = false
      }
    } else {
      fabricCanvas.selection = false
      const _objs = fabricCanvas.getObjects()
      for (let i = 0; i < _objs.length; i++) {
        _objs[i].selectable = false
        _objs[i].evented = false
      }
    }
  }, [fabricCanvas, mode, activeTool])

  // pressure sensitivity
  useEffect(() => {
    if (!fabricCanvas) return

    const canvasEl = fabricCanvas.getElement()
    if (!canvasEl) return

    const basePenWidth = penWidth

    const handlePointerMove = (e: PointerEvent) => {
      const state = useEdgelessStore.getState()
      if (state.mode !== 'draw' || state.activeTool !== 'pen' || !state.pressureEnabled) return
      if (!fabricCanvas.isDrawingMode) return

      const pressure = e.pressure || 0.5

      if (e.pointerType === 'pen' || e.pointerType === 'touch') {
        const brush = fabricCanvas.freeDrawingBrush
        if (brush) {
          const minScale = 0.2
          const maxScale = 1.5
          const scale = minScale + pressure * (maxScale - minScale)
          brush.width = basePenWidth * scale
        }
      }
    }

    const handlePointerUp = () => {
      const brush = fabricCanvas.freeDrawingBrush
      if (brush) {
        brush.width = basePenWidth
      }
    }

    canvasEl.addEventListener('pointermove', handlePointerMove, { passive: true })
    canvasEl.addEventListener('pointerup', handlePointerUp)
    canvasEl.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvasEl.removeEventListener('pointermove', handlePointerMove)
      canvasEl.removeEventListener('pointerup', handlePointerUp)
      canvasEl.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [fabricCanvas, penWidth])

  // sync selection state
  useEffect(() => {
    if (!fabricCanvas) return

    const updateSelection = () => {
      const active = fabriccanvas.getactiveobjects()
      const newset = new set<string>()
      for (let i = 0; i < active.length; i++) {
        const id = active[i].data?.id
        if (id) newSet.add(id)
      }
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

  // path:created handler - record to oplog
  useEffect(() => {
    if (!fabricCanvas || !drawingId) return

    const handlePathCreated = (e: any) => {
      const path = e.path
      if (!path) return

      // ensure id
      const id = `path-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      path.set('data', {
        id,
        layerId: activeLayerId,
        createdAt: Date.now(),
      })

      // record to oplog
      recordOp({
        type: 'path',
        layerId: activeLayerId,
        pathData: path.path,
        stroke: path.stroke,
        strokeWidth: path.strokeWidth,
        left: path.left,
        top: path.top,
      })

      // update spatial index
      rebuildSpatialIndexRef.current?.()

      // save checkpoint every 20 paths
      let pathCount = 0
      const _objs = fabricCanvas.getObjects()
      for (let i = 0; i < _objs.length; i++) {
        if ((_objs[i] as any).type === 'path') pathCount++
      }
      if (pathCount % 20 === 0) {
        saveCheckpoint(drawingId, fabricCanvas.toJSON())
      }
    }

    fabricCanvas.on('path:created', handlePathCreated)

    return () => {
      fabriccanvas.off('path:created', handlepathcreated)
    }
  }, [fabriccanvas, drawingid, activelayerid, recordop])

  // selection safeguards
  const longpresstimerref = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!fabricCanvas) return

    const handleDown = (opt: any) => {
      const evt = opt.e
      const isRightClick = evt.button === 2 || evt.which === 3
      const isBackground = !opt.target

      if (isRightClick && isBackground) {
        fabricCanvas.discardActiveObject()
        fabricCanvas.requestRenderAll()
        return
      }

      if (isBackground && !isRightClick) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = setTimeout(() => {
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
      if (!e.e) return
      if (fabricCanvas.findTarget(e.e, false)) return

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

  // lasso selection
  useEffect(() => {
    if (!fabricCanvas) return

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

        activeLine = new fabric.Polyline(points, {
          stroke: 'hsl(37, 92%, 52%)', // #f6b012
          strokeWidth: 2,
          strokeDashArray: [2, 4],
          strokeLineCap: 'round',
          fill: 'transparent',
          selectable: false,
          evented: false,
          opacity: 0.8,
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
      if (!islassoing) return
      islassoing = false

      if (activeline) {
        fabriccanvas.remove(activeline)
        activeline = null
      }

      if (points.length < 5) return

      const polygon = new fabric.Polygon(points, {})
      const objects = fabricCanvas.getObjects()
      const toSelect: any[] = []
      const buffer = 10

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i]
        if (!obj.selectable && obj.type !== 'path' && obj.type !== 'group') continue
        if (obj === activeLine) continue

        if (polygon.containsPoint(obj.getCenterPoint())) {
          toSelect.push(obj)
          continue
        }

        if (polygon.intersectsWithObject(obj)) {
          toSelect.push(obj)
          continue
        }

        const rect = obj.getBoundingRect()
        const tl = new Point(rect.left - buffer, rect.top - buffer)
        const br = new Point(rect.left + rect.width + buffer, rect.top + rect.height + buffer)

        if (polygon.intersectsWithRect(tl, br)) {
          toSelect.push(obj)
        }
      }

      if (toSelect.length > 0) {
        for (let i = 0; i < toSelect.length; i++) {
          toSelect[i].selectable = true
          toSelect[i].evented = true
        }

        const sel = new fabric.ActiveSelection(toSelect, { canvas: fabricCanvas })
        fabricCanvas.setActiveObject(sel)
        fabricCanvas.requestRenderAll()

        useEdgelessStore.getState().setSelectionMode('grab')
      }

      points = []
    }

    const handleSelectionCleared = (e: any) => {
      const objs = e.deselected || []
      for (let i = 0; i < objs.length; i++) {
        objs[i].selectable = false
        objs[i].evented = false
      }
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
  }, [fabricCanvas])

  // eraser with spatial index
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
  const isErasingRef = useRef(false)

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

  // spatial-indexed eraser
  useEffect(() => {
    if (!fabricCanvas || !drawingId) return

    const handleDown = (opt: any) => {
      if (activeTool === 'eraser' && mode === 'draw') {
        isErasingRef.current = true
        doErase(opt)
      }
    }

    const handleUp = () => {
      if (isErasingRef.current) {
        isErasingRef.current = false
        // save checkpoint after erase completes
        saveCheckpoint(drawingId, fabricCanvas.toJSON())
      }
    }

    const doErase = (opt: any) => {
      const e = opt.e
      const clientx = e.clientx || e.touches?.[0]?.clientx
      const clienty = e.clienty || e.touches?.[0]?.clienty
      if (clientx) setcursorpos({ x: clientx, y: clienty })

      if (activetool !== 'eraser' || mode !== 'draw' || !iserasingref.current) return

      const pointer = fabriccanvas.getscenepoint(e)
      const eraserwidth = useedgelessstore.getstate().eraserwidth
      const r = eraserwidth / 2

      // use spatial index if available
      const index = spatialindexref.current
      let candidates: any[] = []

      if (index) {
        index.setlayerfilter(activelayerid)
        const hits = index.queryradius(pointer.x, pointer.y, r)
        candidates = new array(hits.length)
        for (let i = 0; i < hits.length; i++) {
          candidates[i] = hits[i].ref
        }
      } else {
        // fallback to full scan
        candidates = fabricCanvas.getObjects()
      }

      const toRemove: fabric.Object[] = []
      const toAdd: fabric.Object[] = []

      const rSq = r * r
      for (let ci = 0; ci < candidates.length; ci++) {
        const obj = candidates[ci]
        if (!obj || !obj.visible) continue

        // check intersection
        const bounds = obj.getBoundingRect()
        const centerX = bounds.left + bounds.width / 2
        const centerY = bounds.top + bounds.height / 2
        const dx = centerX - pointer.x
        const dy = centerY - pointer.y
        const distSq = dx * dx + dy * dy

        if (distSq > (r + math.max(bounds.width, bounds.height) / 2) ** 2) continue

        if (obj.type !== 'path') {
          // non-path objects: remove if center in range
          if (distsq < rSq) {
            toRemove.push(obj)
            recordOp({
              type: 'delete',
              targetId: obj.data?.id,
              layerId: obj.data?.layerId || activeLayerId,
            })
          }
          continue
        }

        // path objects: check for actual intersection
        const path = obj as fabric.Path
        const pathData = path.path
        if (!pathData || pathData.length < 2) continue

        let hit = false
        let currentPt = { x: 0, y: 0 }

        for (let i = 0; i < pathData.length; i++) {
          const cmd = pathData[i]
          const type = cmd[0] as string

          if (type === 'M') {
            currentPt = { x: cmd[1] as number, y: cmd[2] as number }
          } else if (type === 'Q') {
            const bx = cmd[1] as number
            const by = cmd[2] as number
            const endPt = { x: cmd[3] as number, y: cmd[4] as number }
            // sample the curve
            for (let t = 0; t <= 10; t++) {
              const tt = t / 10
              const x = (1 - tt) * (1 - tt) * currentPt.x + 2 * (1 - tt) * tt * bx + tt * tt * endPt.x
              const y = (1 - tt) * (1 - tt) * currentPt.y + 2 * (1 - tt) * tt * by + tt * tt * endPt.y
              const dx2 = x - pointer.x
              const dy2 = y - pointer.y
              if (dx2 * dx2 + dy2 * dy2 < rSq) {
                hit = true
                break
              }
            }
            if (hit) break
            currentPt = endPt
          } else if (type === 'L') {
            const endPt = { x: cmd[1] as number, y: cmd[2] as number }
            for (let t = 0; t <= 10; t++) {
              const px = currentPt.x + (endPt.x - currentPt.x) * (t / 10)
              const py = currentPt.y + (endPt.y - currentPt.y) * (t / 10)
              const dx2 = px - pointer.x
              const dy2 = py - pointer.y
              if (dx2 * dx2 + dy2 * dy2 < rSq) {
                hit = true
                break
              }
            }
            if (hit) break
            currentPt = endPt
          }
        }

        if (hit) {
          toRemove.push(obj)
          recordOp({
            type: 'delete',
            targetId: obj.data?.id,
            layerId: obj.data?.layerId || activeLayerId,
          })
        }
      }

      if (toRemove.length > 0) {
        for (let i = 0; i < toRemove.length; i++) {
          fabricCanvas.remove(toRemove[i])
        }
        fabricCanvas.requestRenderAll()
        rebuildSpatialIndexRef.current?.()
      }
    }

    const handleMove = (opt: any) => {
      const e = opt.e
      const clientX = e.clientX || e.touches?.[0]?.clientX
      const clientY = e.clientY || e.touches?.[0]?.clientY
      if (clientX && activeTool === 'eraser') {
        setCursorPos({ x: clientX, y: clientY })
      }

      if (isErasingRef.current) {
        doErase(opt)
      }
    }

    fabricCanvas.on('mouse:down', handleDown)
    fabricCanvas.on('mouse:up', handleUp)
    fabricCanvas.on('mouse:move', handleMove)

    return () => {
      fabricCanvas.off('mouse:down', handleDown)
      fabricCanvas.off('mouse:up', handleUp)
      fabricCanvas.off('mouse:move', handleMove)
    }
  }, [fabricCanvas, activeTool, mode, drawingId, activeLayerId, recordOp])

  // undo/redo shortcuts
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleDown)
    return () => window.removeEventListener('keydown', handleDown)
  }, [undo, redo])

  // delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas?.getActiveObjects()
        if (activeObjects && activeObjects.length > 0) {
          e.preventdefault()
          for (let i = 0; i < activeObjects.length; i++) {
            const obj: any = activeObjects[i]
            if (obj.data?.id) {
              removeElement(obj.data.id)
              recordOp({
                type: 'delete',
                targetId: obj.data.id,
                layerId: obj.data?.layerId || activeLayerId,
              })
            }
          }
          fabricCanvas?.discardActiveObject()
          fabricCanvas?.requestRenderAll()
          rebuildSpatialIndexRef.current?.()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [fabricCanvas, removeElement, activeLayerId, recordOp])

  // touch gestures
  useEffect(() => {
    if (!fabricCanvas) return

    let fingers = 0
    let isPanning = false
    let lastCenter: { x: number; y: number } | null = null
    let lastDistance: number | null = null
    let startFingers = 0
    let hasMoved = false

    const getCenter = (touches: TouchList) => {
      if (touches.length < 2) return null
      const t1 = touches[0]
      const t2 = touches[1]
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      }
    }

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return null
      const t1 = touches[0]
      const t2 = touches[1]
      return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2))
    }

    const handleTouchStart = (e: TouchEvent) => {
      fingers = e.touches.length
      startFingers = fingers
      hasMoved = false

      if (fingers === 2) {
        isPanning = true
        lastCenter = getCenter(e.touches)
        lastDistance = getDistance(e.touches)
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
          const scale = newDistance / lastDistance

          if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || Math.abs(scale - 1) > 0.01 || hasMoved) {
            hasMoved = true

            const vpt = fabricCanvas.viewportTransform
            if (vpt) {
              if (Math.abs(scale - 1) > 0.005) {
                let zoom = fabricCanvas.getZoom() * scale
                if (zoom > 20) zoom = 20
                if (zoom < 0.1) zoom = 0.1

                const rect = canvasContainer?.getBoundingClientRect()
                const offsetX = newCenter.x - (rect?.left || 0)
                const offsetY = newCenter.y - (rect?.top || 0)
                fabricCanvas.zoomToPoint(new Point(offsetX, offsetY), zoom)
              }

              vpt[4] += dx
              vpt[5] += dy
              fabricCanvas.requestRenderAll()
              setViewport({ x: vpt[4], y: vpt[5], zoom: fabricCanvas.getZoom() })
            }

            lastCenter = newCenter
            lastDistance = newDistance
            e.preventDefault()
          }
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!hasmoved) {
        if (startfingers === 2) {
          undo()
        }
        if (startfingers === 3) {
          redo()
        }
      }

      if (e.touches.length < 2) {
        isPanning = false
        lastCenter = null

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
  }, [fabricCanvas, undo, redo, mode, setViewport])

  // resize handler
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.setDimensions({ width, height })
    }
  }, [width, height, fabricCanvas])

  // paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text')
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        const { x, y } = viewPort
        addElement({
          type: 'embed-web',
          x: -x + 100,
          y: -y + 100,
          width: 400,
          height: 300,
          data: { url: text },
        })
        useEdgelessStore.setState({ activeTool: 'select' })
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeeventlistener('paste', handlepaste)
  }, [viewport, addelement])

  const fileinputref = useRef<HTMLInputElement>(null)

  const handleupload = (e: react.changeevent<HTMLInputElement>) => {
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
      data: { src: url },
    })

    useEdgelessStore.setState({ activeTool: 'select' })
  }

  // context menu handler
  useEffect(() => {
    if (!fabricCanvas) return

    const upperCanvas = fabricCanvas.getSelectionElement()

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const target = fabricCanvas.findTarget(e, false)
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
      }
    }

    upperCanvas.addEventListener('contextmenu', handleContextMenu)

    return () => {
      upperCanvas.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [fabricCanvas])

  // calculate screen positions for elements
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

  // memoized overlay elements to avoid unnecessary remounts during unrelated renders
  const overlayElements = useMemo(() => {
    if (!fabriccanvas) return null
    const out: react.reactnode[] = []
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const { x: screenX, y: screenY, w: screenW, h: screenH } = getScreenPos(el)
      const isSelected = selectedIds.has(el.id)
      const bgPointerEvents = isSelected ? 'pointer-events-none select-none' : 'pointer-events-auto'

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
              className={`absolute bg-[#090909] border border-white/10 shadow-lg ${bgPointerEvents}`}
              style={elementStyle}
            >
              <PdfElement element={el} pdfDocument={pdfDoc} />
            </div>
          )
          break
        case 'image':
          out.push(
            <div key={el.id} className="absolute shadow-lg pointer-events-auto" style={elementStyle}>
              <img src={el.data?.src || el.data?.url} className="w-full h-full object-cover" draggable={false} />
            </div>
          )
          break
        case 'embed':
        case 'embed-web':
        case 'embed-nocobase':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <EmbedElement element={el} />
            </div>
          )
          break
        case 'link-card':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <LinkElement element={el} />
            </div>
          )
          break
        case 'record-node':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <RecordNodeElement element={el} />
            </div>
          )
          break
        case 'database-card':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
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
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <PortalElement element={el} />
            </div>
          )
          break
        case 'eternal-flame':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <EternalFlame element={el} />
            </div>
          )
          break
        case 'contact-card':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <ContactElement element={el} />
            </div>
          )
          break
        case 'offering-drop':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <OfferingDrop element={el} />
            </div>
          )
          break
        case 'shopping-card':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <ShoppingCard element={el} />
            </div>
          )
          break
        case 'gold-pile':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <GoldPile element={el} />
            </div>
          )
          break
        case 'floating-reminder':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <FloatingReminder element={el} />
            </div>
          )
          break
        case 'tier-list':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
              <TierListElement element={el} />
            </div>
          )
          break
        case 'sleep-ring':
          out.push(
            <div key={el.id} className="absolute pointer-events-auto" style={elementStyle}>
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
              className="absolute pointer-events-auto"
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
  }, [elements, selectedids, fabriccanvas, viewport.x, viewport.y, viewport.zoom, pdfdoc])

  const eraserwidth = useedgelessstore.getstate().eraserwidth

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className || ''}`}
      ref={setRefs}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        if (fabricCanvas) {
          fabricCanvas.discardActiveObject()
          fabricCanvas.requestRenderAll()
        }
      }}
    >
      {/* upload button */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          className="p-2 bg-black border border-white/20 rounded-md shadow hover:bg-white/10 transition-colors text-foreground"
          onClick={() => fileInputRef.current?.click()}
          title="upload image/pdf"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleUpload}
          accept="image/*,application/pdf"
        />
      </div>

      {/* fabric canvas */}
      <canvas ref={canvasEl} />

      {/* page boundary indicator */}
      {(() => {
        if (canvasconfig.mode === 'edgeless') return null

        const width = canvasconfig.mode === 'desktop-8k' ? 7680 : 4320
        const height = canvasconfig.mode === 'desktop-8k' ? 4320 : 9360

        const zoom = viewport.zoom
        const panx = viewport.x
        const pany = viewport.y

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
              {canvasconfig.mode === 'desktop-8k' ? '8k desktop (7680x4320)' : '8k iphone (4320x9360)'}
            </div>
          </div>
        )
      })()}

      {/* children layer */}
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

      {/* element overlays */}
      {fabriccanvas && overlayelements}

      {/* eraser cursor */}
      {activetool === 'eraser' && (
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