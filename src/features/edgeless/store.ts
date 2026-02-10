import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export type ElementType = 'pdf-page' | 'note' | 'embed-nocobase' | 'embed-web' | 'smart-link' | 'image' | 'link-card' | 'database-card' | 'record-node' | 'shopping-card' | 'gold-pile' | 'floating-reminder' | 'sleep-ring' | 'tier-list' | 'embed' | 'eternal-flame' | 'offering-drop' | 'portal' | 'connector' | 'smart-text' | 'contact-card'

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
    data: any // Flexible payload for PDF page info, URL, etc.
    locked?: boolean
    layerId?: string // Optional for backward compatibility, defaults to 'default'

    // Connector specific props
    connectorData?: {
        startId: string
        endId: string
        strokeColor?: string
        strokeWidth?: number
    }
}

export type ToolType = 'select' | 'hand' | 'pen' | 'eraser' | 'text' | 'smart-text'

interface EdgelessState {
    // Canvas State
    layers: EdgelessLayer[]
    activeLayerId: string
    elements: EdgelessElement[]
    viewPort: { x: number; y: number; zoom: number }

    // Interaction State
    mode: 'interact' | 'draw' // Interact = Click links, scroll embeds. Draw = Fabric handles inputs.
    activeTool: ToolType

    // Style State
    // Style State - Moved to UI Extensions


    // Canvas Config
    canvasConfig: {
        mode: 'edgeless' | 'desktop-8k' | 'iphone-8k'
        width?: number
        height?: number
    }
    setCanvasConfig: (config: Partial<EdgelessState['canvasConfig']>) => void

    // Actions
    addLayer: (name: string) => void
    removeLayer: (id: string) => void
    toggleLayerVisibility: (id: string) => void
    setActiveLayer: (id: string) => void

    addElement: (el: Omit<EdgelessElement, 'id'>) => void
    setElements: (elements: EdgelessElement[]) => void
    updateElement: (id: string, patch: Partial<EdgelessElement>) => void
    removeElement: (id: string) => void

    setMode: (mode: 'interact' | 'draw') => void
    setTool: (tool: ToolType) => void
    setViewport: (vp: { x: number; y: number; zoom: number }) => void

    // UI Extensions
    selectionMode: 'cursor' | 'free' | 'rect' | 'magic' | 'grab'
    setSelectionMode: (mode: 'cursor' | 'free' | 'rect' | 'magic' | 'grab') => void

    eraserWidth: number
    setEraserWidth: (width: number) => void

    textSize: number
    setTextSize: (size: number) => void

    isChatOpen: boolean
    setChatOpen: (open: boolean) => void

    isLinking: boolean
    setIsLinking: (linking: boolean) => void

    // Pen State
    penWidth: number
    setPenWidth: (width: number) => void
    penColor: string
    setPenColor: (color: string) => void
    stabilizerLevel: number
    setStabilizerLevel: (level: number) => void
    pressureEnabled: boolean
    setPressureEnabled: (enabled: boolean) => void

    // History State
    history: {
        undoStack: string[] // JSON snapshots of canvas
        redoStack: string[]
    }
    pushHistory: (snapshot: string) => void
    undo: () => string | null // returns snapshot to load
    redo: () => string | null // returns snapshot to load
}

export const useEdgelessStore = create<EdgelessState>()((set) => ({
    layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
    activeLayerId: 'default',
    elements: [],
    viewPort: { x: 0, y: 0, zoom: 1 },

    mode: 'draw', // Default to draw mode for "Edgeless" feel, shift to interact for links
    activeTool: 'select',

    // Moved to bottom with setters
    addLayer: (name) => set((state) => {
        const newLayer = { id: uuidv4(), name, visible: true, locked: false }
        return {
            layers: [newLayer, ...state.layers], // Add to top
            activeLayerId: newLayer.id
        }
    }),

    removeLayer: (id) => set((state) => {
        if (state.layers.length <= 1) return {} // Don't remove last layer
        const remaining = state.layers.filter(l => l.id !== id)
        return {
            layers: remaining,
            activeLayerId: state.activeLayerId === id ? remaining[0].id : state.activeLayerId,
            elements: state.elements.filter(el => el.layerId !== id) // Remove elements in layer
        }
    }),

    toggleLayerVisibility: (id) => set((state) => ({
        layers: state.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
    })),

    setActiveLayer: (id) => set({ activeLayerId: id }),

    addElement: (el) => set((state) => ({
        elements: [...state.elements, { ...el, id: uuidv4(), layerId: el.layerId || state.activeLayerId }]
    })),

    setElements: (elements) => set({ elements }),

    updateElement: (id, patch) => set((state) => ({
        elements: state.elements.map(el => el.id === id ? { ...el, ...patch } : el)
    })),

    removeElement: (id) => set((state) => ({
        elements: state.elements.filter(el => el.id !== id)
    })),

    canvasConfig: { mode: 'edgeless' },
    setCanvasConfig: (config) => set((state) => ({ canvasConfig: { ...state.canvasConfig, ...config } })),

    setMode: (mode) => set({ mode }),
    setTool: (tool) => set({ activeTool: tool }),
    setViewport: (viewPort) => set({ viewPort }),

    // Toolbar / Chat Support
    selectionMode: 'grab',
    setSelectionMode: (mode) => set({ selectionMode: mode }),

    eraserWidth: 50,
    setEraserWidth: (width) => set({ eraserWidth: width }),

    textSize: 40,
    setTextSize: (size) => set({ textSize: size }),

    isChatOpen: false,
    setChatOpen: (open) => set({ isChatOpen: open }),

    isLinking: false,
    setIsLinking: (linking) => set({ isLinking: linking }),

    penWidth: 2,
    setPenWidth: (width) => set({ penWidth: width }),

    penColor: 'var(--primary)',
    setPenColor: (color) => set({ penColor: color }),

    stabilizerLevel: 0,
    setStabilizerLevel: (level) => set({ stabilizerLevel: level }),

    pressureEnabled: true,
    setPressureEnabled: (enabled) => set({ pressureEnabled: enabled }),

    history: { undoStack: [], redoStack: [] },

    pushHistory: (snapshot) => set((state) => {
        // Limit stack size? 50?
        const newStack = [...state.history.undoStack, snapshot].slice(-50)
        return {
            history: {
                undoStack: newStack,
                redoStack: []
            }
        }
    }),

    undo: () => {
        const state = useEdgelessStore.getState() as EdgelessState
        const { undoStack, redoStack } = state.history

        if (undoStack.length <= 1) return null

        const current = undoStack[undoStack.length - 1]
        const previous = undoStack[undoStack.length - 2]

        set({
            history: {
                undoStack: undoStack.slice(0, -1),
                redoStack: [current, ...redoStack]
            }
        })

        return previous
    },

    redo: () => {
        const state = useEdgelessStore.getState() as EdgelessState
        const { undoStack, redoStack } = state.history

        if (redoStack.length === 0) return null

        const next = redoStack[0]

        set({
            history: {
                undoStack: [...undoStack, next],
                redoStack: redoStack.slice(1)
            }
        })

        return next
    }
}))
