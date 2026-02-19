import { useRef, useState, useEffect } from 'react'
import { useEdgelessStore } from '../store'
import { MousePointer2, Pencil, Eraser, Type, Link as LinkIcon, MessageCircle, Hand, BrainCircuit } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

// long press hook
function useLongPress(callback: () => void, ms = 500) {
  const [startlongpress, setstartlongpress] = usestate(false)
  const timerref = useref<any>(null)

  useEffect(() => {
  if (startLongPress) {
  timerRef.current = setTimeout(callback, ms)
  } else {
  clearTimeout(timerRef.current)
  }
  return () => clearTimeout(timerRef.current)
  }, [startLongPress, callback, ms])

  return {
  onMouseDown: () => setStartLongPress(true),
  onMouseUp: () => setStartLongPress(false),
  onMouseLeave: () => setStartLongPress(false),
  onTouchStart: () => setStartLongPress(true),
  onTouchEnd: () => setStartLongPress(false)
  }
}

// tool button component
const ToolBtn = ({ tool, icon: Icon, menuContent, specialModeIcon, store, activeMenu, openMenu, closeMenu, onClickOverride }: any) => {
  // determine active state:
  // if tool is 'pen' or 'eraser', we also need to be in 'draw' mode.
  // if tool is 'select' or 'hand', we check activetool.
  const isActive = store.activeTool === tool && (
  (tool === 'select' || tool === 'hand') ? true : store.mode === 'draw'
  );

  const longPressProps = useLongPress(() => {
  if (menuContent) openMenu(tool)
  })

  const handleClick = () => {
  // close any open menu first
  closemenu()

  if (onclickoverride) {
  onclickoverride()
  } else {
  store.settool(tool)
  if (tool === 'pen' || tool === 'eraser' || tool === 'text') {
 store.setmode('draw')
  } else if (tool === 'hand') {
 store.setmode('interact')
  }
  }
  }

  return (
  <div className="relative group">
  <button
 {...longPressProps}
 onDoubleClick={(e) => { e.preventDefault(); if (menuContent) openMenu(tool) }}
 onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (menuContent) openMenu(tool) }}
 onClick={handleClick}
 title={tool}
 className={`h-[48px] w-[48px] flex items-center justify-center rounded-full transition-all relative ${isActive ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/20'}`}
  >
 {specialmodeicon ? specialmodeicon : <Icon size={24} />}
 {/* visual indicator for active mode variants */}
 {activeMenu === tool && <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"></div>}
  </button>

  {activemenu === tool && menucontent && (
 <div className="absolute bottom-16 left-1/2 -translate-x-1/2 md:top-16 md:bottom-auto bg-black border border-primary p-4 rounded-lg flex flex-col gap-2 min-w-[200px] z-[70] shadow-[0_0_15px_rgba(255,215,0,0.2)]">
 {menucontent}
 <button onClick={closeMenu} className="text-xs text-red-500 mt-2 lowercase hover:text-red-400 self-center">close</button>
 </div>
  )}
  </div>
  )
}

export function toolbar() {
  const store = useedgelessstore()
  const [activemenu, setactivemenu] = usestate<string | null>(null)
  const toolbarref = useref<HTMLDivElement>(null)

  const closeMenu = () => setActiveMenu(null)
  const openMenu = (tool: string) => setActiveMenu(tool)

  // click outside handler
  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
  if (activeMenu && toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
 closeMenu()
  }
  }
  window.addEventListener('mousedown', handleClickOutside)
  return () => window.removeeventlistener('mousedown', handleclickoutside)
  }, [activemenu])

  return (
  <div ref={toolbarRef} className="fixed bottom-24 left-1/2 -translate-x-1/2 md:top-4 md:right-24 md:left-auto md:translate-x-0 md:bottom-auto bg-black border-2 border-primary rounded-full p-2 flex gap-2 shadow-[4px_4px_0_var(--primary)] z-50 items-center">

  {/* layers tool */}
  <ToolBtn
 tool="layers"
 icon={LucideIcons.Layers}
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
  {layer.visible ? <LucideIcons.Eye size={14} /> : <LucideIcons.EyeOff size={14} />}
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
  <LucideIcons.Trash2 size={12} />
   </button>
   </div>
   ))}
 </div>
 </div>
 }
  />

  {/* select tool (dual mode: grab vs cursor) */}
  <ToolBtn
 tool="select"
 icon={Hand}
 store={store}
 activeMenu={activeMenu}
 openMenu={openMenu}
 closeMenu={closeMenu}
 onClickOverride={() => {
 store.settool('select')
 // ensure we are in the correct mode for the tool
 if (store.selectionmode === 'rect' || store.selectionmode === 'magic' || store.selectionmode === 'free') {
 store.setselectionmode('grab') // default fallback if weird state
 }
 store.setmode('draw')
 }}
 specialmodeicon={
 store.selectionmode === 'cursor' ? <MousePointer2 size={24} /> : <Hand size={24} />
 }
 menucontent={
 <>
 <span className="text-xs text-primary font-bold mb-1 lowercase">cursor mode</span>
 <button onClick={() => { store.setSelectionMode('grab'); closeMenu() }} className={`text-sm hover:bg-primary/20 p-2 rounded flex items-center gap-2 lowercase ${store.selectionMode === 'grab' ? 'text-primary font-bold' : 'text-primary'}`}>
   <Hand size={16} /> grab (move/scale)
 </button>
 <button onClick={() => { store.setSelectionMode('cursor'); closeMenu() }} className={`text-sm hover:bg-primary/20 p-2 rounded flex items-center gap-2 lowercase ${store.selectionMode === 'cursor' ? 'text-primary font-bold' : 'text-primary'}`}>
   <MousePointer2 size={16} /> cursor (interact)
 </button>
 </>
 }
  />

  {/* pen tool */}
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

 {/* stabilizer */}
 <div className="flex flex-col gap-1 mb-2">
   <label className="text-xs text-primary lowercase flex justify-between">
   <span>stabilizer</span>
   <span>{store.stabilizerLevel}</span>
   </label>
   <input
   type="range" min="0" max="100" // 0 to 1 implicit mapping later
   value={store.stabilizerLevel}
   onChange={(e) => store.setStabilizerLevel(Number(e.target.value))}
   className="accent-primary"
   />
 </div>

 {/* pressure */}
 <div className="flex items-center justify-between mb-2">
   <label className="text-xs text-primary lowercase">pressure</label>
   <input
   type="checkbox"
   checked={store.pressureEnabled}
   onChange={(e) => store.setPressureEnabled(e.target.checked)}
   className="accent-primary"
   />
 </div>

 <div className="h-px bg-primary/20 my-2"></div>

 {/* colors */}
 <div className="grid grid-cols-5 gap-2">
   {['var(--primary)', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#9ca3af', '#000000', 'custom'].map((color) => {
   if (color === 'custom') {
   return (
  <div key={color} className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20 cursor-pointer">
  <input
  type="color"
  value={store.penColor}
  onChange={(e) => store.setPenColor(e.target.value)}
  className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-0 cursor-pointer"
  />
  <div className="w-full h-full bg-gradient-to-tr from-yellow-500 via-purple-500 to-blue-500" />
  </div>
   )
   }
   return (
   <button
  key={color}
  onClick={() => store.setPenColor(color)}
  className={`w-6 h-6 rounded-full border border-white/10 ${store.penColor === color ? 'ring-2 ring-primary ring-offset-1 ring-offset-black' : ''}`}
  style={{ backgroundColor: color }}
   />
   )
   })}
 </div>
 </>
 }
  />

  {/* eraser tool */}
  <ToolBtn
 tool="eraser"
 icon={Eraser}
 store={store}
 activeMenu={activeMenu}
 openMenu={openMenu}
 closeMenu={closeMenu}
 menuContent={
 <>
 <label className="text-xs text-primary lowercase">width: {store.eraserwidth}px</label>
 <input
   type="range" min="5" max="100"
   value={store.eraserWidth}
   onChange={(e) => store.setEraserWidth(Number(e.target.value))}
   className="accent-primary"
 />
 </>
 }
  />

  {/* text tool */}
  <ToolBtn
 tool="text"
 icon={Type}
 store={store}
 activeMenu={activeMenu}
 openMenu={openMenu}
 closeMenu={closeMenu}
 menuContent={
 <>
 <label className="text-xs text-primary lowercase">size: {store.textsize}px</label>
 <input
   type="range" min="12" max="120"
   value={store.textSize}
   onChange={(e) => store.setTextSize(Number(e.target.value))}
   className="accent-primary"
 />
 <div className="h-px bg-primary/20 my-2"></div>
 <button
   onClick={() => store.setIsLinking(!store.isLinking)}
   className={`text-sm p-2 rounded flex items-center gap-2 transition-colors lowercase ${store.isLinking ? 'bg-primary text-black' : 'text-primary'}`}
 >
   <LinkIcon size={16} />
   {store.islinking ? 'linking active...' : 'create link'}
 </button>
 </>
 }
  />

  {/* wilson / ai helpers */}
  <div className="flex items-center gap-2">
  <button
    onClick={async () => {
      // collect canvas state (falls back to element list)
      const canvasState = (window as any).pkmGetCanvasJSON?.() || useEdgelessStore.getState().elements || {};
      const q = window.prompt('ask wilson about the canvas (context will be included):');
      if (!q) return;
      // set background context for wilson, open chat, and ask
      (await import('@/stores/llm-store')).useLLMStore.getState().setContext({ canvas: canvasState });
      useEdgelessStore.getState().setChatOpen(true);
      await (await import('@/stores/llm-store')).useLLMStore.getState().askWilson(q);
      (await import('@/stores/llm-store')).useLLMStore.getState().setContext(null);
    }}
    title="ask wilson about canvas"
    className={`h-[48px] w-[48px] flex items-center justify-center rounded-full transition-all text-primary hover:bg-primary/20`}
  >
    <BrainCircuit size={20} />
  </button>

  <button
    onClick={() => store.setChatOpen(!store.isChatOpen)}
    className={`h-[48px] w-[48px] flex items-center justify-center rounded-full transition-all ${store.isChatOpen ? 'bg-primary text-black' : 'text-primary hover:bg-primary/20'}`}
  >
    <MessageCircle size={24} />
  </button>
  </div>

  </div>
  )
}
