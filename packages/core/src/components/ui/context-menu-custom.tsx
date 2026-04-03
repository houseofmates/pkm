import { useEffect, useRef, useState } from 'react';
import { useContextMenuStore } from './context-menu-store';
import { createPortal } from 'react-dom';
import { useEdgelessStore } from '@/features/edgeless/store';
import { useAuth } from '@/contexts/auth-context';
import { Button } from './button';
import { Input } from './input';
import { toast } from 'sonner';
import { HexColorPicker } from 'react-colorful';
import { Edit2, ExternalLink, Palette, Trash2, Bold, Italic, Type } from 'lucide-react';

export function ContextMenu() {
  const { isOpen, x, y, targetId, targetType, data, closeMenu } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const { client } = useAuth();

  // local state for edit workflows
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [brushDarkness, setBrushDarkness] = useState(0);

  // sync rename value when menu opens
  useEffect(() => {
  if (isOpen && data?.title) {
  setRenameValue(data.title);
  }
  setIsRenaming(false);
  setShowColorPicker(false);
  }, [isOpen, data]);

  // Calculate initial darkness from pen color when tool menu opens
  useEffect(() => {
    if (!isOpen || targetType !== 'tool' || data?.tool !== 'pen') {
      setBrushDarkness(0);
      return;
    }

    const store = useEdgelessStore.getState();
    const currentColor = store.penColor;
    
    // Reverse-calculate darkness from the current pen color
    // We estimate by comparing luminance - darker colors have lower luminance
    const getLuminance = (hex: string) => {
      const m = hex.replace(/^#/, '');
      if (m.length === 6) {
        const r = parseInt(m.slice(0, 2), 16) / 255;
        const g = parseInt(m.slice(2, 4), 16) / 255;
        const b = parseInt(m.slice(4, 6), 16) / 255;
        // Perceptual luminance formula
        return 0.299 * r + 0.587 * g + 0.114 * b;
      }
      return 1;
    };

    const luminance = getLuminance(currentColor);
    // Estimate darkness: pure white (luminance 1) = 0% darkness, black (luminance 0) = 100% darkness
    // We use a nonlinear curve to match the applyDark function's behavior
    const estimatedDarkness = Math.round((1 - Math.pow(luminance, 0.5)) * 100);
    setBrushDarkness(Math.max(0, Math.min(100, estimatedDarkness)));
  }, [isOpen, targetType, data?.tool]);

  // close on click/tap outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | PointerEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    if (isOpen) {
      // Use capture phase to ensure canvas drawing/gesture handlers cannot block closing.
      window.addEventListener('pointerdown', handlePointerDown, { capture: true });
      window.addEventListener('mousedown', handlePointerDown, { capture: true });
      window.addEventListener('touchstart', handlePointerDown, { capture: true });
    }

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('mousedown', handlePointerDown, { capture: true });
      window.removeEventListener('touchstart', handlePointerDown, { capture: true });
    };
  }, [isOpen, closeMenu]);

  if (!isOpen) return null;

  // --- actions ---

  const handleColorChange = (color: string) => {
  if (targetType === 'canvas-object') {
  useEdgelessStore.getState().updateElement(targetId!, {
 data: { ...data, stroke: color, fill: color }
  });
  } else if (targetType === 'dashboard-card') {
  if (data?.collection) {
 client.updateRecord(data.collection, targetId!, { color });
  }
  } else if (targetType === 'tool') {
    // adjust brush color when pen tool
    if (data?.tool === 'pen') {
      useEdgelessStore.getState().setPenColor(color);
    }
  }
  };

  const handleRename = async () => {
  if (!renameValue.trim()) return;

  if (targetType === 'canvas-object') {
  // does canvas object have a title?
  // maybe 'text' tool objects do.
  // or we add a title property to data.
  useEdgelessStore.getState().updateElement(targetId!, {
 data: { ...data, title: renameValue }
  });
  } else if (targetType === 'dashboard-card' && data?.collection) {
  try {
 await client.updateRecord(data.collection, targetId!, {
 title: renameValue // Assuming 'title' is the field, might vary
 });
 toast.success('renamed');
  } catch (e) {
 toast.error('failed to rename');
  }
  }
  setIsRenaming(false);
  closeMenu();
  };

  const handlePromote = () => {
  // "promote to record" logic
  // this likely needs a full dialog flow.
  // for now, let's just create a basic note with the content.

  const content = data?.text || data?.title || "New Record from Canvas";

  // we'll dispatch an event or use a dialog store
  // simplicity: prompt user for collection? or just dump to 'notes'?
  // the plan mentioned "prompt for collection".

  const collection = window.prompt("Target Collection (e.g. notes):", "notes");
  if (collection) {
  const payload: any = { title: 'From Canvas', content: content };
  if (collection.toLowerCase().includes('note')) payload.entity_type = 'note';
  client.createRecord(collection, payload)
 .then(() => toast.success("promoted to record"))
 .catch(() => toast.error("failed to promote"));
  }
  closeMenu();
  };

  const handleDelete = async () => {
  if (targetType === 'canvas-object') {
  useEdgelessStore.getState().removeElement(targetId!);
  } else if (targetType === 'dashboard-card' && data?.collection) {
  if (!targetId) {
    toast.error("unable to delete: no id");
  } else if (confirm("Delete this record?")) {
 try {
 await client.deleteRecord(data.collection, targetId);
 toast.success("deleted");
 // trigger refresh? dashboardcard relies on parent list update.
 // we might need to dispatch an event.
 window.dispatchEvent(new CustomEvent('pkm:record-deleted', { detail: { id: targetId, collection: data.collection } }));
 } catch (e) {
   toast.error("delete failed");
 }
  }
  }
  closeMenu();
  };

  const handleEditMetadata = () => {
  if (targetType === 'dashboard-card' && data?.collection) {
  // navigate to record view
  // using window.location for simplicity or need router hook (not available in portal easily without wrapper)
  // but we are inside react component tree if creating portal properly.
  // let's assume we can navigate.
  window.location.hash = `/databases/${data.collection}/${targetId}`; // Hash router? No, we use Browser router.
  // we need `usenavigate` but we might not be inside router context if rendered at root?
  // actually, if we put <contextmenu /> in rootlayout (inside router), we are good.
  }
  closeMenu();
  }

  return createPortal(
  <div
  ref={menuRef}
  className="fixed z-50 min-w-[220px] max-h-[calc(100vh-40px)] bg-popover/95 backdrop-blur-md border border-border text-popover-foreground rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col p-1 overflow-y-auto"
  style={{ 
    top: y + 350 > window.innerHeight ? Math.max(10, window.innerHeight - 360) : y, 
    left: x + 220 > window.innerWidth ? Math.max(10, window.innerWidth - 230) : x 
  }}
  >
  {/* header / rename */}
  <div className="px-2 py-1.5 border-b border-border/50 mb-1">
 {isRenaming ? (
 <div className="flex gap-1">
 <Input
   value={renameValue}
   onChange={e => setRenameValue(e.target.value)}
   className="h-7 text-xs"
   autoFocus
   onKeyDown={e => e.key === 'Enter' && handleRename()}
 />
 <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRename}>✓</Button>
 </div>
 ) : (
 <div className="flex items-center justify-between group">
 <span className="text-xs font-semibold truncate max-w-[150px] opacity-80">
   {renameValue || 'untitled'}
 </span>
 <Button
   size="icon"
   variant="ghost"
   className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
   onClick={() => setIsRenaming(true)}
 >
   <Edit2 className="h-3 w-3" />
 </Button>
 </div>
 )}
 <div className="text-[10px] text-muted-foreground  mt-0.5">
 {targetType?.replace('-', ' ')}
 </div>
  </div>

  {/* color palette toggle */}
  <Button
 variant="ghost"
 size="sm"
 className="justify-start text-xs h-8 px-2"
 onClick={() => setShowColorPicker(!showColorPicker)}
  >
 <Palette className="h-3.5 w-3.5 mr-2 opacity-70" />
 appearance
  </Button>

  {showColorPicker && (
 <div className="p-2 bg-muted/50 rounded-md my-1">
 <HexColorPicker color={data?.color || "var(--primary)"} onChange={handleColorChange} style={{ width: '100%', height: '120px' }} />
 </div>
  )}

  {/* text formatting options (for fabric Textbox/IText objects) */}
  {targetType === 'canvas-object' && (data?.type === 'textbox' || data?.type === 'i-text' || data?.type === 'Textbox' || data?.type === 'IText') && (() => {
    const fabricCanvas = useEdgelessStore.getState().fabricCanvas;
    const activeObj = fabricCanvas?.getActiveObject() as any;
    if (!activeObj) return null;
    
    const toggleBold = () => {
      const current = activeObj.fontWeight;
      activeObj.set('fontWeight', current === 'bold' ? 'normal' : 'bold');
      fabricCanvas?.requestRenderAll();
    };
    const toggleItalic = () => {
      const current = activeObj.fontStyle;
      activeObj.set('fontStyle', current === 'italic' ? 'normal' : 'italic');
      fabricCanvas?.requestRenderAll();
    };
    const toggleOutline = () => {
      if (activeObj.stroke && activeObj.strokeWidth > 0) {
        activeObj.set({ stroke: '', strokeWidth: 0 });
      } else {
        activeObj.set({ stroke: '#000000', strokeWidth: 1.5 });
      }
      fabricCanvas?.requestRenderAll();
    };
    const setTextColor = (color: string) => {
      activeObj.set('fill', color);
      fabricCanvas?.requestRenderAll();
    };
    
    return (
      <>
        <div className="h-px bg-border/50 my-1" />
        <div className="px-2 py-1">
          <span className="text-[10px] text-muted-foreground lowercase">text formatting</span>
        </div>
        <div className="flex gap-1 px-2 mb-1">
          <Button
            variant={activeObj.fontWeight === 'bold' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={toggleBold}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={activeObj.fontStyle === 'italic' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={toggleItalic}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={(activeObj.stroke && activeObj.strokeWidth > 0) ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={toggleOutline}
            title="black outline"
          >
            <Type className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex gap-1 px-2 mb-1">
          {['var(--primary)', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#000000'].map((color) => (
            <button
              key={color}
              onClick={() => setTextColor(color)}
              className={`w-5 h-5 rounded-full border border-white/20 ${activeObj.fill === color ? 'ring-2 ring-primary ring-offset-1 ring-offset-black' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </>
    );
  })()}

  {/* metadata / full edit */}
  {targetType === 'dashboard-card' && (
 <Button
 variant="ghost"
 size="sm"
 className="justify-start text-xs h-8 px-2"
 onClick={handleEditMetadata}
 >
 <ExternalLink className="h-3.5 w-3.5 mr-2 opacity-70" />
 open record
 </Button>
  )}

  {/* ask ai (canvas/object) */}
  {targetType === 'tool' && (() => {
    // moved hook call outside of callback - use getState() for store access
    const store = useEdgelessStore.getState();
    const isBrush = data?.tool === 'pen';
    const widthVal = isBrush ? store.penWidth : store.eraserWidth;
    const opacityVal = isBrush ? store.penOpacity : store.eraserOpacity;
    const setWidth = isBrush ? store.setPenWidth : store.setEraserWidth;
const setOpacity = isBrush ? store.setPenOpacity : store.setEraserOpacity;

    const applyDark = (hex: string, d: number) => {
      // convert hex to hsl, reduce lightness by d%
      let h = 0, s = 0, l = 0;
      // simple parse
      const m = hex.replace(/^#/, '');
      if (m.length === 6) {
        const r = parseInt(m.slice(0,2),16)/255;
        const g = parseInt(m.slice(2,4),16)/255;
        const b = parseInt(m.slice(4,6),16)/255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b);
        l = (max+min)/2;
        if (max!==min) {
          const d0 = max - min;
          s = l>0.5?d0/(2-max-min):d0/(max+min);
          switch(max){
            case r: h=((g-b)/d0 + (g<b?6:0))/6; break;
            case g: h=((b-r)/d0 + 2)/6; break;
            case b: h=((r-g)/d0 + 4)/6; break;
          }
        }
        l = Math.max(0, Math.min(1, l * (1 - d/100)));
        const q = l<0.5?l*(1+s):l+s-l*s;
        const p = 2*l - q;
        const hue2rgb = (p:number,q:number,t:number) => {
          if(t<0) t+=1;
          if(t>1) t-=1;
          if(t<1/6) return p+(q-p)*6*t;
          if(t<1/2) return q;
          if(t<2/3) return p+(q-p)*(2/3-t)*6;
          return p;
        };
        const r2 = hue2rgb(p,q,h+1/3);
        const g2 = hue2rgb(p,q,h);
        const b2 = hue2rgb(p,q,h-1/3);
        const hex2 = '#'+[r2,g2,b2].map(x=>{
          const c = Math.round(x*255).toString(16); return c.length<2?'0'+c:c;
        }).join('');
        return hex2;
      }
      return hex;
    };

    return (
      <>
        {/* opacity slider */}
        <div className="flex flex-col gap-1 mb-2">
          <label className="text-xs text-primary lowercase flex justify-between">
            <span>opacity</span><span>{opacityVal}%</span>
          </label>
          <input aria-label="opacity" type="range" min="0" max="100" value={opacityVal}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="accent-primary" />
        </div>
        {/* size slider */}
        <div className="flex flex-col gap-1 mb-2">
          <label className="text-xs text-primary lowercase flex justify-between">
            <span>size</span><span>{widthVal}px</span>
          </label>
          <input aria-label="size" type="range" min="1" max="100" value={widthVal}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="accent-primary" />
        </div>
        {isBrush && (
          <>
            {/* color picker */}
            <div className="flex flex-col gap-1 mb-2">
              <label className="text-xs text-primary lowercase">color</label>
              <button
                aria-label="color"
                className="w-6 h-6 rounded-full border" 
                style={{backgroundColor: store.penColor}}
                onClick={() => setShowColorPicker((v) => !v)}
              />
            </div>
            {/* darkness slider */}
            <div className="flex flex-col gap-1 mb-2">
              <label className="text-xs text-primary lowercase flex justify-between">
                <span>darkness</span><span>{brushDarkness}%</span>
              </label>
              <input aria-label="darkness" type="range" min="0" max="100" value={brushDarkness}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setBrushDarkness(d);
                  store.setPenColor(applyDark(store.penColor, d));
                }}
                className="accent-primary" />
            </div>
          </>
        )}
      </>
    );
  })()}

  <div className="h-px bg-border/50 my-1" />

  {/* destructive */}
  <Button
 variant="ghost"
 size="sm"
 className="justify-start text-xs h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
 onClick={handleDelete}
  >
 <Trash2 className="h-3.5 w-3.5 mr-2 opacity-70" />
 cancel
  </Button>

  </div>,
  document.body
  );
}

