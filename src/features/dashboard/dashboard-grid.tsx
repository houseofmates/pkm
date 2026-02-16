import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus, Database, Trash2, Move, Minimize2,
  Lock, Unlock, Pencil, Eraser, MousePointer2, Check, Wand2, FileText, ExternalLink, X, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCollections } from '@/hooks/use-collections';
import { VIEW_REGISTRY, VIEW_OPTIONS } from '@/components/views/registry';
import type { ViewType } from '@/components/views/registry';
import { useAuth } from '@/contexts/auth-context';
import { useDroppable } from '@dnd-kit/core';
import { useAppSetting } from '@/hooks/use-app-setting';
import { HexColorPicker } from 'react-colorful';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getColorStyles } from '@/utils/color-generator';
import { DatabaseWidget } from '@/features/databases/components/database-widget';
import { useFronter } from '@/contexts/fronter-context';
import { HeadmateCard } from '@/features/headmates/components/headmate-card';

type WidgetType = 'view' | 'document' | 'contact';
interface WidgetDefinition {
  id: string;
  type: WidgetType;
  title: string;
  collectionName: string;
  viewType: ViewType;
  viewConfig?: {
  sort?: string[];
  filter?: Record<string, any>;
  viewType?: ViewType;
  };
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
}

export function DashboardGrid({ layoutKey = 'dashboard_widgets_v2' }: { layoutKey?: string }) {
  // --- State ---
  // widgets (Synced to Backend)
  const [widgets, setWidgets] = useAppSetting<WidgetDefinition[]>(layoutKey, []);
  const { collections } = useCollections();
  const { client, token, isAuthenticated, login } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [isEditMode, setIsEditMode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<'collection' | 'view'>('collection');
  const [wizardSearch, setWizardSearch] = useState('');
  const [selectedCollectionForWizard, setselectedCollectionForWizard] = useState<string | null>(null);
  const [localDocs, setLocalDocs] = useState<{ id: string, title: string }[]>([]);
  const [wizardTab, setWizardTab] = useState<'databases' | 'documents' | 'contacts'>('databases');
  const { members } = useFronter();
  const navigate = useNavigate();

  // load Local Docs
  useEffect(() => {
  if (!addMenuOpen) return;
  const docs: { id: string, title: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('canvas-config-')) {
 const id = key.replace('canvas-config-', '');
 try {
 const config = JSON.parse(localStorage.getItem(key) || '{}');
 docs.push({ id, title: config.title || 'Untitled Document' });
 } catch (e) { }
  }
  }
  setLocalDocs(docs);
  }, [addMenuOpen]);

  // drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingTool, setDrawingTool] = useState<'none' | 'Pencil' | 'Eraser' | 'Lasso'>('none');
  const [selectionMode, setselectionMode] = useState<'free' | 'rect' | 'magic'>('free');
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, seteraserSize] = useState(20);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [eraserMenuOpen, seteraserMenuOpen] = useState(false);
  const [lassoMenuOpen, setlassoMenuOpen] = useState(false);
  const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number, y: number } | null>(null);
  const eraserTimerRef = useRef<any>(null);

  // undo/Redo State
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [lassoPoints, setlassoPoints] = useState<{ x: number, y: number }[]>([]);
  interface Floatingselection {
  image: string; // data URL
  x: number;
  y: number;
  w: number;
  h: number;
  }
  const [floatingselection, _setFloatingselection] = useState<Floatingselection | null>(null);
  // wrap setter to persist changes via setting
  const setFloatingselection = (v: any) => {
  _setFloatingselection(v);
  };

  // save timer ref for debounced autosave
  const saveTimerRef = useRef<number | null>(null);
  // --- Effects ---

  // mouse Position for Cursor
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // synced Canvas Data - may be a string (legacy) or an object { id, url, data }
  const [savedCanvasData, setSavedCanvasData, , flushSavedCanvas] = useAppSetting<any>('dashboard_canvas_data', null);

  // persist floating selection separately so it can be resumed across devices
  const [savedFloatingselection, setSavedFloatingselection, , flushSavedFloating] = useAppSetting<any>('dashboard_floating_selection_v2', null);

  const lastSyncedUrlRef = useRef<string | null>(null);
  const canvasDirtyRef = useRef(false);


  // internal helper to save current state to undo stack
  const saveSnapshot = useCallback(() => {
  if (!canvasRef.current) return;
  const ctx = canvasRef.current.getContext('2d');
  if (!ctx) return;

  // limit stack size to 20
  if (undoStack.current.length > 20) undoStack.current.shift();

  undoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
  // clear redo stack on new action
  redoStack.current = [];

  setCanUndo(true);
  setCanRedo(false);
  }, []);

  const performUndo = useCallback(() => {
  if (undoStack.current.length === 0 || !canvasRef.current) return;
  const ctx = canvasRef.current.getContext('2d');
  if (!ctx) return;

  // save current to redo
  redoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));

  const previousState = undoStack.current.pop();
  if (previousState) {
  ctx.putImageData(previousState, 0, 0);
  saveCanvas(); // save but don't snapshot
  }

  setCanUndo(undoStack.current.length > 0);
  setCanRedo(true);
  }, []);

  const performRedo = useCallback(() => {
  if (redoStack.current.length === 0 || !canvasRef.current) return;
  const ctx = canvasRef.current.getContext('2d');
  if (!ctx) return;

  // save current to undo
  undoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));

  const nextState = redoStack.current.pop();
  if (nextState) {
  ctx.putImageData(nextState, 0, 0);
  saveCanvas();
  }

  setCanUndo(true);
  setCanRedo(redoStack.current.length > 0);
  }, []);

  // load Canvas
  useEffect(() => {
  // determine incoming URL (supports legacy string or object shape)
  const incomingUrl = typeof savedCanvasData === 'string' ? savedCanvasData : (savedCanvasData && savedCanvasData.url ? savedCanvasData.url : null);
  // only load if different from what we last synced (avoid overwritting local edits)
  if (incomingUrl && (incomingUrl !== lastSyncedUrlRef.current || !lastSyncedUrlRef.current)) {
  // check existence of local undo stack to prevent overwriting WIP
  if (undoStack.current.length > 0 && incomingUrl === lastSyncedUrlRef.current) return;

  const loadCanvasImage = async () => {
 try {
 // savedCanvasData may be a string (legacy) or an object { id, url, data }
 let fileUrl: string | null = null;
 let backupDataUrl: string | undefined;
 if (typeof savedCanvasData === 'string') {
 fileUrl = savedCanvasData;
 } else if (savedCanvasData && typeof savedCanvasData === 'object') {
 fileUrl = savedCanvasData.url || null;
 backupDataUrl = savedCanvasData.data;
 }

 // if we have inline data backup, use it first (this avoids auth/fetch issues)
 if (backupDataUrl) {
 try {
   const img = new Image();
   img.onload = () => {
   const ctx = canvasRef.current?.getContext('2d');
   if (ctx && canvasRef.current) {
   ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
   ctx.drawImage(img, 0, 0);
   lastSyncedUrlRef.current = fileUrl; // mark origin URL if present
   if (undoStack.current.length === 0) saveSnapshot();
   }
   };
   img.src = backupDataUrl;
   return; // done
 } catch (e) {
   console.warn('Failed to load inline data backup', e);
 }
 }

 if (!fileUrl) {
 // nothing to load
 return;
 }

 // prefer server-side proxied download (avoids CORS); fall back to direct fetch if proxy isn't available
 try {
 const attachId = savedCanvasData && typeof savedCanvasData === 'object' ? savedCanvasData.id : null;
 if (attachId && client && (client as any).downloadAttachmentBlob) {
   const blob = await (client as any).downloadAttachmentBlob(String(attachId));
   if (blob instanceof Blob) {
   const objectUrl = URL.createObjectURL(blob);
   const img = new Image();
   img.onload = () => {
   const ctx = canvasRef.current?.getContext('2d');
   if (ctx && canvasRef.current) {
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  ctx.drawImage(img, 0, 0);
  lastSyncedUrlRef.current = savedCanvasData?.url || null;
  URL.revokeObjectURL(objectUrl);
  console.log("Canvas loaded successfully via proxied download.");
  if (undoStack.current.length === 0) saveSnapshot();
   }
   };
   img.src = objectUrl;
   return;
   }
 }
 } catch (e) {
 console.warn('Proxied download also failed for canvas background:', e);
 }

 // fallback: try direct fetch (may fail due to CORS)
 try {
 console.log("Fetching canvas blob from:", fileUrl);
 const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
 const response = await fetch(fileUrl, { headers });
 if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
 const blob = await response.blob();
 const objectUrl = URL.createObjectURL(blob);
 console.log("Blob fetch success, objectUrl:", objectUrl);

 const img = new Image();
 img.onload = () => {
   const ctx = canvasRef.current?.getContext('2d');
   if (ctx && canvasRef.current) {
   ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
   ctx.drawImage(img, 0, 0);
   lastSyncedUrlRef.current = fileUrl;
   URL.revokeObjectURL(objectUrl);
   console.log("Canvas loaded successfully.");
   // initialize undo stack with this state if empty
   if (undoStack.current.length === 0) {
   saveSnapshot();
   }
   }
 };
 img.src = objectUrl;


 } catch (e) {
 console.warn("Direct fetch failed for canvas background:", e);

 // attempt to fetch via server-side proxy (attachment download) using attachment id
 try {
   const attachId = savedCanvasData && typeof savedCanvasData === 'object' ? savedCanvasData.id : null;
   if (attachId && client && (client as any).downloadAttachmentBlob) {
   const blob = await (client as any).downloadAttachmentBlob(String(attachId));
   if (blob instanceof Blob) {
   const objectUrl = URL.createObjectURL(blob);
   const img = new Image();
   img.onload = () => {
  const ctx = canvasRef.current?.getContext('2d');
  if (ctx && canvasRef.current) {
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  ctx.drawImage(img, 0, 0);
  lastSyncedUrlRef.current = savedCanvasData?.url || null;
  URL.revokeObjectURL(objectUrl);
  console.log("Canvas loaded successfully via proxied download.");
  if (undoStack.current.length === 0) saveSnapshot();
  }
   };
   img.src = objectUrl;
   return;
   }
   }
 } catch (e2) {
   console.error('Proxied download also failed for canvas background:', e2);
 }

 console.error("Failed to load canvas background:", e);
 }
 } catch (err) {
 console.error("Critical error in loadCanvasImage:", err);
 }
  };
  loadCanvasImage();
  }
  }, [savedCanvasData, saveSnapshot]);

  // load persisted floating selection (if any)
  useEffect(() => {
  if (savedFloatingselection) {
  try {
 const parsed = JSON.parse(savedFloatingselection);
 if (parsed && parsed.image) {
 _setFloatingselection(parsed);
 return;
 }
  } catch (e) {
 console.error('Failed to parse saved floating selection:', e);
  }
  }
  // fallback to local persisted floating selection if available
  try {
  const local = localStorage.getItem('dashboard_floating_local');
  if (local) {
 const parsed = JSON.parse(local);
 if (parsed && parsed.image) _setFloatingselection(parsed);
  }
  } catch (e) { }
  }, [savedFloatingselection]);

  // persist floating selection when it changes (debounced)
  useEffect(() => {
  if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
  saveTimerRef.current = (window.setTimeout(() => {
  try {
 if (floatingselection) setSavedFloatingselection(JSON.stringify(floatingselection));
 else setSavedFloatingselection(null);
  } catch (e) {
 console.error('Failed to persist floating selection:', e);
  }
  }, 200) as unknown) as number;
  return () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); };
  }, [floatingselection, setSavedFloatingselection]);

  const saveCanvas = useCallback(async () => {
  if (!canvasRef.current) return;

  return new Promise<void>((resolve, reject) => {
  canvasRef.current?.toBlob(async (blob) => {
 if (!blob) {
 console.error("Canvas toBlob failed (empty or tainted?)");
 reject(new Error("Canvas export failed"));
 return;
 }
 // also store a local fallback dataURL
 try {
 const reader = new FileReader();
 reader.onloadend = () => {
 try { localStorage.setItem('dashboard_canvas_local', reader.result as string); } catch (e) { }
 };
 reader.readAsDataURL(blob);
 } catch (e) { /* ignore local fallback errors */ }

 const file = new File([blob], "canvas_state.png", { type: "image/png" });
 try {
 const res = await client.upload(file);

 // handle variable response structures
 const uploadedUrl = res?.data?.url || res?.url;

 if (uploadedUrl) {
 const url = uploadedUrl;
 const id = res?.data?.id || res?.id;

 // create helper to convert Blob -> dataURL
 const blobToDataURL = async (b: Blob): Promise<string | undefined> => {
   return await new Promise((resolve) => {
   try {
   const reader = new FileReader();
   reader.onloadend = () => resolve(reader.result as string);
   reader.onerror = () => resolve(undefined);
   reader.readAsDataURL(b);
   } catch (e) { resolve(undefined); }
   });
 };

 // prefer server-side proxied download (avoids CORS); fall back to direct fetch if proxy isn't available
 // use the local blob directly to create the backup dataURL
 // this avoids the 500/403 errors when trying to fetch back the image we just uploaded
 const dataUrl = await blobToDataURL(blob);

 const payload: any = { id, url };
 if (dataUrl && dataUrl.length < 1_000_000) payload.data = dataUrl; // include small backup

 lastSyncedUrlRef.current = url;
 setSavedCanvasData(payload);

 // force a flush so the setting persists immediately and is visible to other devices
 try {
   await (flushSavedCanvas?.(payload) ?? Promise.resolve());
   resolve();
 } catch (e) {
   console.error('Failed to flush saved canvas setting', e);
   reject(e);
 }

 canvasDirtyRef.current = false;
 } else {
 console.error("Upload succeeded but no URL found in response:", res);
 reject(new Error("Upload succeeded but provided no URL"));
 }
 } catch (e) {
 console.error("Canvas sync failed", e);
 toast.error("Failed to sync canvas");
 reject(e);
 }
  });
  });
  }, [client, setSavedCanvasData, token, flushSavedCanvas]);



  // keyboard Shortcuts
  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
 e.preventDefault();
 performUndo();
  }
  // support both Ctrl+V and Ctrl+Y for redo (user requested Ctrl+V as redo)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'y')) {
 e.preventDefault();
 performRedo();
  }
  };
  window.addEventListener('keydown', handleKeyDown);

  // save local fallback when user leaves the page to avoid losing progress
  const handleBeforeUnload = () => {
  try {
 if (!canvasRef.current) return;
 const dataUrl = canvasRef.current.toDataURL('image/png');
 localStorage.setItem('dashboard_canvas_local', dataUrl);
 // also persist floating selection
 if (floatingselection) {
 localStorage.setItem('dashboard_floating_local', JSON.stringify(floatingselection));
 } else {
 localStorage.removeItem('dashboard_floating_local');
 }
  } catch (e) { /* ignore */ }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  };
  }, [performUndo, performRedo, floatingselection]);


  // fetch Widget Data Removed


  // --- Widget Operations ---

  const handleAddWidget = (collectionName: string, viewType: ViewType) => {
  const col = collections.find(c => c.name === collectionName);
  const newWidget: WidgetDefinition = {
  id: Math.random().toString(36).substring(7),
  type: 'view',
  title: col?.title || collectionName,
  collectionName,
  viewType,
  x: 0,
  y: 0,
  w: 600,
  h: 400,
  zIndex: 10
  };
  setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
  };

  const handleAddDocumentWidget = (docId: string, title: string) => {
  const newWidget: WidgetDefinition = {
  id: Math.random().toString(36).substring(7),
  type: 'document',
  title: title,
  collectionName: docId, // overload collectionName for docId
  viewType: 'table', // dummy
  x: 0,
  y: 0,
  w: 300,
  h: 150,
  zIndex: 10
  };
  setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
  };



  // ... (Drawing State omitted, matching existing code structure)
  // wait, I shouldn't replace lines I don't see.
  // i will target the exact block around line 50-60 and add `members` and update `wizardTab`.

  // actually, to make it safe, I'll just Replace the single line 55 and Add `members` line 46.
  // but I can't do non-contiguous edits in one replace_file_content unless contiguous.
  // i'll use multi_replace for this.

  // oh wait, I am in replace_file_content tool block. I should use multi_replace?
  // use multi_replace for safer edits.

  // i will cancel this tool call and use multi_replace.
  // wait, I can't cancel. I must output something.
  // i will output the handler function only, inserting it before `handleRemoveWidget`.

  const handleAddContactWidget = (memberId: string) => {
  const member = members.find(m => m.id === memberId);
  const newWidget: WidgetDefinition = {
  id: Math.random().toString(36).substring(7),
  type: 'contact',
  title: member?.name || 'Unknown Contact',
  collectionName: memberId, // storing memberId in collectionName
  viewType: 'table', // dummy
  x: 0,
  y: 0,
  w: 300,
  h: 350,
  zIndex: 10
  };
  setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
  };

  const handleRemoveWidget = (id: string) => {
  setWidgets((prev: WidgetDefinition[]) => prev.filter(w => w.id !== id));
  };



  const bringToFront = (id: string) => {
  setWidgets((prev: WidgetDefinition[]) => {
  const maxZ = Math.max(...prev.map((w: WidgetDefinition) => w.zIndex), 0);
  return prev.map((w: WidgetDefinition) => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
  });
  };

  // --- Widget selection & Resizing ---
  const [selectedWidgetId, setselectedWidgetId] = useState<string | null>(null);
  const resizeStateRef = useRef<{
  active: boolean;
  handle: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;
  startMouse: { x: number, y: number };
  startWidget: { x: number, y: number, w: number, h: number };
  }>({ active: false, handle: null, startMouse: { x: 0, y: 0 }, startWidget: { x: 0, y: 0, w: 0, h: 0 } });

  // --- Drawing Handlers ---
  const isDrawingRef = useRef(false);

  // refactored to accept explicit coordinates for routed events
  const startDrawing = useCallback((x: number, y: number, pressure: number = 0.5) => {
  if (drawingTool === 'none') return;
  saveSnapshot();

  isDrawingRef.current = true;
  const ctx = canvasRef.current!.getContext('2d')!;

  if (drawingTool === 'Pencil') {
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = brushColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  } else if (drawingTool === 'Eraser') {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = eraserSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  } else if (drawingTool === 'Lasso') {
  setlassoPoints([{ x, y }]);
  }
  }, [drawingTool, brushColor, brushSize, eraserSize, saveSnapshot]);

  /* handleCanvasDown/Move removed - logic moved to Container onPointerDown/Move */

  const handleCanvasUp = useCallback(() => {
  if (!isDrawingRef.current) return;
  isDrawingRef.current = false;
  saveCanvas();

  if (drawingTool === 'Lasso' && lassoPoints.length > 2) {
  // finish Lasso - Extract selection
  const ctx = canvasRef.current!.getContext('2d')!;

  // 1. Calc Bounds of the user's rough selection
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  lassoPoints.forEach(p => {
 minX = Math.min(minX, p.x);
 minY = Math.min(minY, p.y);
 maxX = Math.max(maxX, p.x);
 maxY = Math.max(maxY, p.y);
  });
  let w = maxX - minX;
  let h = maxY - minY;

  if (w <= 0 || h <= 0) { setlassoPoints([]); return; }

  // mAGIC LASSO LOGIC
  if (selectionMode === 'magic') {
 // expand bounds slightly to ensure we catch content near the line
 const pad = 2;
 const searchX = Math.max(0, minX - pad);
 const searchY = Math.max(0, minY - pad);
 const searchW = w + pad * 2;
 const searchH = h + pad * 2;

 // get data for the rough area
 const imageData = ctx.getImageData(searchX, searchY, searchW, searchH);
 const data = imageData.data;

 for (let y = 0; y < searchH; y++) {
 for (let x = 0; x < searchW; x++) {
 const idx = (y * searchW + x) * 4;
 const alpha = data[idx + 3];

 // if pixel is visible
 if (alpha > 10) {
   // check if this pixel is roughly inside/near the user's polygon
   // optimization: Just check if it's non-transparent?
   // the user said "automatically detects edges".
   // if we just check non-transparent, we might Select stuff *outside* the loop if the loop cuts through an object.
   // but usually "Magic Lasso" implies selecting objects *inside* the loop.
   // let's assume we only care about pixels that are non-transparent.
   // aND we should probably mask it by the user's polygon first?

   // for simplicity and speed:
   // 1. Create a temp canvas with the user's polygon filled.
   // 2. Composite 'source-in' with the original image data.
   // 3. This leaves ONLY the content inside the polygon.
   // 4. Then we calculate the bounds of THAT content.

   // let's implement that approach instead of raw pixel iteration first.
 }
 }
 }

 // tEMP CANVAS APPROACH (Robust)
 const tempCanvas = document.createElement('canvas');
 tempCanvas.width = canvasRef.current!.width;
 tempCanvas.height = canvasRef.current!.height;
 const tempCtx = tempCanvas.getContext('2d')!;

 // draw the user's polygon mask
 tempCtx.beginPath();
 lassoPoints.forEach((p, i) => i === 0 ? tempCtx.moveTo(p.x, p.y) : tempCtx.lineTo(p.x, p.y));
 tempCtx.closePath();
 tempCtx.fillStyle = '#000000'; // color doesn't matter, just alpha
 tempCtx.fill();

 // composite: Keep only image content that overlaps the mask
 tempCtx.globalCompositeOperation = 'source-in';
 tempCtx.drawImage(canvasRef.current!, 0, 0);

 // now find the bounds of the NON-TRANSPARENT pixels in this temp canvas
 // restrict search to the bounding box to save perf
 const maskedData = tempCtx.getImageData(minX, minY, w, h);
 const mData = maskedData.data;

 let contentMinX = w, contentMinY = h, contentMaxX = 0, contentMaxY = 0;
 let hasContent = false;

 for (let y = 0; y < h; y++) {
 for (let x = 0; x < w; x++) {
 const alpha = mData[(y * w + x) * 4 + 3];
 if (alpha > 5) { // threshold
   if (x < contentMinX) contentMinX = x;
   if (x > contentMaxX) contentMaxX = x;
   if (y < contentMinY) contentMinY = y;
   if (y > contentMaxY) contentMaxY = y;
   hasContent = true;
 }
 }
 }

 if (hasContent) {
 // add 1px buffer (or 0.5px logic as requested "half a pixel", we'll do 1px)
 const buffer = 1;
 const finalX = Math.max(0, minX + contentMinX - buffer);
 const finalY = Math.max(0, minY + contentMinY - buffer);
 const finalW = (contentMaxX - contentMinX) + (buffer * 2);
 const finalH = (contentMaxY - contentMinY) + (buffer * 2);

 // extract final tight crop from ORIGINAL canvas
 const finalData = ctx.getImageData(finalX, finalY, finalW, finalH);

 // helper to create data URL
 const c2 = document.createElement('canvas');
 c2.width = finalW;
 c2.height = finalH;
 c2.getContext('2d')!.putImageData(finalData, 0, 0);

 // clear original (using the tight bounds)
 ctx.save();
 ctx.globalCompositeOperation = 'destination-out';
 // we only want to clear the parts we moved?
 // or just clear the box? The user said "Select... ensure no pixels get left behind".
 // usually move tool clears the source.
 // but if we clear the BOX, we might cut background?
 // in a flat canvas, "background" is just pixels.
 // we should clear distinctively.
 // let's clear the exact captured rect.
 ctx.fillStyle = 'black';
 ctx.fillRect(finalX, finalY, finalW, finalH);
 ctx.restore();

 const newFloating = {
 image: c2.toDataURL(),
 x: finalX,
 y: finalY,
 w: finalW,
 h: finalH
 };
 setFloatingselection(newFloating);

 try {
 setSavedFloatingselection(JSON.stringify(newFloating));
 flushSavedFloating?.(JSON.stringify(newFloating)).catch(() => { });
 } catch (e) { }
 setlassoPoints([]);
 return;
 }
 // if no content found inside loop, fall back to standard loop selection or cancel?
 // let's fall back to standard behavior (empty selection)
  }


  // sTANDARD / RECT BEHAVIOR
  // 2. Clip and Extract
  ctx.save();
  ctx.beginPath();
  if (selectionMode === 'rect') {
 ctx.rect(minX, minY, w, h);
  } else {
 lassoPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  }
  ctx.closePath();
  ctx.clip();

  const imageData = ctx.getImageData(minX, minY, w, h);

  // clear original
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(); // fills the current path (polygon or rect) with "transparent"
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // store in temp canvas
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = w;
  cropCanvas.height = h;
  const cropCtx = cropCanvas.getContext('2d')!;
  cropCtx.putImageData(imageData, 0, 0);

  const newFloating = {
 image: cropCanvas.toDataURL(),
 x: minX,
 y: minY,
 w,
 h
  };
  setFloatingselection(newFloating);
  // persist floating selection so it can be resumed on another device
  try {
 setSavedFloatingselection(JSON.stringify(newFloating));
 // fire-and-forget flush to make sure it's on the server quickly
 flushSavedFloating?.(JSON.stringify(newFloating)).catch(() => { });
  } catch (e) {
 console.error('Failed to save floating selection:', e);
  }
  setlassoPoints([]);
  }
  }, [drawingTool, lassoPoints, saveCanvas, setSavedFloatingselection, flushSavedFloating, selectionMode]);

  const pasteselection = () => {
  if (!floatingselection || !canvasRef.current) return;

  saveSnapshot(); // snapshot before pasting back

  const ctx = canvasRef.current.getContext('2d')!;
  const img = new Image();
  img.onload = () => {
  ctx.drawImage(img, floatingselection.x, floatingselection.y, floatingselection.w, floatingselection.h);
  saveCanvas();
  setFloatingselection(null);
  // remove persisted floating selection after it's pasted
  try { setSavedFloatingselection(null); } catch (e) { /* ignore */ }
  };
  img.src = floatingselection.image;
  };



  // --- Touch Handling for Mobile Drawing ---

  useEffect(() => {
  const container = containerRef.current; // use container instead of canvas for touch/pointer
  if (!container) return;

  // we use Pointer Events on the Container now (see JSX), but we might need
  // passive: false for touch scrolling prevention if we want to support mobile drawing
  // properly. The React onPointerDown is good, but for move/up we might want window listeners
  // or container listeners.
  // for now, we rely on the Container's React Event handlers.

  // however, to prevent scrolling on touch devices while drawing:
  const handleTouchMove = (e: TouchEvent) => {
  if (isDrawingRef.current) e.preventDefault();
  };
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  // clean up
  return () => container.removeEventListener('touchmove', handleTouchMove);

  /* legacy Canvas Touch Handlers Removed in favor of Container Pointer Events */
  /*
  const handleTouchStart = (e: TouchEvent) => {

  if (drawingTool === 'none') return;
  if (e.touches.length === 1) {
 // drawing: Prevent default to stop mouse emulation / scrolling
 if (e.cancelable) e.preventDefault();

 const rect = canvas.getBoundingClientRect();
 const touch = e.touches[0];
 const x = touch.clientX - rect.left;
 const y = touch.clientY - rect.top;

 // mOCK event for reuse
 const mockE = { nativeEvent: { offsetX: x, offsetY: y } };
 handleCanvasDown(mockE);
  }
  };

  const handleTouchMove = (e: TouchEvent) => {
  if (drawingTool === 'none') return;
  if (e.touches.length === 1) {
 // 1 Finger: Block Scroll, Draw
 if (e.cancelable) e.preventDefault();

 const rect = canvas.getBoundingClientRect();
 const touch = e.touches[0];
 const x = touch.clientX - rect.left;
 const y = touch.clientY - rect.top;

 const mockE = { nativeEvent: { offsetX: x, offsetY: y } };
 handleCanvasMove(mockE);
  }
  // 2+ Fingers: Do nothing (don't preventDefault), let browser Pan/Zoom
  };

  const handleTouchEnd = () => {
  if (drawingTool === 'none') return;
  // if we were drawing (1 finger), finish it.
  // if we were panning (2 fingers), we didn't start a line technically (or shouldn't have).
  // handleCanvasUp checks isDrawingRef, so safe to call always.
  handleCanvasUp();
  };

  // attach non-passive listeners
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);

  return () => {
  canvas.removeEventListener('touchstart', handleTouchStart);
  canvas.removeEventListener('touchmove', handleTouchMove);
  canvas.removeEventListener('touchend', handleTouchEnd);
  };
  };
  */
  }, [drawingTool]); // simplified dependnecies as we just manage scroll prevention



  // --- Global Drag Logic (Widgets) ---
  const [dragState, setDragState] = useState<{
  id: string,
  startX: number,
  startY: number,
  initialX: number,
  initialY: number,
  initialW: number,
  initialH: number,
  mode: 'move' | 'resize'
  } | null>(null);

  useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
  if (!dragState) return;
  const deltaX = e.clientX - dragState.startX;
  const deltaY = e.clientY - dragState.startY;

  setWidgets(prev => prev.map(w => {
 if (w.id !== dragState.id) return w;
 if (dragState.mode === 'move') {
 return { ...w, x: dragState.initialX + deltaX, y: dragState.initialY + deltaY };
 } else {
 return { ...w, w: Math.max(200, dragState.initialW + deltaX), h: Math.max(150, dragState.initialH + deltaY) };
 }
  }));
  };
  const handleMouseUp = () => setDragState(null);

  if (dragState) {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  }
  return () => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  };
  }, [dragState]);

  const { setNodeRef, isOver } = useDroppable({ id: 'dashboard-canvas' });

  useEffect(() => {
  const handleExternalDrop = (e: CustomEvent<{ collectionName: string }>) => {
  handleAddWidget(e.detail.collectionName, 'table');
  };
  window.addEventListener('pkm:add-widget', handleExternalDrop as EventListener);
  return () => { window.removeEventListener('pkm:add-widget', handleExternalDrop as EventListener); };
  }, [widgets, collections]);

  if (!isAuthenticated) {
  return (
  <div className="p-4 md:p-8 h-full flex items-center justify-center">
 <Card className="max-w-md w-full">
 <CardHeader>
 <CardTitle>connect nocobase</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
   <Label>api token</Label>
   <Input
   type="password"
   value={apiKey}
   onChange={(e) => setApiKey(e.target.value)}
   placeholder="enter nocobase api token"
   />
   <p className="text-xs text-muted-foreground">
   your token is stored locally.
   </p>
   <p className="text-xs text-muted-foreground">
   <strong>note:</strong> dev servers use the full origin (host + port). if you started the dev server on a different port, you'll need to re-enter your api token for this origin.
   </p>
 </div>
 <Button className="w-full" onClick={() => { if (apiKey) login(apiKey); }}>connect</Button>
 </CardContent>
 </Card>
  </div>
  );
  }

  return (
  <div className="flex flex-col h-full bg-background overflow-hidden relative no-scrollbar">
  {/* toolbar */}
  <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b-2 border-primary bg-background z-[70] shadow-sm sticky top-0 relative">
 <div className="flex items-center gap-2">
 {/* grid Icon Removed */}
 {isOver && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">drop to add</span>}
 </div>

 <div className="flex items-center gap-2 relative">

 {/* drawing Tools */}
 <div className="flex items-center bg-muted/20 rounded-lg p-1 mr-2 border">
 <div className="relative">
   <Button
   variant={drawingTool === 'Pencil' ? "secondary" : "ghost"}
   size="icon"
   onClick={() => setDrawingTool(drawingTool === 'Pencil' ? 'none' : 'Pencil')}
   onContextMenu={(e) => {
   e.preventDefault();
   setColorPickerOpen(!colorPickerOpen);
   }}
   title="Pencil (right-click for options)"
   className={drawingTool === 'Pencil' ? "bg-accent" : ""}
   >
   <Pencil className="h-4 w-4" style={{ color: drawingTool === 'Pencil' ? brushColor : 'var(--primary)' }} />
   </Button>
   {colorPickerOpen && (
   <div className="absolute top-12 left-0 z-50 p-3 bg-popover border rounded-xl shadow-xl w-64 space-y-3">
   <div className="fixed inset-0 z-40" onClick={() => setColorPickerOpen(false)} />
   <div className="relative z-50 space-y-3">
  <div className="space-y-1">
  <div className="flex justify-between text-xs font-medium text-muted-foreground">
  <span>brush size</span>
  <span>{brushSize}px</span>
  </div>
  <input
  type="range"
  min="1"
  max="50"
  value={brushSize}
  onChange={(e) => setBrushSize(Number(e.target.value))}
  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
  />
  </div>
  <HexColorPicker color={brushColor} onChange={setBrushColor} style={{ width: '100%' }} />
   </div>
   </div>
   )}
 </div>

 <div className="relative">
   <Button
   variant={drawingTool === 'Eraser' ? "secondary" : "ghost"}
   size="icon"
   onClick={() => setDrawingTool(drawingTool === 'Eraser' ? 'none' : 'Eraser')}
   onContextMenu={(e) => {
   e.preventDefault();
   seteraserMenuOpen(!eraserMenuOpen);
   }}
   onTouchStart={() => {
   eraserTimerRef.current = setTimeout(() => seteraserMenuOpen(true), 600);
   }}
   onTouchEnd={() => {
   if (eraserTimerRef.current) clearTimeout(eraserTimerRef.current);
   }}
   className={drawingTool === 'Eraser' ? "bg-accent" : ""}
   >
   <Eraser className="h-4 w-4 text-[var(--primary)]" />
   </Button>
   {eraserMenuOpen && (
   <div className="absolute top-12 left-0 z-50 p-3 bg-popover border rounded-xl shadow-xl w-48">
   <div className="fixed inset-0 z-40" onClick={() => seteraserMenuOpen(false)} />
   <div className="relative z-50 space-y-1">
  <div className="flex justify-between text-xs font-medium text-muted-foreground">
  <span>Eraser size</span>
  <span>{eraserSize}px</span>
  </div>
  <input
  type="range"
  min="5"
  max="100"
  value={eraserSize}
  onChange={(e) => seteraserSize(Number(e.target.value))}
  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
  />
   </div>
   </div>
   )}
 </div>
 <div className="relative">
   <Button
   variant={drawingTool === 'Lasso' ? "secondary" : "ghost"}
   size="icon"
   onClick={() => {
   if (floatingselection) pasteselection();
   setDrawingTool(drawingTool === 'Lasso' ? 'none' : 'Lasso');
   }}
   onContextMenu={(e) => {
   e.preventDefault();
   setlassoMenuOpen(!lassoMenuOpen);
   }}
   className={drawingTool === 'Lasso' ? "bg-accent" : ""}
   title="Lasso (right-click for options)"
   >
   {selectionMode === 'rect' ? (
   <div className="h-4 w-4 border-2 border-current rounded-sm" />
   ) : selectionMode === 'magic' ? (
   <Wand2 className="h-4 w-4 text-[var(--primary)]" />
   ) : (
   <div className="h-4 w-4 relative">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 16.5l5.5-12.5l6 7l-5.5 12.5z" strokeDasharray="4" /></svg>
   </div>
   )}
   </Button>
   {lassoMenuOpen && (
   <div className="absolute top-12 left-0 z-50 p-3 bg-popover border rounded-xl shadow-xl w-48 space-y-2">
   <div className="fixed inset-0 z-40" onClick={() => setlassoMenuOpen(false)} />
   <div className="relative z-50 flex flex-col gap-1">
  <div className="text-xs font-medium text-muted-foreground mb-1 px-2">selection mode</div>
  <button
  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectionMode === 'free' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
  onClick={() => { setselectionMode('free'); setDrawingTool('Lasso'); setlassoMenuOpen(false); }}
  >
  <div className="h-4 w-4 relative"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 16.5l5.5-12.5l6 7l-5.5 12.5z" strokeDasharray="4" /></svg></div>
  freehand
  </button>
  <button
  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectionMode === 'rect' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
  onClick={() => { setselectionMode('rect'); setDrawingTool('Lasso'); setlassoMenuOpen(false); }}
  >
  <div className="h-4 w-4 border-2 border-current rounded-sm" />
  rectangle
  </button>
  <button
  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectionMode === 'magic' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
  onClick={() => { setselectionMode('magic'); setDrawingTool('Lasso'); setlassoMenuOpen(false); }}
  >
  <Wand2 className="h-4 w-4" />
  magic Lasso
  </button>
   </div>
   </div>
   )}
 </div>
 <Button
   variant={drawingTool === 'none' ? "secondary" : "ghost"}
   size="icon"
   onClick={() => {
   if (floatingselection) pasteselection();
   setDrawingTool('none');
   }}
   title="cursor (move widgets)"
   className={drawingTool === 'none' ? "bg-accent" : ""}
 >
   <MousePointer2 className="h-4 w-4 text-[var(--primary)]" />
 </Button>
 </div>

 <div className="h-6 w-px bg-border mx-2" />

 <Button
 variant={isEditMode ? "secondary" : "ghost"}
 size="icon"
 onClick={() => setIsEditMode(!isEditMode)}
 title={isEditMode ? "lock layout" : "unlock layout"}
 >
 {isEditMode ? <Unlock className="h-4 w-4 text-[var(--primary)]" /> : <Lock className="h-4 w-4 text-[var(--primary)]" />}
 </Button>

 <Button
 onClick={(e) => {
   e.stopPropagation();
   setAddMenuOpen(!addMenuOpen);
   setWizardStep('collection');
   setWizardSearch('');
 }}
 variant={addMenuOpen ? "secondary" : "default"}
 size="icon"
 title="add view"
 >
 <Plus className="h-4 w-4 text-[var(--primary)]" />
 </Button>

 {addMenuOpen && (
 <div
   className="absolute top-full right-0 mt-2 w-72 bg-popover border rounded-xl shadow-2xl z-[80] overflow-hidden flex flex-col"
   style={{ maxHeight: '400px' }}
   onClick={e => e.stopPropagation()}
 >
   {/* tabs for Databases / Documents */}
   <div className="flex border-b">
   <button
   className={`flex-1 py-2 text-xs font-semibold ${wizardTab === 'databases' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
   onClick={() => setWizardTab('databases')}
   >
   databases
   </button>
   <button
   className={`flex-1 py-2 text-xs font-semibold ${wizardTab === 'documents' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
   onClick={() => setWizardTab('documents')}
   >
   documents
   </button>
   <button
   className={`flex-1 py-2 text-xs font-semibold ${wizardTab === 'contacts' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
   onClick={() => setWizardTab('contacts')}
   >
   contacts
   </button>
   </div>

   {/* wizard Header */}
   {wizardTab === 'databases' && (
   <div className="p-3 border-b bg-muted/30">
   <div className="flex items-center gap-2 mb-2">
  {wizardStep === 'view' && (
  <Button
  variant="ghost"
  size="icon"
  className="h-6 w-6 -ml-1"
  onClick={() => { setWizardStep('collection'); setWizardSearch(''); }}
  >
  <div className="rotate-180">➤</div>
  </Button>
  )}
  <span className="text-sm font-semibold">
  {wizardStep === 'collection' ? 'Select database' : 'Select view type'}
  </span>
   </div>
   <Input
  placeholder={wizardStep === 'collection' ? "search collections..." : "search view types..."}
  value={wizardSearch}
  onChange={e => setWizardSearch(e.target.value)}
  className="h-8 text-xs bg-background"
  autoFocus
   />
   </div>
   )}

   {/* documents Header */}
   {(wizardTab === 'documents' || wizardTab === 'contacts') && (
   <div className="p-3 border-b bg-muted/30">
   <Input
  placeholder={`Search ${wizardTab}...`}
  value={wizardSearch}
  onChange={e => setWizardSearch(e.target.value)}
  className="h-8 text-xs bg-background"
  autoFocus
   />
   </div>
   )}

   {/* wizard Body */}
   <div className="overflow-y-auto flex-1 p-1">
   {wizardTab === 'databases' && wizardStep === 'collection' && (
   <div className="space-y-1">
  {collections
  .filter(c => (c.title || c.name).toLowerCase().includes(wizardSearch.toLowerCase()))
  .map(col => (
  <button
    key={col.name}
    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors"
    onClick={() => {
    setselectedCollectionForWizard(col.name);
    setWizardStep('view');
    setWizardSearch('');
    }}
  >
    <Database className="mr-2 h-4 w-4 opacity-50" />
    <div className="flex-1 truncate">
    {col.title || col.name}
    </div>
    <div className="text-xs text-muted-foreground">➤</div>
  </button>
  ))}
  {collections.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">no collections found</div>}
   </div>
   )}

   {wizardTab === 'databases' && wizardStep === 'view' && (
   <div className="grid grid-cols-1 gap-1">
  {VIEW_OPTIONS
  .filter(v => v.label.toLowerCase().includes(wizardSearch.toLowerCase()))
  .map(view => (
  <button
    key={view.id}
    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors group"
    onClick={() => {
    if (selectedCollectionForWizard) {
    handleAddWidget(selectedCollectionForWizard, view.id);
    setAddMenuOpen(false);
    }
    }}
  >
    <span className="w-8 h-8 rounded bg-muted flex items-center justify-center mr-3 group-hover:bg-background transition-colors">
    {view.icon ? <view.icon className="h-4 w-4" /> : <div className="h-4 w-4" />}
    </span>
    <div>
    <div className="font-medium">{view.label}</div>
    </div>
  </button>
  ))}
   </div>
   )}

   {wizardTab === 'documents' && (
   <div className="space-y-1">
  {localDocs
  .filter(d => d.title.toLowerCase().includes(wizardSearch.toLowerCase()))
  .map(doc => (
  <button
    key={doc.id}
    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors"
    onClick={() => {
    handleAddDocumentWidget(doc.id, doc.title);
    setAddMenuOpen(false);
    }}
  >
    <FileText className="mr-2 h-4 w-4 text-[var(--primary)]" />
    <div className="flex-1 truncate">
    {doc.title}
    </div>
    <Plus className="h-3 w-3 opacity-50" />
  </button>
  ))}
  {localDocs.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">no documents found</div>}
   </div>
   )}

   {wizardTab === 'contacts' && (
   <div className="space-y-1">
  {members
  .filter(m => m.name.toLowerCase().includes(wizardSearch.toLowerCase()))
  .map(member => (
  <button
    key={member.id}
    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center transition-colors"
    onClick={() => {
    handleAddContactWidget(member.id);
    setAddMenuOpen(false);
    }}
  >
    <User className="mr-2 h-4 w-4 text-primary" />
    <div className="flex-1 truncate">
    {member.name}
    </div>
    <Plus className="h-3 w-3 opacity-50" />
  </button>
  ))}
  {members.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">no contacts found</div>}
   </div>
   )}
   </div>
 </div>
 )}

 <div className="hidden md:flex items-center gap-2 mr-2">
 <Button
   variant="outline"
   size="icon"
   onClick={performUndo}
   disabled={!canUndo}
   title="Undo (Ctrl+Z)"
 >
   <span className="sr-only">undo</span>
   <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--primary)]"><path d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
 </Button>
 <Button
   variant="outline"
   size="icon"
   onClick={performRedo}
   disabled={!canRedo}
   title="Redo (Ctrl+V / Ctrl+Y)"
 >
   <span className="sr-only">redo</span>
   <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--primary)]"><path d="M10.1464 2.14645C10.3417 1.95118 10.6583 1.95118 10.8536 2.14645L12.8536 4.14645C13.0488 4.34171 13.0488 4.65829 12.8536 4.85355L10.8536 6.85355C10.6583 7.04882 10.3417 7.04882 10.1464 6.85355C9.95118 6.65829 9.95118 6.34171 10.1464 6.14645L11.2929 5H6C4.067 5 2.5 6.567 2.5 8.5C2.5 10.433 4.067 12 6 12H10C10.2761 12 10.5 12.2239 10.5 12.5C10.5 12.7761 10.2761 13 10 13H6C3.51472 13 1.5 10.9853 1.5 8.5C1.5 6.01472 3.51472 4 6 4H11.2929L10.1464 2.85355C9.95118 2.65829 9.95118 2.34171 10.1464 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
 </Button>
 </div>


 </div>
  </div>

  {/* mobile Undo/Redo Controls (Bottom Left) */}
  <div className="absolute bottom-4 left-4 z-[9999] md:hidden flex items-center gap-2">
 <Button
 variant="secondary"
 size="icon"
 onClick={performUndo}
 disabled={!canUndo}
 className="shadow-md border border-border"
 >
 <span className="sr-only">undo</span>
 <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
 </Button>
 <Button
 variant="secondary"
 size="icon"
 onClick={performRedo}
 disabled={!canRedo}
 className="shadow-md border border-border"
 >
 <span className="sr-only">redo</span>
 <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M10.1464 2.14645C10.3417 1.95118 10.6583 1.95118 10.8536 2.14645L12.8536 4.14645C13.0488 4.34171 13.0488 4.65829 12.8536 4.85355L10.8536 6.85355C10.6583 7.04882 10.3417 7.04882 10.1464 6.85355C9.95118 6.65829 9.95118 6.34171 10.1464 6.14645L11.2929 5H6C4.067 5 2.5 6.567 2.5 8.5C2.5 10.433 4.067 12 6 12H10C10.2761 12 10.5 12.2239 10.5 12.5C10.5 12.7761 10.2761 13 10 13H6C3.51472 13 1.5 10.9853 1.5 8.5C1.5 6.01472 3.51472 4 6 4H11.2929L10.1464 2.85355C9.95118 2.65829 9.95118 2.34171 10.1464 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
 </Button>
  </div>

  {/* canvas Area */}
  <div
 ref={(node) => {
 containerRef.current = node;
 setNodeRef(node);
 }}
 className={`flex-1 relative bg-[#050505] overflow-auto ${drawingTool === 'none' ? 'cursor-grab active:cursor-grabbing' : (drawingTool === 'Eraser' ? 'cursor-none' : 'cursor-crosshair')} ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
 onClick={() => setAddMenuOpen(false)}
 onPointerDown={(e) => {
 if (drawingTool === 'none') {
 // check for resize handle interaction first?
 // actually, handles are their own elements with stopPropagation usually,
 // but if we handle it here:
 const handleEl = (e.target as HTMLElement).closest('.resize-handle');
 if (handleEl) {
   // resize Start Logic handled by the handle's onPointerDown
   return;
 }

 // Select/Distort logic
 const widgetEl = (e.target as HTMLElement).closest('.dashboard-widget');
 if (widgetEl && widgets) {
   // find widget ID from element (we need to add data-id to widget)
   const widgetId = widgetEl.getAttribute('data-id');
   if (widgetId) {
   setselectedWidgetId(widgetId);
   }
 } else {
   // deselect if clicking background
   setselectedWidgetId(null);
 }
 } else {
 // if drawing, deselect?
 setselectedWidgetId(null);
 }

 // interaction Logic:
 // 1. If hitting an interactive element (button, input), let it pass (do nothing)
 const target = e.target as HTMLElement;
 if (target.closest('button, input, textarea, a, .interactive-el')) return;

 // 2. Check if hitting a Widget (Card)
 // 2. Check if hitting a Widget (Card)
 const widgetEl = target.closest('.dashboard-widget');

 if (drawingTool !== 'none') {
 if (widgetEl) {
   // hit a card! Drawing allowed.
   // calculate coordinates relative to the Canvas
   const wrapper = canvasRef.current?.parentElement;
   if (wrapper) {
   const rect = wrapper.getBoundingClientRect();
   const x = e.clientX - rect.left;
   const y = e.clientY - rect.top;

   startDrawing(x, y, e.pressure);
   e.preventDefault(); // prevent text selection / native drag
   (e.target as Element).setPointerCapture(e.pointerId);
   }
 } else {
   // hit background (Canvas). Drawing ALLOWED.
   const wrapper = canvasRef.current?.parentElement;
   if (wrapper) {
   const rect = wrapper.getBoundingClientRect();
   const x = e.clientX - rect.left;
   const y = e.clientY - rect.top;

   startDrawing(x, y, e.pressure);
   e.preventDefault();
   (e.target as Element).setPointerCapture(e.pointerId);
   }
 }
 }
 }}
 onContextMenu={(e) => {
 e.preventDefault();
 if (drawingTool === 'Pencil') {
 // open color/size picker near cursor or toggle menu
 // ideally we'd have a localized context menu, for now let's toggle the toolbar one
 // or usage the global context menu position if we had one for tools.
 // the user request: "allows you to change its size (or brush color)".
 setColorPickerOpen(true);
 } else if (drawingTool === 'Eraser') {
 seteraserMenuOpen(true);
 } else if (drawingTool === 'none') {
 // Select/Distort logic
 const widgetEl = (e.target as HTMLElement).closest('.dashboard-widget');
 if (widgetEl) {
   // logic to Select widget and show context menu
   // for now we just allow default or custom logic later
   // we need to identify WHICH widget.
   // we probably need to store 'selectedWidgetId' state.
 }
 }
 }}
 onPointerMove={(e) => {
 // we need to track this on the container because the mouse might move fast

 const wrapper = canvasRef.current?.parentElement;
 if (!wrapper) return;
 const rect = wrapper.getBoundingClientRect();
 const x = e.clientX - rect.left;
 const y = e.clientY - rect.top;

 // aLWAYS update mousePos for cursor visualization (Eraser)
 setMousePos({ x, y });

 // handle Resize (8-direction)
 if (resizeStateRef.current.active && selectedWidgetId) {
 const { handle, startMouse, startWidget } = resizeStateRef.current;
 // avoid sub-pixel rendering jitter if needed, or simply round? keeping transparent for now.
 const deltaX = x - startMouse.x;
 const deltaY = y - startMouse.y;

 setWidgets(prev => prev.map(w => {
   if (w.id !== selectedWidgetId) return w;

   let newX = startWidget.x;
   let newY = startWidget.y;
   let newW = startWidget.w;
   let newH = startWidget.h;

   // horizontal constraints
   if (handle?.includes('e')) {
   newW = Math.max(100, startWidget.w + deltaX);
   }
   if (handle?.includes('w')) {
   const proposedW = startWidget.w - deltaX;
   if (proposedW >= 100) {
   newW = proposedW;
   newX = startWidget.x + deltaX;
   } else {
   newW = 100;
   newX = startWidget.x + (startWidget.w - 100);
   }
   }

   // vertical constraints
   if (handle?.includes('s')) {
   newH = Math.max(100, startWidget.h + deltaY);
   }
   if (handle?.includes('n')) {
   const proposedH = startWidget.h - deltaY;
   if (proposedH >= 100) {
   newH = proposedH;
   newY = startWidget.y + deltaY;
   } else {
   newH = 100;
   newY = startWidget.y + (startWidget.h - 100);
   }
   }

   return { ...w, x: newX, y: newY, w: newW, h: newH };
 }));
 return;
 }

 if (!isDrawingRef.current) return;


 // direct context access to draw line
 const ctx = canvasRef.current!.getContext('2d')!;

 if (drawingTool === 'Pencil' || drawingTool === 'Eraser') {
 ctx.lineTo(x, y);
 ctx.stroke();
 canvasDirtyRef.current = true;
 // debounce save... (omitted implementation for brevity, reusing dirty flag)
 if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
 saveTimerRef.current = (setTimeout(() => {
   if (canvasDirtyRef.current) saveCanvas();
 }, 1000) as unknown) as number;
 } else if (drawingTool === 'Lasso') {
 if (selectionMode === 'rect') {
   setlassoPoints(prev => [prev[0], { x, y }]);
 } else {
   setlassoPoints(prev => [...prev, { x, y }]);
 }
 }
 }}
 onPointerUp={(e) => {
 handleCanvasUp();
 if (isDrawingRef.current) {
 (e.target as Element).releasePointerCapture(e.pointerId);
 }
 // end Resize
 if (resizeStateRef.current.active) {
 resizeStateRef.current.active = false;
 (e.target as Element).releasePointerCapture(e.pointerId);
 }
 }}
  >

 <div className="min-w-[2000px] min-h-[2000px] relative">

 {/* painting Canvas */}
 <canvas
 ref={canvasRef}
 width={2000}
 height={2000}
 className="absolute inset-0 z-[60]"
 style={{
   pointerEvents: 'none', // critical: Let events fall through to widgets/buttons
   // we toggle cursor via container or handled elsewhere, but keeping specific CSS here is okay if we want visual cues
   // actually, if pointerEvents is none, checking cursor style of this element is invalid.
   // we should set cursor on the Container or Body.
 }}
 // onContextMenu removed as it's blocked by pointerEvents non.
 // handled by global/container logic if needed.
 />

 {/* Eraser Cursor */}
 {drawingTool === 'Eraser' && (
 <div
   className="absolute z-[100] pointer-events-none rounded-full bg-white/10 shadow-[0_0_2px_rgba(0,0,0,0.5)]"
   style={{
   left: mousePos.x,
   top: mousePos.y,
   width: eraserSize,
   height: eraserSize,
   transform: 'translate(-50%, -50%)',
   border: '1px solid var(--primary)'
   }}
 />
 )}

 {/* Lasso Feedback */}
 {drawingTool === 'Lasso' && lassoPoints.length > 0 && (
 <svg className="absolute inset-0 z-[65] pointer-events-none" width={2000} height={2000}>
   {selectionMode === 'rect' && lassoPoints.length > 1 ? (
   <rect
   x={Math.min(lassoPoints[0].x, lassoPoints[1].x)}
   y={Math.min(lassoPoints[0].y, lassoPoints[1].y)}
   width={Math.abs(lassoPoints[1].x - lassoPoints[0].x)}
   height={Math.abs(lassoPoints[1].y - lassoPoints[0].y)}
   fill="hsla(var(--primary), 0.1)"
   stroke="hsl(var(--primary))"
   strokeDasharray="2 4"
   strokeLinecap="round"
   />
   ) : (
   <polygon
   points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
   fill={selectionMode === 'magic' ? "hsla(var(--primary), 0.05)" : "hsla(var(--primary), 0.1)"}
   stroke="hsl(var(--primary))"
   strokeDasharray="2 4"
   strokeLinecap="round"
   />
   )}
 </svg>
 )}

 {/* floating selection */}
 {floatingselection && (
 <div
   className="absolute z-[70] border-2 border-dashed border-[var(--primary)] group cursor-move"
   style={{ left: floatingselection.x, top: floatingselection.y, width: floatingselection.w, height: floatingselection.h }}
   onMouseDown={(e) => {
   e.stopPropagation();
   const startX = e.clientX;
   const startY = e.clientY;
   const initialX = floatingselection.x;
   const initialY = floatingselection.y;

   const handleMove = (e: MouseEvent) => {
   setFloatingselection((prev: any) => prev ? ({ ...prev, x: initialX + (e.clientX - startX), y: initialY + (e.clientY - startY) }) : null);
   };
   const handleUp = () => {
   window.removeEventListener('mousemove', handleMove);
   window.removeEventListener('mouseup', handleUp);
   };
   window.addEventListener('mousemove', handleMove);
   window.addEventListener('mouseup', handleUp);
   }}
 >
   <img src={floatingselection.image} className="w-full h-full pointer-events-none" />

   {/* resize Handle */}
   <div
   className="absolute -bottom-2 -right-2 w-4 h-4 bg-[var(--primary)] cursor-nwse-resize"
   onMouseDown={(e) => {
   e.stopPropagation();
   const startX = e.clientX;
   const startY = e.clientY;
   const initialW = floatingselection.w;
   const initialH = floatingselection.h;

   const handleResize = (e: MouseEvent) => {
  setFloatingselection((prev: any) => prev ? ({ ...prev, w: Math.max(10, initialW + (e.clientX - startX)), h: Math.max(10, initialH + (e.clientY - startY)) }) : null);
   };
   const handleUp = () => { window.removeEventListener('mousemove', handleResize); window.removeEventListener('mouseup', handleUp); };
   window.addEventListener('mousemove', handleResize);
   window.addEventListener('mouseup', handleUp);
   }}
   />
   {/* side Warp Handle */}
   <div
   className="absolute top-1/2 -right-2 w-2 h-4 bg-[var(--primary)] cursor-ew-resize -translate-y-1/2"
   onMouseDown={(e) => {
   e.stopPropagation();
   const startX = e.clientX;
   const initialW = floatingselection.w;
   const handleWarp = (e: MouseEvent) => {
  setFloatingselection((prev: any) => prev ? ({ ...prev, w: Math.max(10, initialW + (e.clientX - startX)) }) : null);
   };
   const handleUp = () => { window.removeEventListener('mousemove', handleWarp); window.removeEventListener('mouseup', handleUp); };
   window.addEventListener('mousemove', handleWarp);
   window.addEventListener('mouseup', handleUp);
   }}
   />

   <div className="absolute -top-8 left-0 flex gap-2">
   <Button size="sm" onClick={pasteselection} variant="secondary">
   <Check className="h-3 w-3 mr-1" /> Done
   </Button>
   </div>
 </div>
 )}

 {widgets.map(widget => {
 // render Contact Widget
 if (widget.type === 'contact') {
   const member = members.find(m => m.id === widget.collectionName);
   return (
   <div
   key={widget.id}
   data-id={widget.id}
   className={`dashboard-widget absolute flex flex-col Select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`}
   style={{
  left: widget.x,
  top: widget.y,
  width: widget.w,
  height: widget.h,
  zIndex: widget.zIndex,
   }}
   onMouseDown={() => bringToFront(widget.id)}
   >
   <div className="w-full h-full relative group">
  {member ? (
  <HeadmateCard member={member} className="w-full h-full" />
  ) : (
  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground border rounded-xl">Contact Not Found</div>
  )}

  {/* remove Button */}
  {isEditMode && (
  <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
  <Button variant="secondary" size="icon" className="h-6 w-6 shadow-md" onClick={() => handleRemoveWidget(widget.id)}>
    <X className="h-3 w-3" />
  </Button>
  </div>
  )}

  {/* move Handle (Top Zone) */}
  {isEditMode && (
  <div
  className="absolute inset-x-0 top-0 h-12 cursor-move z-40"
  onMouseDown={(e) => {
    e.preventDefault();
    setDragState({
    id: widget.id,
    startX: e.clientX, startY: e.clientY,
    initialX: widget.x, initialY: widget.y,
    initialW: widget.w, initialH: widget.h,
    mode: 'move'
    });
  }}
  />
  )}

  {/* resize Handle */}
  {isEditMode && (
  <div
  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
  onMouseDown={(e) => {
    e.stopPropagation(); e.preventDefault();
    setDragState({
    id: widget.id,
    startX: e.clientX, startY: e.clientY,
    initialX: widget.x, initialY: widget.y,
    initialW: widget.w, initialH: widget.h,
    mode: 'resize'
    });
  }}
  >
  <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
  </div>
  )}
   </div>

   {/* selection Handles */}
   {selectedWidgetId === widget.id && drawingTool === 'none' && (
  <>
  <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />
  {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
  <div
    key={h}
    className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
    style={{
    cursor: `${h}-resize`,
    top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
    left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
    }}
    onPointerDown={(e) => {
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const wrapper = canvasRef.current?.parentElement;
    if (wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    resizeStateRef.current = {
   active: true,
   handle: h as any,
   startMouse: { x, y },
   startWidget: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    };
    }
    }}
  />
  ))}
  </>
   )}
   </div>
   )
 }

 // render Document Widget
 if (widget.type === 'document') {
   return (
   <div
   key={widget.id}
   data-id={widget.id}
   className={`dashboard-widget absolute flex flex-col Select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`}
   style={{
  left: widget.x,
  top: widget.y,
  width: widget.w,
  height: widget.h,
  zIndex: widget.zIndex,
   }}
   onMouseDown={() => bringToFront(widget.id)}
   >
   <Card className="w-full h-full flex flex-col shadow-lg border-2 border-border/50 group overflow-hidden rounded-xl isolate">
  <CardHeader
  className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/20 handle cursor-move rounded-t-[inherit]"
  onMouseDown={(e) => {
  if (!isEditMode) return;
  e.preventDefault();
  setDragState({
    id: widget.id,
    startX: e.clientX, startY: e.clientY,
    initialX: widget.x, initialY: widget.y,
    initialW: widget.w, initialH: widget.h,
    mode: 'move'
  });
  }}
  >
  <div className="flex items-center gap-2">
  <FileText className="h-4 w-4 text-[var(--primary)]" />
  <CardTitle className="text-sm font-bold flex items-center gap-2 truncate">
    {widget.title}
  </CardTitle>
  </div>
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveWidget(widget.id)} title="Remove Widget">
    <X className="h-3 w-3" />
  </Button>
  </div>
  </CardHeader>
  <CardContent className="flex-1 flex items-center justify-center bg-background p-4 flex-col text-center gap-2 rounded-b-[inherit]">
  <Button
  variant="secondary"
  className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
  onClick={() => navigate(`/canvas/${widget.collectionName}`)}
  >
  <ExternalLink className="h-6 w-6 mb-1 opacity-50" />
  <span className="text-xs">Open Canvas</span>
  </Button>
  </CardContent>
   </Card>

   {isEditMode && (
  <div
  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
  onMouseDown={(e) => {
  e.stopPropagation(); e.preventDefault();
  setDragState({
    id: widget.id,
    startX: e.clientX, startY: e.clientY,
    initialX: widget.x, initialY: widget.y,
    initialW: widget.w, initialH: widget.h,
    mode: 'resize'
  });
  }}
  >
  <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
  </div>
   )}

   {/* resize Handles (Only if selected) */}
   {selectedWidgetId === widget.id && drawingTool === 'none' && (
  <>
  {/* border Highlighting */}
  <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />
  {/* handles */}
  {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
  <div
    key={h}
    className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
    style={{
    cursor: `${h}-resize`,
    top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
    left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
    }}
    onPointerDown={(e) => {
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const wrapper = canvasRef.current?.parentElement;
    if (wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    resizeStateRef.current = {
   active: true,
   handle: h as any,
   startMouse: { x, y },
   startWidget: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    };
    }
    }}
  />
  ))}
  </>
   )}
   </div>
   );
 }

 const col = collections.find(c => c.name === widget.collectionName);
 if (!col) return null;

 return (
   <div
   key={widget.id}
   data-id={widget.id}
   className={`dashboard-widget absolute flex flex-col Select-none transition-shadow ${selectedWidgetId === widget.id ? 'z-[60]' : ''}`} // removed border/bg since Widget has it
   style={{
   left: widget.x,
   top: widget.y,
   width: widget.w,
   height: widget.h,
   zIndex: widget.zIndex,
   }}
   onMouseDown={() => bringToFront(widget.id)}
   >
   <DatabaseWidget
   collection={col}
   initialView={widget.viewType}
   className="w-full h-full"
   onRemove={() => handleRemoveWidget(widget.id)}
   viewConfig={widget.viewConfig}
   onConfigChange={(newConfig) => {
  setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, viewConfig: newConfig } : w));
   }}
   onHeaderMouseDown={(e) => {
  if (!isEditMode) return;
  e.preventDefault();
  setDragState({
  id: widget.id,
  startX: e.clientX, startY: e.clientY,
  initialX: widget.x, initialY: widget.y,
  initialW: widget.w, initialH: widget.h,
  mode: 'move'
  });
   }}
   />

   {isEditMode && (
   <div
  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 z-50"
  onMouseDown={(e) => {
  e.stopPropagation(); e.preventDefault();
  setDragState({
  id: widget.id,
  startX: e.clientX, startY: e.clientY,
  initialX: widget.x, initialY: widget.y,
  initialW: widget.w, initialH: widget.h,
  mode: 'resize'
  });
  }}
   >
  <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
   </div>
   )}

   {/* resize Handles (Only if selected) */}
   {selectedWidgetId === widget.id && drawingTool === 'none' && (
   <>
  {/* border Highlighting */}
  <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />

  {/* handles */}
  {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((h) => (
  <div
  key={h}
  className="resize-handle absolute w-3 h-3 !bg-transparent rounded-full z-[60] !opacity-0 transition-opacity"
  style={{
    cursor: `${h}-resize`,
    top: h.includes('n') ? -6 : (h.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'),
    left: h.includes('w') ? -6 : (h.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)')
  }}
  onPointerDown={(e) => {
    e.stopPropagation(); // stop drag/Select
    e.currentTarget.setPointerCapture(e.pointerId);

    // calc start pos relative to container
    const wrapper = canvasRef.current?.parentElement;
    if (wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    resizeStateRef.current = {
    active: true,
    handle: h as any,
    startMouse: { x, y },
    startWidget: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    };
    }
  }}
  />
  ))}
   </>
   )}
   </div>
 );
 })}
 </div>
 {/* global Context Menu */}
 {globalContextMenu && (
 <div
 className="fixed z-[9999] p-4 bg-popover border rounded-xl shadow-2xl space-y-4 w-64 animate-in fade-in zoom-in-95 duration-100"
 style={{ left: globalContextMenu.x, top: globalContextMenu.y }}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="fixed inset-0 z-[-1]" onClick={() => setGlobalContextMenu(null)} />

 <div className="space-y-4 relative z-10">
   <div className="flex items-center justify-between border-b pb-2">
   <span className="font-semibold text-sm">Tools</span>
   <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setGlobalContextMenu(null)}>✕</Button>
   </div>

   {/* hex Color Picker (Always) */}
   <HexColorPicker color={brushColor} onChange={setBrushColor} style={{ width: '100%' }} />

   {/* brush Slider (Only if Brush) */}
   {drawingTool === 'Pencil' && (
   <div className="space-y-1">
   <div className="flex justify-between text-xs font-medium text-muted-foreground">
  <span>Brush Size</span>
  <span>{brushSize}px</span>
   </div>
   <input
  type="range"
  min="1"
  max="50"
  value={brushSize}
  onChange={(e) => setBrushSize(Number(e.target.value))}
  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
   />
   </div>
   )}

   {/* Eraser Slider (Always, per request) */}
   <div className="space-y-1">
   <div className="flex justify-between text-xs font-medium text-muted-foreground">
   <span>Eraser Size</span>
   <span>{eraserSize}px</span>
   </div>
   <input
   type="range"
   min="5"
   max="100"
   value={eraserSize}
   onChange={(e) => seteraserSize(Number(e.target.value))}
   className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
   />
   </div>
 </div>
 </div>
 )}
  </div>
  </div>
  );
}
