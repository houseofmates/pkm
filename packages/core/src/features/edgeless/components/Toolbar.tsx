import {
  Hand,
  MousePointer2,
  Square,
  Type,
  ImageIcon,
  Undo2,
  Redo2,
  Trash2,
  Layers,
  Settings,
  Pencil,
  Eraser,
  BrainCircuit,
  Link as LinkIcon,
  Plus,
  Eye,
  EyeOff,
  Inbox,
  Lasso,
  Move,
  Expand,
  BoxSelect,
  Pin
} from 'lucide-react'
import { useEdgelessStore } from '../store'
import { useCanvasEvents } from '../hooks/use-canvas-events'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useThemeReactor } from '@/hooks/use-theme-reactor'
import { UniversalWidgetPicker } from '@/features/widgets/UniversalWidgetPicker'
import { CaptureDialog } from '@/features/captures/components/CaptureDialog'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

// tool button helper
const ToolBtn = ({ tool, icon: Icon, store, activeMenu, openMenu, closeMenu, onClickOverride, specialModeIcon, menuContent }: any) => {
  const isActive = store.activeTool === tool
  const showMenu = activeMenu === tool
  const btnRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

  // Position menu above the button using a portal
  useEffect(() => {
    if (showMenu && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 12, // 12px gap above button
      })
    }
  }, [showMenu])

  return (
    <div className="relative group">
      <button
        ref={btnRef}
        onClick={(e) => {
          if (onClickOverride) {
            onClickOverride(e)
            return
          }
          if (isActive) {
            if (showMenu) closeMenu()
            else openMenu(tool)
          } else {
            store.setTool(tool)
            store.setMode(tool === 'select' || tool === 'hand' ? 'interact' : 'draw')
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          if (showMenu) closeMenu()
          else openMenu(tool)
        }}
        className={`h-[40px] w-[40px] flex items-center justify-center rounded-full transition-all duration-200 ${isActive ? 'bg-primary text-black shadow-[0_0_10px_var(--primary)]' : 'text-primary hover:bg-primary/20 hover:scale-105'}`}
        title={tool}
      >
        {specialModeIcon || <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />}
      </button>

      {/* popup menu — rendered via portal to escape toolbar overflow */}
      {showMenu && menuContent && createPortal(
        <div
          className="fixed bg-[#0a0a0a]/90 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 shadow-2xl min-w-[180px] z-[200] animate-in fade-in slide-in-from-bottom-2"
          style={{
            left: menuPos.x,
            top: menuPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary/30"></div>
          {menuContent}
        </div>,
        document.body
      )}
    </div>
  )
}

export function Toolbar() {
  const undo = useEdgelessStore(s => s.undo)
  const redo = useEdgelessStore(s => s.redo)
  const addElement = useEdgelessStore(s => s.addElement)
  const viewPort = useEdgelessStore(s => s.viewPort)
  const penWidth = useEdgelessStore(s => s.penWidth)
  const setPenWidth = useEdgelessStore(s => s.setPenWidth)
  const penOpacity = useEdgelessStore(s => s.penOpacity)
  const setPenOpacity = useEdgelessStore(s => s.setPenOpacity)
  const stabilizerLevel = useEdgelessStore(s => s.stabilizerLevel)
  const setStabilizerLevel = useEdgelessStore(s => s.setStabilizerLevel)
  const penColor = useEdgelessStore(s => s.penColor)
  const setPenColor = useEdgelessStore(s => s.setPenColor)
  const pressureEnabled = useEdgelessStore(s => s.pressureEnabled)
  const setPressureEnabled = useEdgelessStore(s => s.setPressureEnabled)
  const eraserWidth = useEdgelessStore(s => s.eraserWidth)
  const setEraserWidth = useEdgelessStore(s => s.setEraserWidth)
  const eraserOpacity = useEdgelessStore(s => s.eraserOpacity)
  const setEraserOpacity = useEdgelessStore(s => s.setEraserOpacity)
  const selectionMode = useEdgelessStore(s => s.selectionMode)
  const setSelectionMode = useEdgelessStore(s => s.setSelectionMode)
  const activeTool = useEdgelessStore(s => s.activeTool)
  const setTool = useEdgelessStore(s => s.setTool)
  const setMode = useEdgelessStore(s => s.setMode)
  const layers = useEdgelessStore(s => s.layers)
  const activeLayerId = useEdgelessStore(s => s.activeLayerId)
  const addLayer = useEdgelessStore(s => s.addLayer)
  const toggleLayerVisibility = useEdgelessStore(s => s.toggleLayerVisibility)
  const setActiveLayer = useEdgelessStore(s => s.setActiveLayer)
  const removeLayer = useEdgelessStore(s => s.removeLayer)

  // Reconstruct a minimal store-like object for ToolBtn to maintain compatibility with minimal changes
  const store = {
    activeTool,
    setTool,
    setMode,
    selectionMode,
    setSelectionMode,
    penWidth,
    setPenWidth,
    penOpacity,
    setPenOpacity,
    stabilizerLevel,
    setStabilizerLevel,
    penColor,
    setPenColor,
    pressureEnabled,
    setPressureEnabled,
    eraserWidth,
    setEraserWidth,
    eraserOpacity,
    setEraserOpacity,
    viewPort,
    addElement,
    undo,
    redo,
    layers,
    activeLayerId,
    addLayer,
    toggleLayerVisibility,
    setActiveLayer,
    removeLayer
  }

  useThemeReactor() // ensure theme is synced

  const { id: drawingId } = useParams<{ id: string }>()

  const handlePinToDashboard = () => {
    if (!drawingId) {
      toast.error('no drawing id found')
      return
    }
    // Dispatch event to add drawing to dashboard
    window.dispatchEvent(new CustomEvent('pkm:add-widget', {
      detail: { 
        id: `drawing_${drawingId}`, 
        type: 'collection', 
        name: 'drawing',
        icon: 'PenTool',
        iconType: 'lucide'
      }
    }))
    toast.success('pinned to dashboard')
  }

  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false)
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false)

  const openMenu = (tool: string) => setActiveMenu(tool)
  const closeMenu = () => setActiveMenu(null)

  // close menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (activeMenu) {
        const target = e.target as Element
        // Don't close if clicking inside the portal menu or the toolbar button
        if (target.closest('.relative.group') || target.closest('[class*="backdrop-blur-xl"]')) return
        closeMenu()
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [activeMenu])

  const handleAddWidget = (type: string, data: any) => {
    // calculate center of viewport
    const { x, y, zoom } = store.viewPort;
    const centerX = (-x / zoom) + (window.innerWidth / 2 / zoom);
    const centerY = (-y / zoom) + (window.innerHeight / 2 / zoom);

    store.addElement({
      type: 'widget' as any,
      x: centerX - (data.defaultWidth || 200) / 2,
      y: centerY - (data.defaultHeight || 200) / 2,
      width: data.defaultWidth || 200,
      height: data.defaultHeight || 200,
      data: {
        ...data,
        widgetId: type
      }
    });
  };

  return (
    <div
      data-testid="edgeless-toolbar"
      className="fixed inset-x-0 z-50 pointer-events-none px-3 sm:px-4"
      style={{ bottom: 'max(62px, calc(env(safe-area-inset-bottom, 0px) + 54px))' }}
    >
      <div className="flex justify-center w-full">
        <div className="flex items-center gap-0 bg-[#050505] backdrop-blur-md border border-white/10 rounded-full shadow-lg border-t-primary/20 transition-all duration-300 pointer-events-auto max-w-full overflow-x-auto overscroll-x-contain px-1 min-w-fit" style={{ borderRadius: '999px', padding: '4px 8px', height: 'auto', minHeight: '48px' }}>

        {/* primary tools - centered */}
        <div className="flex items-center gap-1 px-2">
          <button onClick={store.undo} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors" title="undo">
            <Undo2 size={20} />
          </button>
          <button onClick={store.redo} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors" title="redo">
            <Redo2 size={20} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* select tool */}
          <ToolBtn
            tool="select"
            icon={Hand}
            store={store}
            activeMenu={activeMenu}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onClickOverride={() => {
              store.setTool('select')
              // cycle or default modes
              if (store.selectionMode === 'rect') store.setSelectionMode('grab')
              else store.setMode('interact')
            }}
            specialModeIcon={store.selectionMode === 'cursor' ? <MousePointer2 size={24} /> : <Hand size={24} />}
            menuContent={
              <div className="flex flex-col gap-2">
                <span className="text-xs text-primary font-bold lowercase">mode</span>
                <button onClick={() => { store.setSelectionMode('grab'); closeMenu() }} className={`text-sm p-2 rounded flex items-center gap-2 lowercase ${store.selectionMode === 'grab' ? 'bg-primary/20 text-primary' : 'text-zinc-300 hover:bg-white/10'}`}>
                  <Hand size={16} /> grab (pan)
                </button>
                <button onClick={() => { store.setSelectionMode('cursor'); closeMenu() }} className={`text-sm p-2 rounded flex items-center gap-2 lowercase ${store.selectionMode === 'cursor' ? 'bg-primary/20 text-primary' : 'text-zinc-300 hover:bg-white/10'}`}>
                  <MousePointer2 size={16} /> interact
                </button>
              </div>
            }
          />

          {/* lasso tool (freeform selection) */}
          <ToolBtn
            tool="lasso"
            icon={Lasso}
            store={store}
            activeMenu={activeMenu}
            openMenu={openMenu}
            closeMenu={closeMenu}
            menuContent={
              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="text-xs text-primary font-bold lowercase">lasso selection</span>
                <p className="text-xs text-zinc-400">
                  draw a freeform loop to select multiple objects
                </p>
                <ul className="text-xs text-zinc-500 list-disc list-inside">
                  <li>drag to draw selection path</li>
                  <li>close the loop to select</li>
                  <li>double-click to confirm</li>
                  <li>auto-captures pixels for transform</li>
                </ul>
              </div>
            }
          />

          {/* selection tool (marquee select → move/scale/stretch) */}
          <ToolBtn
            tool="selection"
            icon={BoxSelect}
            store={store}
            activeMenu={activeMenu}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onClickOverride={() => {
              store.setTool('selection');
              store.setMode('draw');
            }}
            menuContent={
              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="text-xs text-primary font-bold lowercase">selection</span>
                <p className="text-xs text-zinc-400">
                  draw a rectangle to cut & move pixels
                </p>
                <ul className="text-xs text-zinc-500 list-disc list-inside">
                  <li>drag to create marquee</li>
                  <li>drag handles to scale/squish</li>
                  <li>drag center to move</li>
                  <li>top handle to rotate</li>
                  <li>enter or double-click to confirm</li>
                  <li>escape to cancel</li>
                </ul>
              </div>
            }
          />

          {/* transform tool (scale/rotate selected objects) */}
          <ToolBtn
            tool="transform"
            icon={Expand}
            store={store}
            activeMenu={activeMenu}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onClickOverride={() => {
              store.setTool('transform');
              store.setMode('interact');
            }}
            menuContent={
              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="text-xs text-primary font-bold lowercase">transform</span>
                <p className="text-xs text-zinc-400">
                  scale, rotate and move selected objects
                </p>
                <ul className="text-xs text-zinc-500 list-disc list-inside">
                  <li>drag handles to resize</li>
                  <li>drag top handle to rotate</li>
                  <li>drag center to move</li>
                </ul>
              </div>
            }
          />

          {/* pen */}
          <ToolBtn
            tool="pen"
            icon={Pencil}
            store={store}
            activeMenu={activeMenu}
            openMenu={openMenu}
            closeMenu={closeMenu}
            menuContent={
              <>
                {/* size */}
                <div className="flex flex-col gap-1 mb-2">
                  <label className="text-xs text-primary lowercase flex justify-between">
                    <span>size</span>
                    <span>{store.penWidth}px</span>
                  </label>
                  <input
                    type="range" min="1" max="50"
                    value={store.penWidth}
                    onChange={(e) => store.setPenWidth(Number(e.target.value))}
                    className="accent-primary"
                  />
                </div>
                {/* opacity */}
                <div className="flex flex-col gap-1 mb-2">
                  <label className="text-xs text-primary lowercase flex justify-between">
                    <span>opacity</span>
                    <span>{store.penOpacity}%</span>
                  </label>
                  <input
                    type="range" min="0" max="100"
                    value={store.penOpacity}
                    onChange={(e) => store.setPenOpacity(Number(e.target.value))}
                    className="accent-primary"
                  />
                </div>
                {/* smoothness */}
                <div className="flex flex-col gap-1 mb-2">
                  <label className="text-xs text-primary lowercase flex justify-between">
                    <span>smooth</span>
                    <span>{store.stabilizerLevel}</span>
                  </label>
                  <input
                    type="range" min="0" max="8"
                    value={store.stabilizerLevel}
                    onChange={(e) => store.setStabilizerLevel(Number(e.target.value))}
                    className="accent-primary"
                  />
                </div>
                {/* pressure toggle */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="pressure-toggle"
                    checked={store.pressureEnabled}
                    onChange={(e) => store.setPressureEnabled(e.target.checked)}
                    className="accent-primary"
                  />
                  <label htmlFor="pressure-toggle" className="text-xs text-primary lowercase">
                    pen pressure
                  </label>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {['var(--primary)', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#000000'].map((color) => (
                    <button
                      key={color}
                      onClick={() => store.setPenColor(color)}
                      className={`w-6 h-6 rounded-full border border-white/10 ${store.penColor === color ? 'ring-2 ring-primary ring-offset-1 ring-offset-black' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </>
            }
          />

          {/* eraser */}
          <ToolBtn tool="eraser" icon={Eraser} store={store} activeMenu={activeMenu} openMenu={openMenu} closeMenu={closeMenu}
            menuContent={
              <>
                <label className="text-xs text-primary lowercase">width: {store.eraserWidth}px</label>
                <input
                  type="range" min="5" max="100"
                  value={store.eraserWidth}
                  onChange={(e) => store.setEraserWidth(Number(e.target.value))}
                  className="accent-primary"
                />
                <label className="text-xs text-primary lowercase flex justify-between mt-2">
                  <span>opacity</span>
                  <span>{store.eraserOpacity}%</span>
                </label>
                <input
                  type="range" min="0" max="100"
                  value={store.eraserOpacity}
                  onChange={(e) => store.setEraserOpacity(Number(e.target.value))}
                  className="accent-primary"
                />
              </>
            }
          />

          {/* text */}
          <ToolBtn tool="text" icon={Type} store={store} activeMenu={activeMenu} openMenu={openMenu} closeMenu={closeMenu} />
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* secondary / layers */}
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={handlePinToDashboard}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
            title="pin to dashboard"
          >
            <Pin size={20} />
          </button>

          <ToolBtn
            tool="layers"
            icon={Layers}
            store={store}
            activeMenu={activeMenu}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onClickOverride={() => {
              if (activeMenu === 'layers') closeMenu()
              else openMenu('layers')
            }}
            menuContent={
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary">layers</span>
                  <button onClick={() => store.addLayer(`Layer ${store.layers.length + 1}`)} className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/40 rounded text-primary">
                    + add
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                  {store.layers.map(layer => (
                    <div key={layer.id} className={`flex items-center gap-2 p-2 rounded ${store.activeLayerId === layer.id ? 'bg-primary/20 border border-primary/50' : 'hover:bg-white/5'}`}>
                      <button onClick={() => store.toggleLayerVisibility(layer.id)} className="text-zinc-400 hover:text-white">
                        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <span
                        className={`flex-1 text-xs cursor-pointer truncate ${store.activeLayerId === layer.id ? 'text-primary' : 'text-zinc-300'}`}
                        onClick={() => store.setActiveLayer(layer.id)}
                      >
                        {layer.name}
                      </span>
                      <button onClick={() => {
                        if (confirm('Delete layer?')) store.removeLayer(layer.id)
                      }} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </div>

        <UniversalWidgetPicker
          open={widgetPickerOpen}
          onOpenChange={setWidgetPickerOpen}
          onSelect={handleAddWidget}
        />

        <CaptureDialog
          open={captureDialogOpen}
          onOpenChange={setCaptureDialogOpen}
        />
        </div>
      </div>

      {/* Floating + button at bottom right */}
      <button
        onClick={() => setWidgetPickerOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-[48px] w-[48px] flex items-center justify-center rounded-full bg-[#050505] border border-primary/50 text-primary hover:bg-primary/20 hover:scale-105 transition-all shadow-lg pointer-events-auto"
        title="add widget"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
