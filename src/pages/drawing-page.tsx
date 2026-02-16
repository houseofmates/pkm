import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas';
import { Toolbar } from '@/features/edgeless/components/Toolbar';
import { CanvasControls } from '@/features/edgeless/components/CanvasControls';
import { useEdgelessStore } from '@/features/edgeless/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import LZString from 'lz-string';
import { useDebounce } from 'react-use';
// NocoBaseClient import removed - backend sync disabled until collection is configured

export function DrawingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('Untitled Drawing');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const initialLoadCompleteRef = useRef(false);

  // Store access
  const { elements } = useEdgelessStore();

  // Load Drawing from localStorage
  useEffect(() => {
  if (!id) return;
  setLoading(true);

  try {
  // Load config
  const configStr = localStorage.getItem(`drawing-config-${id}`);
  if (configStr) {
 const config = JSON.parse(configStr);
 setTitle(config.title || 'Untitled Drawing');
  }

  // Load content
  const contentStr = localStorage.getItem(`drawing-content-${id}`);
  console.log('[Drawing] Loading - found content:', !!contentStr, 'length:', contentStr?.length || 0);
  if (contentStr) {
 try {
 const decompressed = LZString.decompressFromUTF16(contentStr);
 console.log('[Drawing] Decompressed:', !!decompressed, 'length:', decompressed?.length || 0);
 if (decompressed) {
 const data = JSON.parse(decompressed);
 console.log('[Drawing] Parsed data:', data?.objects?.length || 0, 'objects');

 // Store on window for canvas to pick up when ready
 (window as any).__pkmPendingCanvasData = data;

 // Also dispatch event in case canvas is already listening
 window.dispatchEvent(new CustomEvent('pkm:load-canvas', { detail: data }));
 }
 } catch (e) {
 console.error("Failed to parse drawing content", e);
 }
  } else {
 console.log('[Drawing] No saved content found for id:', id);
  }
  } catch (e) {
  console.error("Failed to load drawing", e);
  } finally {
  setLoading(false);
  // Give canvas time to load objects before allowing saves
  setTimeout(() => {
 initialLoadCompleteRef.current = true;
 console.log('[Drawing] Initial load complete, saves enabled');
  }, 3000);
  }

  // Reset Store on mount
  useEdgelessStore.setState({
  mode: 'draw',
  activeTool: 'pen',
  elements: [],
  });

  }, [id]);

  // Auto-Save with debounce
  const historyStack = useEdgelessStore(s => s.history.undoStack);
  useDebounce(() => {
  if (!loading && initialLoadCompleteRef.current && historyStack.length > 0) saveDrawing();
  }, 500, [historyStack]);

  useDebounce(() => {
  if (!id || loading || !initialLoadCompleteRef.current) return;
  saveDrawing();
  }, 500, [elements]);


  const saveDrawing = async () => {
  if (!id) return;
  setSaving(true);

  try {
  if ((window as any).pkmGetCanvasJSON) {
 const data = (window as any).pkmGetCanvasJSON();
 if (data) {
 const jsonStr = JSON.stringify(data);
 const compressed = LZString.compressToUTF16(jsonStr);

 // Save to localStorage
 console.log('[Drawing] Saving - compressed size:', compressed.length, 'chars');
 localStorage.setItem(`drawing-content-${id}`, compressed);

 // Also save thumbnail to config
 const thumbnail = (window as any).pkmGetCanvasThumbnail?.();
 if (thumbnail) {
 try {
   const configStr = localStorage.getItem(`drawing-config-${id}`);
   const config = configStr ? JSON.parse(configStr) : {};
   config.thumbnail = thumbnail;
   localStorage.setItem(`drawing-config-${id}`, JSON.stringify(config));
 } catch (e) {
   console.error("Failed to save thumbnail", e);
 }
 }

 // Backend sync disabled - NocoBase collection needs manual setup
 // Data is saved locally in localStorage which works reliably
 // TODO: Configure pkm_canvases collection in NocoBase admin with text fields
 console.log('[Drawing] Saved locally (backend sync disabled)');
 }
  }
  } catch (e) {
  console.error("Failed to save drawing", e);
  } finally {
  setSaving(false);
  }
  };

  return (
  <div className="w-full h-screen relative overflow-hidden bg-[#090909] flex flex-col">
  {/* Header */}
  <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 pointer-events-none">
 <div className="flex items-center gap-4 pointer-events-auto bg-black/50 backdrop-blur-sm p-1 shadow-sm card-fix">
 <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 text-white hover:bg-white/10 rounded-lg">
 <ArrowLeft className="h-4 w-4" />
 </Button>
 <div className="flex flex-col">
 <span className="font-bold text-sm leading-none text-white">{title}</span>
 <span className="text-[10px] text-zinc-400 ">drawing</span>
 </div>
 </div>


  </div>

  <div className="flex-1 relative z-10 pointer-events-none">
 <div className="pointer-events-auto w-full h-full">
 <Toolbar /> {/* Minimal toolbar for drawing */}
 <CanvasControls />
 <EdgelessCanvas
 onLoad={() => {
   // Initial load handled by effect + event
 }}
 />
 </div>
  </div>
  </div>
  );
}
