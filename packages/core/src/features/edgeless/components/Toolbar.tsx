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
  MessageCircle,
  BrainCircuit,
  Link as LinkIcon,
  Plus,
  Eye,
  EyeOff,
  Inbox
} from 'lucide-react'
import { useEdgelessStore } from '../store'
import { useCanvasEvents } from '../hooks/use-canvas-events'
import { useState, useRef, useEffect } from 'react'
import { useThemeReactor } from '@/hooks/use-theme-reactor'
import { UniversalWidgetPicker } from '@/features/widgets/UniversalWidgetPicker'
import { CaptureDialog } from '@/features/captures/components/CaptureDialog'

// tool button helper
const ToolBtn = ({ tool, icon: Icon, store, activeMenu, openMenu, closeMenu, onClickOverride, specialModeIcon, menuContent }: any) => {
  const isActive = store.activeTool === tool
  const showMenu = activeMenu === tool
  const btnRef = useRef<HTMLButtonElement>(null)

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
        className={`h-[48px] w-[48px] flex items-center justify-center rounded-full transition-all duration-200 ${isActive ? 'bg-primary text-black scale-110 shadow-[0_0_15px_var(--primary)]' : 'text-primary hover:bg-primary/20 hover:scale-105'}`}
        title={tool}
      >
        {specialModeIcon || <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />}
      </button>

      {/* popup menu */}
      {showMenu && menuContent && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#0a0a0a]/90 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 shadow-2xl min-w-[180px] z-[100] animate-in fade-in slide-in-from-bottom-2">
          {/* arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary/30"></div>
          {menuContent}
        </div>
      )}
    </div>
  )
}

export function Toolbar() {
  const store = useEdgelessStore()
  useThemeReactor() // ensure theme is synced

  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false)
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false)

  const openMenu = (tool: string) => setActiveMenu(tool)
  const closeMenu = () => setActiveMenu(null)

  // close menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (activeMenu && !(e.target as Element).closest('.relative.group')) {
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
    <div className="absolute bottom-0 md:bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-1 p-2 bg-[#050505]/80 backdrop-blur-md border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-t-primary/20 transition-all duration-300 pointer-events-auto">

        {/* primary tools - centered */}
        <div className="flex items-center gap-1 px-2">

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

          {/* capture button */}
          <button
            onClick={() => setCaptureDialogOpen(true)}
            className="h-[48px] w-[48px] flex items-center justify-center rounded-full text-primary hover:bg-primary/20 hover:scale-105 transition-all"
            title="quick capture"
          >
            <Inbox size={24} />
          </button>

          {/* widget picker trigger */}
          <button
            onClick={() => setWidgetPickerOpen(true)}
            className="h-[48px] w-[48px] flex items-center justify-center rounded-full text-primary hover:bg-primary/20 hover:scale-105 transition-all"
            title="add widget"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* secondary / layers / undo */}
        <div className="flex items-center gap-1 px-2">
          <button onClick={store.undo} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors" title="undo">
            <Undo2 size={20} />
          </button>
          <button onClick={store.redo} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors" title="redo">
            <Redo2 size={20} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolBtn
            tool="layers"
            icon={Layers}
            store={store}
            activeMenu={activeMenu}
            openMenu={openMenu}
            closeMenu={closeMenu}
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

        <div className="w-px h-6 bg-white/10" />

        {/* wilson chat button at the very end */}
        <div className="flex items-center px-2">
          <button
            onClick={() => store.setChatOpen(true)}
            className="h-[48px] w-[48px] flex items-center justify-center rounded-full text-primary hover:bg-primary/20 hover:scale-105 transition-all"
            title="open wilson chat"
          >
            <BrainCircuit size={24} />
          </button>
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
  );
}
