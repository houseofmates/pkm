import { useEffect, useRef, useState } from 'react';
import { useContextMenuStore } from './context-menu-store';
import { createPortal } from 'react-dom';
import { useEdgelessStore } from '@/features/edgeless/store';
import { useAuth } from '@/contexts/auth-context';
import { Button } from './button';
import { Input } from './input';
import { toast } from 'sonner';
import { HexColorPicker } from 'react-colorful';
import { Edit2, ExternalLink, Palette, Trash2, BoxSelect, BrainCircuit } from 'lucide-react';

export function ContextMenu() {
  const { isOpen, x, y, targetId, targetType, data, closeMenu } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const { client } = useAuth();

  // Local state for edit workflows
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Sync rename value when menu opens
  useEffect(() => {
  if (isOpen && data?.title) {
  setRenameValue(data.title);
  }
  setIsRenaming(false);
  setShowColorPicker(false);
  }, [isOpen, data]);

  // Close on click outside
  useEffect(() => {
  const handleClick = (e: MouseEvent) => {
  if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
 closeMenu();
  }
  };
  if (isOpen) window.addEventListener('mousedown', handleClick);
  return () => window.removeEventListener('mousedown', handleClick);
  }, [isOpen, closeMenu]);

  if (!isOpen) return null;

  // --- Actions ---

  const handleColorChange = (color: string) => {
  if (targetType === 'canvas-object') {
  useEdgelessStore.getState().updateElement(targetId!, {
 data: { ...data, stroke: color, fill: color }
 // Note: Logic depends on object type.
 // Connector: stroke
 // Shape: fill/stroke
 // We might need to be smarter.
  });
  // Update local data reference if needed, or rely on re-render?
  // Canvas updates usually don't trigger re-render of THIS component unless we subscribe.
  } else if (targetType === 'dashboard-card') {
  // Update NocoBase record
  // Collection? We need collection name in data
  if (data?.collection) {
 client.updateRecord(data.collection, targetId!, { color }); // Assuming 'color' field exists
  }
  }
  };

  const handleRename = async () => {
  if (!renameValue.trim()) return;

  if (targetType === 'canvas-object') {
  // Does canvas object have a title?
  // Maybe 'text' tool objects do.
  // Or we add a title property to data.
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
  // "Promote to Record" logic
  // This likely needs a full dialog flow.
  // For now, let's just create a basic Note with the content.

  const content = data?.text || data?.title || "New Record from Canvas";

  // We'll dispatch an event or use a dialog store
  // Simplicity: Prompt user for collection? Or just dump to 'notes'?
  // The plan mentioned "Prompt for collection".

  const collection = window.prompt("Target Collection (e.g. notes):", "notes");
  if (collection) {
  client.createRecord(collection, { title: 'From Canvas', content: content })
 .then(() => toast.success("promoted to record"))
 .catch(() => toast.error("failed to promote"));
  }
  closeMenu();
  };

  const handleDelete = async () => {
  if (targetType === 'canvas-object') {
  useEdgelessStore.getState().removeElement(targetId!);
  } else if (targetType === 'dashboard-card' && data?.collection) {
  if (confirm("Delete this record?")) {
 await client.deleteRecord(data.collection, targetId!);
 toast.success("deleted");
 // Trigger refresh? DashboardCard relies on parent list update.
 // We might need to dispatch an event.
 window.dispatchEvent(new CustomEvent('pkm:record-deleted', { detail: { id: targetId, collection: data.collection } }));
  }
  }
  closeMenu();
  };

  const handleEditMetadata = () => {
  if (targetType === 'dashboard-card' && data?.collection) {
  // Navigate to record view
  // Using window.location for simplicity or need router hook (not available in portal easily without wrapper)
  // But we are inside React component tree if creating Portal properly.
  // Let's assume we can navigate.
  window.location.hash = `/databases/${data.collection}/${targetId}`; // Hash router? No, we use Browser router.
  // We need `useNavigate` but we might not be inside Router context if rendered at root?
  // Actually, if we put <ContextMenu /> in RootLayout (inside Router), we are good.
  }
  closeMenu();
  }

  return createPortal(
  <div
  ref={menuRef}
  className="fixed z-50 min-w-[200px] bg-popover/95 backdrop-blur-md border border-border text-popover-foreground rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col p-1 overflow-hidden"
  style={{ top: Math.min(y, window.innerHeight - 300), left: Math.min(x, window.innerWidth - 220) }}
  >
  {/* Header / Rename */}
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
   {renameValue || 'Untitled'}
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

  {/* Color Palette Toggle */}
  <Button
 variant="ghost"
 size="sm"
 className="justify-start text-xs h-8 px-2"
 onClick={() => setShowColorPicker(!showColorPicker)}
  >
 <Palette className="h-3.5 w-3.5 mr-2 opacity-70" />
 Appearance
  </Button>

  {showColorPicker && (
 <div className="p-2 bg-muted/50 rounded-md my-1">
 <HexColorPicker color={data?.color || "var(--primary)"} onChange={handleColorChange} style={{ width: '100%', height: '120px' }} />
 </div>
  )}

  {/* Metadata / Full Edit */}
  {targetType === 'dashboard-card' && (
 <Button
 variant="ghost"
 size="sm"
 className="justify-start text-xs h-8 px-2"
 onClick={handleEditMetadata}
 >
 <ExternalLink className="h-3.5 w-3.5 mr-2 opacity-70" />
 Open Record
 </Button>
  )}

  {/* ask ai (canvas/object) */}
  {targetType === 'canvas-object' && (
  <>
  <Button
    variant="ghost"
    size="sm"
    className="justify-start text-xs h-8 px-2"
    onClick={async () => {
      const content = data?.text || data?.title || JSON.stringify(data || {});
      const q = window.prompt('ask wilson about this canvas item (context will be included):');
      if (!q) return;
      (await import('@/stores/llm-store')).useLLMStore.getState().setContext(content);
      useEdgelessStore.getState().setChatOpen(true);
      await (await import('@/stores/llm-store')).useLLMStore.getState().askWilson(q);
      (await import('@/stores/llm-store')).useLLMStore.getState().setContext(null);
    }}
  >
    <BrainCircuit className="h-3.5 w-3.5 mr-2 opacity-70" />
    ask ai about this
  </Button>

  <Button
    variant="ghost"
    size="sm"
    className="justify-start text-xs h-8 px-2"
    onClick={handlePromote}
  >
    <BoxSelect className="h-3.5 w-3.5 mr-2 opacity-70" />
    Promote to Record
  </Button>
  </>
  )} 

  <div className="h-px bg-border/50 my-1" />

  {/* Destructive */}
  <Button
 variant="ghost"
 size="sm"
 className="justify-start text-xs h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
 onClick={handleDelete}
  >
 <Trash2 className="h-3.5 w-3.5 mr-2 opacity-70" />
 Delete
  </Button>

  </div>,
  document.body
  );
}
