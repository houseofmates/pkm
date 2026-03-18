import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { appendOp, appendOps, saveCheckpoint, getLatestCheckpoint, getRecentOps } from './storage/canvas-db'
import type { DrawOp, OpLogEntry } from './storage/oplog'
import { canvasSync } from './sync/canvas-sync'
import { SpatialIndex } from './spatial/spatial-index'
import { secureLogger } from '@/lib/secure-logger'
import type * as fabric from 'fabric'
import { useShallow } from 'zustand/react/shallow'

const OPLOG_FLUSH_DELAY_MS = 120
const OPLOG_FLUSH_BATCH_SIZE = 50

const pendingOpsByDrawing = new Map<string, OpLogEntry[]>()
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>()

async function flushPendingOps(drawingId: string) {
  const ops = pendingOpsByDrawing.get(drawingId)
  if (!ops || ops.length === 0) return

  // flush in bounded batches to avoid blocking the main thread
  const batch = ops.splice(0, OPLOG_FLUSH_BATCH_SIZE)

  try {
    await appendOps(drawingId, batch)
  } catch (e) {
    secureLogger.error('[oplog] flush failed', e)
    // keep ops in memory, so we can retry
    ops.unshift(...batch)
  } finally {
    if (ops.length > 0) {
      scheduleFlush(drawingId)
    } else {
      pendingOpsByDrawing.delete(drawingId)
    }
  }
}

function scheduleFlush(drawingId: string) {
  if (flushTimers.has(drawingId)) return
  const timer = setTimeout(() => {
    flushTimers.delete(drawingId)
    void flushPendingOps(drawingId)
  }, OPLOG_FLUSH_DELAY_MS)
  flushTimers.set(drawingId, timer)
}

/**
 * Force immediate persistence of any queued operations for a drawing.
 *
 * This is used for critical moments such as page unload to avoid losing
 * recent user input before the debounce timer fires.
 */
export async function flushDrawingOps(drawingId: string): Promise<void> {
  if (!drawingId) return
  const timer = flushTimers.get(drawingId)
  if (timer) {
    clearTimeout(timer)
    flushTimers.delete(drawingId)
  }
  await flushPendingOps(drawingId)
}

export type ElementType =
  | 'pdf-page'
  | 'note'
  | 'embed-nocobase'
  | 'embed-web'
  | 'smart-link'
  | 'image'
  | 'link-card'
  | 'database-card'
  | 'record-node'
  | 'shopping-card'
  | 'gold-pile'
  | 'floating-reminder'
  | 'sleep-ring'
  | 'tier-list'
  | 'embed'
  | 'eternal-flame'
  | 'offering-drop'
  | 'portal'
  | 'connector'
  | 'smart-text'
  | 'contact-card'
  | 'widget'

export interface EdgelessLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
}

export interface EdgelessElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  data: unknown
  locked?: boolean
  layerId?: string
  connectorData?: {
    startId: string
    endId: string
    strokeColor?: string
    strokeWidth?: number
  }
}

export type ToolType = 'select' | 'hand' | 'pen' | 'eraser' | 'text' | 'smart-text' | 'lasso' | 'transform' | 'selection'

// oplog-based history state (replaces json snapshot stack)
export interface OplogHistory {
  ops: string[] // oplog entry ids
  undone: string[] // ids of undone ops for redo
}

interface EdgelessState {
  // canvas identity
  drawingId: string
  setDrawingId: (id: string) => void

  // fabric canvas reference (shared)
  fabricCanvas: fabric.Canvas | null
  setFabricCanvas: (c: fabric.Canvas | null) => void

  // selected objects (ids)
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void

  activeElementId: string | null
  setActiveElementId: (id: string | null) => void

  // pdf document
  pdfDoc: unknown | null
  setPdfDoc: (doc: unknown | null) => void

  // layers
  layers: EdgelessLayer[]
  activeLayerId: string

  // elements (non-canvas html overlays)
  elements: EdgelessElement[]
  // O(1) lookup map kept in sync with elements array
  elementMap: Map<string, EdgelessElement>

  // viewport
  viewPort: { x: number; y: number; zoom: number }

  // interaction mode
  mode: 'interact' | 'draw'
  activeTool: ToolType

  // canvas config
  canvasConfig: {
    mode: 'edgeless' | 'desktop-8k' | 'iphone-8k'
    width?: number
    height?: number
  }

  // spatial index for fast lookup
  spatialIndex: SpatialIndex | null

  // history (oplog-based)
  history: OplogHistory

  // ui state
  selectionMode: 'cursor' | 'free' | 'rect' | 'magic' | 'grab'
  eraserWidth: number
  textSize: number
  isChatOpen: boolean
  isLinking: boolean
  penWidth: number
  penColor: string
  penOpacity: number
  eraserOpacity: number
  stabilizerLevel: number
  pressureEnabled: boolean

  // actions
  addLayer: (name: string) => void
  removeLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  setActiveLayer: (id: string) => void

  addElement: (el: Omit<EdgelessElement, 'id'>) => void
  setElements: (elements: EdgelessElement[]) => void
  updateElement: (id: string, patch: Partial<EdgelessElement>) => void
  toggleElementLock: (id: string) => void
  removeElement: (id: string) => void

  setMode: (mode: 'interact' | 'draw') => void
  setTool: (tool: ToolType) => void
  setViewport: (vp: { x: number; y: number; zoom: number }) => void
  setCanvasConfig: (config: Partial<EdgelessState['canvasConfig']>) => void

  // history actions (oplog-based)
  recordOp: (op: DrawOp) => Promise<void>
  undo: () => Promise<void>
  redo: () => Promise<void>
  loadFromOplog: (drawingId: string) => Promise<void>

  // spatial index actions
  setSpatialIndex: (index: SpatialIndex | null) => void
  rebuildSpatialIndex: (canvas: fabric.Canvas | null) => void

  // ui actions
  setSelectionMode: (mode: 'cursor' | 'free' | 'rect' | 'magic' | 'grab') => void
  setEraserWidth: (width: number) => void
  setTextSize: (size: number) => void
  setChatOpen: (open: boolean) => void
  setIsLinking: (linking: boolean) => void
  setPenWidth: (width: number) => void
  setPenColor: (color: string) => void
  setPenOpacity: (opacity: number) => void
  setEraserOpacity: (opacity: number) => void
  setStabilizerLevel: (level: number) => void
  setPressureEnabled: (enabled: boolean) => void
}

// ─── helpers ────────────────────────────────────────────────────────────────────

/** Build a Map<id, element> from an array – used by every mutation */
function buildMap(elements: EdgelessElement[]): Map<string, EdgelessElement> {
  const m = new Map<string, EdgelessElement>()
  for (const el of elements) m.set(el.id, el)
  return m
}

// ─── store ──────────────────────────────────────────────────────────────────────

export const useEdgelessStore = create<EdgelessState>()((set, get) => ({
  // identity
  drawingId: '',
  setDrawingId: (id) => {
    set({ drawingId: id })
    // start sync for this drawing
    canvasSync.start()
  },

  // layers
  layers: [{ id: 'default', name: 'layer 1', visible: true, locked: false }],
  activeLayerId: 'default',

  // elements
  elements: [],
  elementMap: new Map(),

  // viewport
  viewPort: { x: 0, y: 0, zoom: 1 },

  // mode
  mode: 'draw',
  activeTool: 'select',

  // config
  canvasConfig: { mode: 'edgeless' },

  // spatial index
  spatialIndex: null,

  // history (empty oplog)
  history: { ops: [], undone: [] },

  // ui defaults
  selectionMode: 'grab',
  eraserWidth: 20,
  textSize: 40,
  isChatOpen: false,
  isLinking: false,
  penWidth: 4,
  penColor: '#ffffff', penOpacity: 100,
  eraserOpacity: 100, stabilizerLevel: 0,
  pressureEnabled: true,

  // canvas refs and helpers
  fabricCanvas: null,
  selectedIds: new Set(),
  activeElementId: null,
  pdfDoc: null,

  // layer actions
  addLayer: (name) =>
    set((state) => {
      const newLayer = { id: uuidv4(), name, visible: true, locked: false }
      return {
        layers: [newLayer, ...state.layers],
        activeLayerId: newLayer.id,
      }
    }),

  removeLayer: (id) =>
    set((state) => {
      if (state.layers.length <= 1) return state
      const remaining = state.layers.filter((l) => l.id !== id)
      const newElements = state.elements.filter((el) => el.layerId !== id)
      return {
        layers: remaining,
        activeLayerId: state.activeLayerId === id ? remaining[0].id : state.activeLayerId,
        elements: newElements,
        elementMap: buildMap(newElements),
      }
    }),

  toggleLayerVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),

  toggleLayerLock: (id) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    })),

  setActiveLayer: (id) => set({ activeLayerId: id }),

  // element actions ─── all keep elementMap in sync ──────────────────────────
  addElement: (el) =>
    set((state) => {
      const newEl: EdgelessElement = { ...el, id: uuidv4(), layerId: el.layerId || state.activeLayerId }
      const newElements = [...state.elements, newEl]
      const newMap = new Map(state.elementMap)
      newMap.set(newEl.id, newEl)
      return { elements: newElements, elementMap: newMap }
    }),

  setElements: (elements) => set({ elements, elementMap: buildMap(elements) }),

  updateElement: (id, patch) =>
    set((state) => {
      const existing = state.elementMap.get(id)
      if (!existing) return state
      const updated = { ...existing, ...patch }
      // Only create a new array if something actually changed
      if (updated === existing) return state
      const newMap = new Map(state.elementMap)
      newMap.set(id, updated)
      const newElements = state.elements.map((el) => (el.id === id ? updated : el))
      return { elements: newElements, elementMap: newMap }
    }),

  toggleElementLock: (id) =>
    set((state) => {
      const existing = state.elementMap.get(id)
      if (!existing) return state
      const updated = { ...existing, locked: !existing.locked }
      const newMap = new Map(state.elementMap)
      newMap.set(id, updated)
      const newElements = state.elements.map((el) => (el.id === id ? updated : el))
      return { elements: newElements, elementMap: newMap }
    }),

  removeElement: (id) =>
    set((state) => {
      const newElements = state.elements.filter((el) => el.id !== id)
      const newMap = new Map(state.elementMap)
      newMap.delete(id)
      return { elements: newElements, elementMap: newMap }
    }),

  // mode actions
  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ activeTool: tool }),
  setViewport: (viewPort) => set({ viewPort }),
  setCanvasConfig: (config) =>
    set((state) => ({
      canvasConfig: { ...state.canvasConfig, ...config },
    })),

  // oplog-based history
  recordOp: async (op) => {
    const { drawingId, history, activeLayerId } = get()
    if (!drawingId) return

    // apply strong typing/copy to avoid mutation from outside
    const opWithLayer = {
      ...(op as any),
      layerId: (op as any).layerId || activeLayerId,
    }

    const entry: OpLogEntry = {
      id: `${drawingId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      drawingId,
      timestamp: Date.now(),
      op: opWithLayer,
      synced: false,
    }

    // optimistic UI: update history immediately
    set((state) => ({
      history: {
        ops: [...state.history.ops, entry.id],
        undone: [], // clear redo on new action
      },
    }))

    // buffer for batched persistence
    const buffer = pendingOpsByDrawing.get(drawingId) ?? []
    if (!pendingOpsByDrawing.has(drawingId)) pendingOpsByDrawing.set(drawingId, buffer)
    buffer.push(entry)
    scheduleFlush(drawingId)

    // mark as pending in metadata (async, non-blocking)
    void updateDrawingMeta(drawingId, { syncState: 'pending' }).catch((e) => {
      secureLogger.error('[oplog] updateDrawingMeta failed', e)
    })
  },

  undo: async () => {
    const { history, drawingId } = get()
    if (history.ops.length === 0) return

    // move last op to undone stack
    const lastId = history.ops[history.ops.length - 1]
    const remaining = history.ops.slice(0, -1)

    set({
      history: {
        ops: remaining,
        undone: [lastId, ...history.undone],
      },
    })

    // reload state from oplog minus the undone op
    // (in a full implementation, we'd compute inverse ops or reload from checkpoint)
    console.info('undo:', lastId)

    // save checkpoint after significant undo
    if (remaining.length % 20 === 0) {
      // checkpoint saved via canvas event
    }
  },

  redo: async () => {
    const { history } = get()
    if (history.undone.length === 0) return

    const nextId = history.undone[0]
    const remaining = history.undone.slice(1)

    set({
      history: {
        ops: [...history.ops, nextId],
        undone: remaining,
      },
    })

    console.info('redo:', nextId)
  },

  loadFromOplog: async (drawingId) => {
    // load checkpoint + recent ops
    const checkpoint = await getLatestCheckpoint(drawingId)
    const ops = await getRecentOps(drawingId, 500)

    console.info('loading drawing', drawingId, {
      hasCheckpoint: !!checkpoint,
      opCount: ops.length,
    })

    // set drawing id
    set({ drawingId })

    // emit event for canvas to load
    window.dispatchEvent(
      new CustomEvent('pkm:load-oplog', {
        detail: { drawingId, checkpoint, ops },
      })
    )
  },

  // spatial index
  setSpatialIndex: (index) => set({ spatialIndex: index }),

  rebuildSpatialIndex: (canvas: fabric.Canvas | null) => {
    if (!canvas) return

    const index = new SpatialIndex(100)
    const objects = canvas.getObjects()

    for (const obj of objects) {
      const id = obj.data?.id || `obj-${Math.random().toString(36).slice(2, 9)}`
      obj.set('data', { ...(obj.data || {}), id })

      const rect = obj.getBoundingRect()
      index.insert({
        id,
        bounds: {
          minX: rect.left,
          minY: rect.top,
          maxX: rect.left + rect.width,
          maxY: rect.top + rect.height,
        },
        layerId: obj.data?.layerId || 'default',
        visible: obj.visible !== false,
        ref: obj,
      })
    }

    set({ spatialIndex: index })
  },

  // ui actions
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setEraserWidth: (width) => set({ eraserWidth: width }),
  setPenOpacity: (o) => set({ penOpacity: o }),
  setEraserOpacity: (o) => set({ eraserOpacity: o }),
  setTextSize: (size) => set({ textSize: size }),
  setChatOpen: (open) => set({ isChatOpen: open }),
  setIsLinking: (linking) => set({ isLinking: linking }),
  setPenWidth: (width) => set({ penWidth: width }),
  setPenColor: (color) => set({ penColor: color }),
  setStabilizerLevel: (level) => set({ stabilizerLevel: level }),
  setPressureEnabled: (enabled) => set({ pressureEnabled: enabled }),
  // new canvas helpers
  setFabricCanvas: (c) => set({ fabricCanvas: c }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setActiveElementId: (id) => set({ activeElementId: id }),
  setPdfDoc: (doc) => set({ pdfDoc: doc }),
  addHistoryOp: async (op: DrawOp) => { // alias to recordOp
    await get().recordOp(op as any)
  },
}))

// ─── granular selectors ─────────────────────────────────────────────────────────
// These hooks subscribe to a single slice of state, preventing cascading re-renders.

/** Subscribe to a single element by ID. Returns undefined if not found.
 *  The component only re-renders when *this specific element object* changes. */
export function useElement(id: string): EdgelessElement | undefined {
  return useEdgelessStore((s) => s.elementMap.get(id))
}

/** Subscribe to the viewport with shallow equality – prevents re-render
 *  when the reference changes but x/y/zoom values are identical. */
export function useViewport() {
  return useEdgelessStore(useShallow((s: EdgelessState) => s.viewPort))
}

/** Subscribe to the element IDs array only (not the element objects).
 *  Re-renders only when elements are added/removed, not when one is moved. */
export function useElementIds(): string[] {
  return useEdgelessStore(
    useShallow((s: EdgelessState) => s.elements.map((e) => e.id))
  )
}

/** Subscribe to the active tool */
export function useActiveTool(): ToolType {
  return useEdgelessStore((s) => s.activeTool)
}

/** Subscribe to selection mode */
export function useSelectionMode() {
  return useEdgelessStore((s) => s.selectionMode)
}

// import for meta update
import { updateDrawingMeta } from './storage/canvas-db'
