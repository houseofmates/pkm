import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Play, Eye, Database, Layout, Info, Wand2, Maximize2, FilePlus, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend, ScatterChart, Scatter, CartesianGrid } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import PreviewCanvas from '@/components/preview-canvas';
import EventModal from '@/components/event-modal';
import { api } from '@/api/nocobase-client';
import { useAuth } from '@/contexts/auth-context';
import { useAppSetting } from '@/hooks/use-app-setting';
import { generateSlug } from '@/features/blog-builder/utils/blog-utils';
import type { NavItem } from '@/components/navigation';
export function TemplatePage() {
  const navigate = useNavigate();
  // load saved template from persistent storage
  const [savedTemplate, setSavedTemplate] = useAppSetting<string>('saved_template_json', '');
  
  const [json, setJson] = useState(`{
  "meta": { "name": "universal dashboard", "icon": "Layout", "description": "Sample dashboard", "llm_guidance": {
    "purpose": "This template demonstrates a multi-column, interactive dashboard suitable for project tracking, metrics, and location mapping. Use as a baseline for generating customized workspace templates.",
    "customization_tips": "Adjust 'databases' schemas to match your domain, change 'layout.columns' to reorganize sections, and add 'components' to 'custom' widgets for interactive controls.",
    "assistive_elements": ["sample rows in 'data' for quick preview","form widgets to create sample rows","kanban lanes for status workflows","charts tied to 'metrics' for visual insight"],
    "llm_instructions": "When expanding this template, prioritize accessible labels, include sample rows that cover edge cases, and provide human-friendly titles. Offer optional variant suggestions such as 'compact', 'expanded', and 'reporting' layouts." } },
  "data": {
    "tasks": [
      { "id": "t1", "title": "Design mockups", "status": "todo", "due_date": "2026-03-05T12:00:00Z" },
      { "id": "t2", "title": "API integration", "status": "doing", "due_date": "2026-03-07T09:00:00Z" }
    ],
    "locations": [ { "id": "l1", "name": "HQ", "lat": 51.505, "lng": -0.09 } ],
    "metrics": [ { "timestamp": "2026-02-01T00:00:00Z", "metric_type": "requests", "value": 120 } ]
  },
  "databases": [
    { "key": "tasks", "properties": [ { "name": "title", "type": "text" }, { "name": "status", "type": "select", "options": ["todo","doing","done"] } ] },
    { "key": "locations", "properties": [ { "name": "name", "type": "text" }, { "name": "lat", "type": "number" }, { "name": "lng", "type": "number" } ] },
    { "key": "metrics", "properties": [ { "name": "timestamp", "type": "datetime" }, { "name": "metric_type", "type": "text" }, { "name": "value", "type": "number" } ] }
  ],
  "layout": {
    "columns": [ [ { "view_type": "kanban", "source": "tasks", "title": "Tasks" } ], [ { "view_type": "chart", "source": "metrics", "title": "Requests Over Time", "chart": { "type": "line", "x": "timestamp", "y": "value" } } ] ],
    "columnWidths": [50,50]
  }
}`);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [previewState, setPreviewState] = useState<Record<string, any>>({});
  const [previewData, setPreviewData] = useState<Record<string, any[]>>({});
  // livecolumns holds interactive layout state for preview and persists to json
  const [liveColumns, setLiveColumns] = useState<any[][]>([]);
  
  // fullscreen preview dialog state
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // persist helper: write columns back into the json and push history for undo
  const persistColumns = (cols:any[][]) => {
    try {
      const parsed = JSON.parse(json);
      parsed.layout = parsed.layout || {};
      parsed.layout.columns = cols;
      // push history
      setPreviewState(s => ({...s, history: [...(s.history||[]), json]}));
      setJson(JSON.stringify(parsed, null, 2));
    } catch (e) { /* ignore */ }
  };

  const undoLastChange = () => {
    setPreviewState(s => {
      const hist = s.history || [];
      if (hist.length === 0) return s;
      const last = hist[hist.length-1];
      try { setJson(last); } catch(e) {}
      return {...s, history: hist.slice(0,-1)};
    });
  };

  const updateWidgetConfig = (targetWidget: any, patch: Record<string, any>) => {
    // shallow-merge patch into the matching widget in livecolumns and persist
    const cols = liveColumns.map(col => col.map(w => w === targetWidget ? ({...w, ...patch}) : w));
    setLiveColumns(cols);
    persistColumns(cols);
  };

  // load saved template on mount
  useEffect(() => {
    if (savedTemplate && savedTemplate.trim()) {
      try {
        // validate it's proper json before setting
        JSON.parse(savedTemplate);
        setJson(savedTemplate);
  
      } catch (e) {
        // invalid saved json, ignore and use default
        console.warn('Saved template is invalid JSON, using default');
      }
    }
  }, []); // Only run on mount

  // save current json to persistent storage
  const saveTemplate = async () => {
    try {
      // validate json before saving
      JSON.parse(json);
      await setSavedTemplate(json);
    } catch (e) {
      toast.error('cannot save: invalid json');
    }
  };

  useEffect(() => {
    try {
      const parsed = JSON.parse(json);
      // seed previewdata from parsed.data if present, or from databases rows/sample/records
      const seed: Record<string, any[]> = {};
      if (parsed?.data && typeof parsed.data === 'object') {
        Object.keys(parsed.data).forEach(k => { seed[k] = Array.isArray(parsed.data[k]) ? parsed.data[k] : []; });
      }
      if (Array.isArray(parsed?.databases)) {
        for (const db of parsed.databases) {
          if (!seed[db.key]) {
            seed[db.key] = db.rows || db.sample || db.records || [];
          }
        }
      }
      setPreviewData(seed);
      // initialize column widths if provided
      try {
        const parsed = JSON.parse(json);
        if (parsed?.layout?.columnWidths && Array.isArray(parsed.layout.columnWidths)) {
          setPreviewState(s => ({...s, columnWidths: parsed.layout.columnWidths.slice(0,4)}));
        } else {
          // equal widths for up to 4 columns
          const cols = (parsed?.layout?.columns?.length) || 1;
          const w = Math.floor(100/cols);
          setPreviewState(s => ({...s, columnWidths: Array(cols).fill(w)}));
        }
      } catch(e) {}
    } catch (e) {
      // ignore parse errors here
    }
  }, [json]);

  // sync livecolumns from json when preview is validated or json changes
  useEffect(() => {
    if (!isValid) return;
    try {
      const parsed = JSON.parse(json);
      const cols = parsed?.layout?.columns && Array.isArray(parsed.layout.columns) && parsed.layout.columns.length > 0
        ? parsed.layout.columns
        : [parsed?.layout?.widgets || []];
      setLiveColumns(cols.map((c:any) => Array.isArray(c) ? c : []));
    } catch (e) {
      // ignore
    }
  }, [json, isValid]);

  // sync previewdata into editor json (manual apply)
  const syncPreviewToJson = () => {
    try {
      const parsed = JSON.parse(json);
      parsed.data = previewData;
      parsed.layout = parsed.layout || {};
      parsed.layout.columnWidths = previewState.columnWidths || parsed.layout.columnWidths;
      setJson(JSON.stringify(parsed, null, 2));
      
    } catch (e:any) {
      toast.error('failed to sync: invalid json');
    }
  };


  const { client } = useAuth();
  const [sidebarItems, setSidebarItems] = useAppSetting<NavItem[]>('sidebar_items', []);

  // event modal state (must be top-level hooks to keep hook order stable)
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const onEditEvent = (ev:any) => { setEditingEvent(ev); setEventModalOpen(true); };

  const validateJson = () => {
  try {
  const parsed = JSON.parse(json);
  if (!parsed.meta?.name) throw new Error('Missing meta.name');
  if (!Array.isArray(parsed.databases)) throw new Error('databases must be an array');
  setIsValid(true);
  setError(null);
  
  return parsed;
  } catch (e: any) {
  setIsValid(false);
  setError(e.message);
  toast.error(`invalid json: ${e.message}`);
  return null;
  }
  };

  const loadSample = () => {
  setJson('{\n "meta": {\n  "name": "journal system",\n  "icon": "BookOpen"\n },\n "databases": [\n  {\n "key": "entries",\n "properties": [\n  { "name": "content", "type": "text" },\n  { "name": "mood", "type": "select", "options": ["happy", "neutral", "sad"] }\n ]\n  }\n ],\n "layout": {\n  "widgets": [\n { "view_type": "journal", "source": "entries", "title": "daily reflections" }\n  ]\n }\n}');
  setIsValid(null);
  setError(null);
  };

  const buildWorkspace = async () => {
  const config = validateJson();
  if (!config) return;

  setIsBuilding(true);
  const t = toast.loading('initializing workspace engine...');

  try {
  // 1. create databases
  toast.loading('creating databases and fields...', { id: t });
  for (const db of config.databases) {
 const collectionName = `db_${db.key.toLowerCase().replace(/\s+/g, '_')}`;

 // check if exists
 let collection;
 try {
 const res = await api.getCollection(collectionName);
 collection = res.data || res;
 } catch (e) { }

 if (!collection) {
 await api.createCollection({
 name: collectionName,
 title: db.key,
 });
 }

 // create fields
 for (const prop of db.properties) {
 try {
 await api.createField(collectionName, {
   name: prop.name,
   type: prop.type,
   title: prop.name,
   // handle select options if present
   ...(prop.type === 'select' && {
   dataSource: prop.options?.map((o: string) => ({ label: o, value: o, color: 'default' }))
   })
 });
 } catch (e) {
 // ignore if exists
 }
 }
  }

  // 2. setup layout
  toast.loading('configuring workspace layout...', { id: t });
  const workspaceId = `workspace_${config.meta.name.toLowerCase().replace(/\s+/g, '_')}`;
  const widgets = config.layout.widgets.map((w: any, index: number) => ({
 id: crypto.randomUUID(),
 type: 'view',
 title: w.title || w.source,
 collectionName: `db_${w.source.toLowerCase().replace(/\s+/g, '_')}`,
 viewType: w.view_type,
 x: (index % 2) * 600,
 y: Math.floor(index / 2) * 400,
 w: 600,
 h: 400,
 zIndex: 10
  }));

  // store layout in pkm_settings
  await client.request('pkm_settings', 'create', {
 method: 'POST',
 data: {
 key: `layout_${workspaceId}`,
 value: widgets
 }
  });

  // 3. update sidebar
  toast.loading('registering sidebar entry...', { id: t });
  const newNavItem: NavItem = {
 id: workspaceId,
 type: 'collection',
 name: config.meta.name,
 icon: config.meta.icon || 'Layout',
 iconType: 'lucide'
  };

  setSidebarItems([...sidebarItems, newNavItem]);

  toast.success('workspace built successfully', { id: t });
  } catch (e: any) {
  console.error(e);
  toast.error(`engine failure: ${e.message}`, { id: t });
  } finally {
  setIsBuilding(false);
  }
  };

  // create a document from the json template
  const createDocument = async () => {
    const config = validateJson();
    if (!config) return;

    const t = toast.loading('creating document...');
    try {
      // find or create a 'documents' collection
      const collectionName = 'documents';
      let collection;
      try {
        const res = await api.getCollection(collectionName);
        collection = res.data || res;
      } catch (e) {
        // create collection if doesn't exist
        try {
          await api.createCollection({
            name: collectionName,
            title: 'Documents',
          });
          // add basic fields
          await api.createField(collectionName, { name: 'title', type: 'string', title: 'Title' });
          await api.createField(collectionName, { name: 'content', type: 'text', title: 'Content' });
          await api.createField(collectionName, { name: 'layout', type: 'json', title: 'Layout' });
          // support slug so documents can be referenced by url if desired
          try { await api.createField(collectionName, { name: 'slug', type: 'string', title: 'Slug', unique: true }); } catch(e) { /* ok if not supported */ }
        } catch (createErr) {
          // ignore field creation errors (may already exist)
        }
      }

      // create the document record
      const slug = (config.meta && (config.meta.slug || config.meta.name)) ? generateSlug(config.meta.slug || config.meta.name) : undefined;
      const docData: any = {
        title: config.meta?.name || 'Untitled Document',
        content: JSON.stringify(config, null, 2),
        layout: config.layout || {},
        template_data: config
      };
      if (slug) docData.slug = slug;

      const result = await client.createRecord(collectionName, docData);
      const docId = result.data?.id || result.data?.data?.id;
      
      toast.success('document created', { id: t });
      
      // navigate to the document
      if (docId) {
        navigate(`/databases/${collectionName}/${docId}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`failed to create document: ${e.message}`, { id: t });
    }
  };

  return (
  <div className="h-full flex flex-col p-6 bg-[#050505] overflow-hidden">
  <header className="mb-8 flex items-center justify-between flex-shrink-0">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
 <Wand2 className="h-6 w-6 text-primary" />
 </div>
 <div>
 <h1 className="text-2xl font-bold lowercase">template ingestion engine</h1>
 <p className="text-muted-foreground text-sm lowercase">json to workspace pipeline</p>
 </div>
 </div>
  </header>

  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
 {/* editor zone */}
 <Card className="flex flex-col border-white/5 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
 <CardHeader className="py-3 px-4 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
 <CardTitle className="text-sm font-medium flex items-center gap-2">
   editor.json
 </CardTitle>
 <div className="flex gap-2">
   <Button
     variant="ghost"
     size="sm"
     onClick={loadSample}
     className="h-8 gap-2 text-xs"
   >
     <Info className="h-4 w-4" /> load sample
   </Button>
   <Button
     variant="ghost"
     size="sm"
     onClick={saveTemplate}
     className="h-8 gap-2 text-xs"
   >
     <Database className="h-4 w-4" /> save
   </Button>
   <Button
     variant="ghost"
     size="sm"
     onClick={validateJson}
     className="h-8 gap-2 text-xs"
   >
     <Eye className="h-4 w-4" /> preview
   </Button>
 </div>
 </CardHeader>
 <CardContent className="flex-1 p-0 relative">
  <Editor
    height="100%"
    defaultLanguage="json"
    theme="vs-dark"
    value={json}
    onChange={(v) => { setJson(v || ''); setIsValid(null); setError(null); }}
   options={{
   minimap: { enabled: false },
   fontSize: 14,
   fontFamily: '"Fira Code", monospace',
   backgroundColor: '#00000000',
   padding: { top: 20 },
   scrollBeyondLastLine: false,
   }}
   beforeMount={(monaco) => {
   monaco.editor.defineTheme('pkm-theme', {
   base: 'vs-dark',
   inherit: true,
   rules: [],
   colors: {
  'editor.background': '#00000000',
   }
   });
   }}
 />
 </CardContent>
 </Card>

 {/* status & preview zone */}
 <div className="flex flex-col gap-6 overflow-auto pr-2 no-scrollbar">
 <Card className="border-white/5 bg-white/5 backdrop-blur-xl">
 <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
   <Info className="h-4 w-4 text-primary" />
   <CardTitle className="text-sm font-medium">engine status</CardTitle>
 </CardHeader>
 <CardContent className="px-4 pb-4 space-y-4">
   <div className="flex items-center justify-between text-sm">
   <span className="text-muted-foreground">validation state</span>
   <span className={cn(
   "px-2 py-0.5 rounded-full text-[10px] font-bold ",
   isValid === true ? "bg-green-500/20 text-green-500" :
  isValid === false ? "bg-red-500/20 text-red-500" :
  "bg-white/10 text-white/40"
   )}>
   {isValid === true ? 'ready' : isValid === false ? 'failure' : 'pending'}
   </span>
   </div>

   {error && (
   <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-mono">
   {error}
   </div>
   )}

   <div className="flex flex-col gap-2 pt-4">
     <Button
       className="w-full gap-2 font-bold lowercase"
       onClick={buildWorkspace}
       disabled={!isValid || isBuilding}
     >
       <Play className="h-4 w-4" />
       {isBuilding ? 'building system...' : 'build workspace'}
     </Button>
   </div>
 </CardContent>
 </Card>

 <Card className="border-white/5 bg-white/5 backdrop-blur-xl flex-1 min-h-[300px] flex flex-col">
 <CardHeader className="py-3 px-4 flex-shrink-0">
   <CardTitle className="text-sm font-medium">pipeline preview</CardTitle>
 </CardHeader>
 <CardContent className="px-4 pb-4 flex-1 overflow-y-auto">
   {isValid && (() => {
     let parsed: any = null;
     try { parsed = JSON.parse(json); } catch (e) { return <div className="text-red-400">Error parsing JSON</div>; }

     const columns = parsed?.layout?.columns && Array.isArray(parsed.layout.columns) && parsed.layout.columns.length > 0
       ? parsed.layout.columns
       : [parsed?.layout?.widgets || []];

    // livecolumns is managed at component scope and synced from json

     const colCount = Math.min(Math.max(columns.length || 1, 1), 4);

     const findDB = (key: string) => parsed?.databases?.find((d: any) => d.key === key) || null;
    const findRowsForSource = (source: string) => {
      // prefer previewdata (editable sandbox), then parsed.data, then db fields
      if (previewData && previewData[source]) return previewData[source];
      const db = findDB(source);
      if (!db) return parsed?.data?.[source] || [];
      return db.rows || db.sample || db.records || parsed?.data?.[source] || [];
    }

     const renderTable = (w: any) => {
       const db = findDB(w.source);
       const cols = db?.properties?.map((p: any) => p.name) || ['id','value'];
       const rows = findRowsForSource(w.source);
       const sampleRows = rows.length ? rows : Array.from({length:3}).map((_,ri) => cols.reduce((acc:any,c:any)=>{ acc[c]=`${c} ${ri+1}`; return acc; },{}));
       const tableSource = w.source;
       const updateCell = (rowIndex:number, col:string, value:any) => {
         setPreviewData(d => {
           const copy = {...d};
           copy[tableSource] = copy[tableSource] ? [...copy[tableSource]] : [];
          copy[tableSource][rowIndex] = {...(copy[tableSource][rowIndex]||{}), [col]: value};
          return copy;
        });
      };
      return (
        <div>
          <EditableTitle widget={w} />
          <div className="text-xs text-muted-foreground mb-2">(table)</div>
          <div className="overflow-auto border rounded bg-white/3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  {cols.map((c:any)=> <th key={c} className="px-2 py-1 text-left">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((r:any,ri:number)=> (
                    <tr key={ri} className="odd:bg-white/5">
                      {cols.map((c:any)=> (
                        <td key={c} className="px-2 py-1">
                          <input
                            className="w-full bg-transparent outline-none text-sm"
                            value={String(r[c] ?? '')}
                            onChange={(e)=> updateCell(ri, c, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      );
     };

     const renderKanban = (w: any) => {
       const db = findDB(w.source);
       const statusField = db?.properties?.find((p:any)=>p.type==='select') || { name: 'status', options: ['todo','doing','done'] };
       const lanes = statusField.options || ['todo','doing','done'];
       const rows = findRowsForSource(w.source);
       const kanbanSource = w.source;
       const toggleCardStatus = (rowIndex:number) => {
         setPreviewData(d => {
           const copy = {...d};
           const list = copy[kanbanSource] ? [...copy[kanbanSource]] : [];
           const row = {...(list[rowIndex]||{})};
           const cur = row[statusField.name] || lanes[0];
           const next = lanes[(lanes.indexOf(cur) + 1) % lanes.length] || lanes[0];
           row[statusField.name] = next;
           list[rowIndex] = row;
           copy[kanbanSource] = list;
           return copy;
         });
       };
       const updateCardTitle = (rowIndex:number, newTitle:string) => {
         setPreviewData(d => {
           const copy = {...d};
           const list = copy[kanbanSource] ? [...copy[kanbanSource]] : [];
           list[rowIndex] = {...(list[rowIndex]||{}), title: newTitle};
           copy[kanbanSource] = list;
           return copy;
         });
       };
       return (
         <div>
           <EditableTitle widget={w} />
           <div className="text-xs text-muted-foreground mb-2">(kanban)</div>
           <div className="flex gap-2">
             {lanes.map((lane:string)=> (
               <div key={lane} className="flex-1 p-2 bg-white/3 rounded min-w-[80px]">
                 <div className="text-xs font-bold mb-2">{lane}</div>
                 <div className="space-y-2">
                   {rows.length ? rows.filter((r:any)=> r[statusField.name || 'status'] === lane).slice(0,6).map((r:any, i:number, arr:any[])=> {
                       const rowIndex = rows.findIndex((row:any) => row === r);
                       return (
                         <div key={i} className="p-2 bg-white/5 rounded group">
                           <input
                             className="w-full bg-transparent text-sm outline-none"
                             value={r.title || r.name || ''}
                             onChange={(e) => updateCardTitle(rowIndex, e.target.value)}
                           />
                           <div className="flex justify-between mt-1">
                             <button 
                               className="text-[10px] text-muted-foreground hover:text-primary"
                               onClick={() => toggleCardStatus(rowIndex)}
                             >
                               → move
                             </button>
                           </div>
                         </div>
                       );
                     }) : (
                       <div className="text-xs text-muted-foreground text-center py-2">No items</div>
                     )}
                 </div>
               </div>
             ))}
           </div>
         </div>
       );
     };

     const renderGallery = (w:any) => {
       const rows = findRowsForSource(w.source);
       const gallerySource = w.source;
       const editTitle = (index:number, val:string) => setPreviewData(d => { const c = {...d}; c[gallerySource] = c[gallerySource] ? [...c[gallerySource]] : []; c[gallerySource][index] = {...(c[gallerySource][index]||{}), title: val}; return c; });
       const editImage = (index:number, val:string) => setPreviewData(d => { const c = {...d}; c[gallerySource] = c[gallerySource] ? [...c[gallerySource]] : []; c[gallerySource][index] = {...(c[gallerySource][index]||{}), image: val}; return c; });
       return (
         <div>
           <EditableTitle widget={w} />
           <div className="text-xs text-muted-foreground mb-2">(gallery)</div>
           <div className="grid grid-cols-2 gap-2">
             {rows.length ? rows.slice(0,8).map((r:any, i:number)=> (
               <div key={i} className="bg-white/5 rounded p-2 flex flex-col">
                 <div className="h-16 bg-white/10 rounded mb-2 flex items-center justify-center overflow-hidden">
                   {r.image || r.images?.[0] ? (
                     <img src={r.image||r.images?.[0]} alt="" className="max-h-full max-w-full object-cover" />
                   ) : (
                     <div className="text-xs text-muted-foreground">no image</div>
                   )}
                 </div>
                 <input 
                   className="text-xs bg-transparent outline-none w-full mb-1" 
                   value={r.image || ''} 
                   placeholder="Image URL..."
                   onChange={(e)=>editImage(i,e.target.value)} 
                 />
                 <input 
                   className="text-sm bg-transparent outline-none w-full font-medium" 
                   value={r.title||r.name||''} 
                   placeholder="Title..."
                   onChange={(e)=>editTitle(i,e.target.value)} 
                 />
               </div>
             )) : (
               <div className="col-span-2 text-xs text-muted-foreground text-center py-4">No items in {w.source}</div>
             )}
           </div>
         </div>
       );
     };

     const renderChart = (w:any) => {
       const type = (w.chart?.type || w.chartType || 'bar').toLowerCase();
       const rows = findRowsForSource(w.source);
       const xKey = w.chart?.x || w.x || 'timestamp';
       const yKey = w.chart?.y || w.y || 'value';
       const seriesKey = w.chart?.series || w.chart?.groupBy || w.chart?.group || null;
       // build data: if serieskey present, create aggregated series per x
       let data: any[] = [];
       if (rows.length && seriesKey) {
         const map: Record<string, any> = {};
         for (const r of rows) {
           const x = r[xKey] ?? r.timestamp ?? '';
           const series = r[seriesKey] ?? 'default';
           const y = Number(r[yKey] ?? 0);
           if (!map[x]) map[x] = { x };
           map[x][series] = (map[x][series] || 0) + y;
         }
         data = Object.values(map);
       } else if (rows.length) {
         data = rows.map((r:any)=> ({ x: r[xKey] ?? r.timestamp ?? '', y: Number(r[yKey] ?? 0), ...r }));
       } else {
         data = w.sampleData || [{x:'a',y:10},{x:'b',y:20},{x:'c',y:15}];
       }

       // pie chart: use aggregated values or field
       if (type === 'pie') {
         const pieData = rows.length ? rows.map((r:any)=> ({ name: r.title||r.name||r.id, value: Number(r[yKey]||1) })) : [{name:'a',value:40},{name:'b',value:60}];
         const COLORS = ['#f6b012','#ff7b7b','#7bd389','#6fb3ff','#d7a9ff'];
         return (
           <div>
             <EditableTitle widget={w} />
             <div className="text-xs text-muted-foreground mb-2">(pie)</div>
             <div className="h-40 flex items-center justify-center">
               <ResponsiveContainer width="100%" height={160}>
                 <PieChart>
                   <Pie dataKey="value" data={pieData} cx="50%" cy="50%" outerRadius={60} label>
                     {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                   </Pie>
                   <Legend />
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>
         );
       }

       // multi-series bar/area/line
       return (
         <div>
          <div className="flex items-center justify-between mb-2">
            <EditableTitle widget={w} />
            <div className="flex items-center gap-2">
              <input type="color" value={w.chart?.color || '#f6b012'} onChange={(e)=> updateWidgetConfig(w, { chart: {...(w.chart||{}), color: e.target.value} })} />
              <label className="text-xs"><input type="checkbox" checked={Boolean(w.chart?.stack)} onChange={(e)=> updateWidgetConfig(w, { chart: {...(w.chart||{}), stack: e.target.checked} })} /> stack</label>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-2">(chart: {type})</div>
           <div className="h-40" style={{minHeight:160}}>
             <ResponsiveContainer width="100%" height="100%">
               {type === 'area' ? (
                 <AreaChart data={data}>
                   <XAxis dataKey="x" />
                   <YAxis />
                   <Tooltip />
                  {seriesKey ? Object.keys(data[0] || {}).filter(k=>k!=='x').map((s,i)=>{
                    const colors = w.chart?.colors || ['#f6b012','#7bd389','#6fb3ff','#d7a9ff'];
                    return (<Area key={s} type="monotone" dataKey={s} stroke={colors[i%colors.length]} fillOpacity={0.3} fill={colors[i%colors.length]} />)
                  }) : <Area type="monotone" dataKey="y" stroke={w.chart?.color||'#f6b012'} fill={w.chart?.color||'#f6b012'} />}
                 </AreaChart>
               ) : type === 'line' ? (
                 <LineChart data={data}>
                   <XAxis dataKey="x" />
                   <YAxis />
                   <Tooltip />
                  {seriesKey ? Object.keys(data[0] || {}).filter(k=>k!=='x').map((s,i)=>{
                    const colors = w.chart?.colors || ['#f6b012','#7bd389','#6fb3ff','#d7a9ff'];
                    return (<Line key={s} type="monotone" dataKey={s} stroke={colors[i%colors.length]} />)
                  }) : <Line type="monotone" dataKey="y" stroke={w.chart?.color||'#f6b012'} strokeWidth={2} />}
                 </LineChart>
               ) : (
                 <BarChart data={data}>
                   <XAxis dataKey="x" />
                   <YAxis />
                   <Tooltip />
                  {seriesKey ? Object.keys(data[0] || {}).filter(k=>k!=='x').map((s,i)=>{
                    const colors = w.chart?.colors || ['#f6b012','#7bd389','#6fb3ff','#d7a9ff'];
                    return (<Bar key={s} dataKey={s} stackId={w.chart?.stack ? 'a' : undefined} fill={colors[i%colors.length]} />)
                  }) : <Bar dataKey="y" fill={w.chart?.color||'#f6b012'} />}
                 </BarChart>
               )}
             </ResponsiveContainer>
           </div>
         </div>
       );
     };

     const renderForm = (w:any) => {
       const db = findDB(w.source);
       const formId = `form_${w.source}_${w.title}`.replace(/\s+/g,'_');
       const values = previewState[formId] || {};
       const setVal = (k:any,v:any) => setPreviewState(s => ({...s, [formId]: {...s[formId], [k]: v}}));
       return (
         <div>
           <EditableTitle widget={w} />
           <div className="text-xs text-muted-foreground mb-2">(form)</div>
           <div className="space-y-2">
             {(db?.properties||[]).slice(0,6).map((p:any)=> (
               <div key={p.name} className="flex flex-col">
                 <label className="text-xs text-muted-foreground">{p.name}</label>
                 {p.type==='select' || p.type==='multi_select' ? (
                   <select value={values[p.name]||''} onChange={(e)=>setVal(p.name,e.target.value)} className="p-1 bg-white/5 rounded">
                     <option value="">select</option>
                     {(p.options||[]).map((o:any)=> <option key={o} value={o}>{o}</option>)}
                   </select>
                 ) : p.type==='number' ? (
                   <input type="number" value={values[p.name]||''} onChange={(e)=>setVal(p.name,e.target.value)} className="p-1 bg-white/5 rounded" />
                 ) : p.type==='datetime' ? (
                   <input type="datetime-local" value={values[p.name]||''} onChange={(e)=>setVal(p.name,e.target.value)} className="p-1 bg-white/5 rounded" />
                 ) : (
                   <input value={values[p.name]||''} onChange={(e)=>setVal(p.name,e.target.value)} className="p-1 bg-white/5 rounded" />
                 )}
               </div>
             ))}
            <div className="pt-2">
              <Button className="text-sm" onClick={() => {
                // submit form into previewdata
                const vals = previewState[formId] || {};
                setPreviewData(d => {
                  const copy = {...d};
                  copy[w.source] = copy[w.source] ? [...copy[w.source]] : [];
                  copy[w.source].unshift(vals);
                  return copy;
                });
                setPreviewState(s => ({...s, [formId]: {}}));
                toast.success('added sample row');
              }}>Add sample</Button>
            </div>
           </div>
         </div>
       );
     };

    

    const renderCalendar = (w:any) => {
      const rows = findRowsForSource(w.source);
      const dateField = w.date_field || w.dateField || 'date' ;
      const calId = `calendar_${w.source}_${w.title}`.replace(/\s+/g,'_');
      const calState = previewState[calId] || {};
      const year = calState.year ?? new Date().getFullYear();
      const month = typeof calState.month === 'number' ? calState.month : new Date().getMonth();

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month+1, 0).getDate();
      const cells: any[] = [];
      for (let i=0;i<firstDay;i++) cells.push(null);
      for (let d=1; d<=daysInMonth; d++) cells.push(d);

      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      const setMonth = (y:number,m:number) => setPreviewState(s => ({...s, [calId]: {...s[calId], year: y, month: m}}));

      const prev = () => {
        let y = year; let m = month - 1;
        if (m < 0) { m = 11; y -= 1; }
        setMonth(y,m);
      };

      const next = () => {
        let y = year; let m = month + 1;
        if (m > 11) { m = 0; y += 1; }
        setMonth(y,m);
      };

      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <EditableTitle widget={w} />
            <div className="flex items-center gap-2 text-sm">
              <button className="px-2 py-1 bg-white/5 rounded" onClick={prev} aria-label="Previous month">◀</button>
              <div className="px-2">{monthNames[month]} {year}</div>
              <button className="px-2 py-1 bg-white/5 rounded" onClick={next} aria-label="Next month">▶</button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-2">(calendar)</div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> <div key={d} className="text-muted-foreground">{d}</div>)}
            {cells.map((c,ci)=> (
              <div key={ci} className="h-20 p-1 bg-white/5 rounded">
                {c && <div className="font-bold">{c}</div>}
                {c && rows.filter((r:any)=> {
                  const raw = r[dateField] || r.date || r.due_date || r.timestamp || null;
                  if (!raw) return false;
                  const v = new Date(raw);
                  return v.getFullYear()===year && v.getMonth()===month && v.getDate()===c;
                }).slice(0,3).map((ev:any,ei:number)=> (
                  <div key={ei} className="text-[11px] mt-1 bg-white/10 p-1 rounded cursor-pointer" onClick={(e) => { if ((e as any).defaultPrevented) return; onEditEvent(ev); }}>{ev.title || ev.name}</div>
                ))}
            {c && <div className="text-[11px] mt-1 text-muted-foreground cursor-pointer" onClick={(e) => { if ((e as any).defaultPrevented) return; const t = window.prompt('Add event title'); if (!t) return; const iso = new Date(year, month, c).toISOString(); setPreviewData(d => { const copy = {...d}; copy[w.source] = copy[w.source] ? [...copy[w.source]] : []; copy[w.source].push({ title: t, [dateField]: iso }); return copy; }); }}>+ add</div>}
              </div>
            ))}
          </div>
        </div>
      );
    };

     const renderMap = (w:any) => {
       const rows = findRowsForSource(w.source);
       const latField = w.latField || w.lat_field || 'lat';
       const lngField = w.lngField || w.lng_field || 'lng';
       const markers = rows.filter((r:any)=> r[latField] && r[lngField]);
       return (
         <div>
           <EditableTitle widget={w} />
           <div className="text-xs text-muted-foreground mb-2">(map)</div>
           <div className="h-48 rounded overflow-hidden">
             <MapContainer center={markers.length ? [markers[0][latField], markers[0][lngField]] : [0,0]} zoom={markers.length?5:2} style={{height:'100%', width:'100%'}}>
               <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
               {markers.map((m:any,mi:number)=> (
                 <Marker key={mi} position={[m[latField], m[lngField]]}>
                   <Popup>{m.title || m.name || JSON.stringify(m)}</Popup>
                 </Marker>
               ))}
             </MapContainer>
           </div>
         </div>
       );
     };

     // helper component for editable widget titles
     const EditableTitle = ({ widget, path = 'title' }: { widget: any; path?: string }) => {
       const [editing, setEditing] = useState(false);
       const [value, setValue] = useState(widget[path] || '');
       
       useEffect(() => { setValue(widget[path] || ''); }, [widget[path]]);
       
       if (editing) {
         return (
           <input
             autoFocus
             className="font-bold bg-transparent border-b border-primary outline-none w-full"
             value={value}
             onChange={(e) => setValue(e.target.value)}
             onBlur={() => {
               setEditing(false);
               if (value !== widget[path]) {
                 updateWidgetConfig(widget, { [path]: value });
               }
             }}
             onKeyDown={(e) => {
               if (e.key === 'Enter') {
                 setEditing(false);
                 if (value !== widget[path]) {
                   updateWidgetConfig(widget, { [path]: value });
                 }
               }
               if (e.key === 'Escape') {
                 setEditing(false);
                 setValue(widget[path] || '');
               }
             }}
           />
         );
       }
       return (
         <div 
           className="font-bold cursor-text hover:text-primary transition-colors"
           onClick={() => setEditing(true)}
           title="Click to edit"
         >
           {widget[path] || 'Untitled'}
         </div>
       );
     };

     const renderWidget = (w:any, idx:number) => {
       switch ((w.view_type||'').toLowerCase()) {
         case 'table': return renderTable(w);
         case 'kanban': return renderKanban(w);
         case 'gallery': return renderGallery(w);
         case 'chart': return renderChart(w);
         case 'form': return renderForm(w);
         case 'richtext': return (
           <div>
             <EditableTitle widget={w} />
             <div 
               className="prose text-sm mt-2 p-2 bg-white/5 rounded min-h-[60px] cursor-text hover:bg-white/[0.07]"
               contentEditable
               suppressContentEditableWarning
               onBlur={(e) => {
                 const newContent = e.currentTarget.innerText;
                 if (newContent !== w.content) {
                   updateWidgetConfig(w, { content: newContent });
                 }
               }}
             >
               {w.content || '**Rich text / markdown** example'}
             </div>
           </div>
         );
         case 'iframe': return (
           <div>
             <EditableTitle widget={w} />
             <input 
               className="w-full mt-2 p-2 bg-white/5 rounded text-xs"
               value={w.src || ''}
               placeholder="Enter URL..."
               onChange={(e) => updateWidgetConfig(w, { src: e.target.value })}
             />
             <div className="h-32 bg-white/5 rounded flex items-center justify-center mt-2">
               {w.src ? (
                 <span className="text-xs text-muted-foreground">Embedded: {w.src}</span>
               ) : (
                 <span className="text-xs text-muted-foreground">Enter a URL above</span>
               )}
             </div>
           </div>
         );
         case 'custom': return (
           <div>
             <EditableTitle widget={w} />
             <div className="mt-2 space-y-2">
               {(w.components||[]).map((c:any,ci:number)=> (
                 <div key={ci} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                   <select 
                     className="bg-transparent text-xs"
                     value={c.type}
                     onChange={(e) => {
                       const newComps = [...(w.components||[])];
                       newComps[ci] = { ...c, type: e.target.value };
                       updateWidgetConfig(w, { components: newComps });
                     }}
                   >
                     <option value="button">button</option>
                     <option value="toggle">toggle</option>
                     <option value="slider">slider</option>
                     <option value="input">input</option>
                   </select>
                   <input
                     className="flex-1 bg-transparent text-sm"
                     value={c.label || ''}
                     placeholder="Label..."
                     onChange={(e) => {
                       const newComps = [...(w.components||[])];
                       newComps[ci] = { ...c, label: e.target.value };
                       updateWidgetConfig(w, { components: newComps });
                     }}
                   />
                   <button 
                     className="text-red-400 hover:text-red-300 text-xs"
                     onClick={() => {
                       const newComps = (w.components||[]).filter((_:any,i:number) => i !== ci);
                       updateWidgetConfig(w, { components: newComps });
                     }}
                   >
                     ×
                   </button>
                 </div>
               ))}
               <Button 
                 size="sm" 
                 variant="ghost" 
                 className="w-full text-xs"
                 onClick={() => {
                   const newComps = [...(w.components||[]), { type: 'button', label: 'New Button' }];
                   updateWidgetConfig(w, { components: newComps });
                 }}
               >
                 + Add Component
               </Button>
             </div>
           </div>
         );
         default: return (
           <div>
             <EditableTitle widget={w} />
             <div className="mt-2">
               <label className="text-xs text-muted-foreground">View Type</label>
               <select 
                 className="w-full mt-1 p-1 bg-white/5 rounded text-sm"
                 value={w.view_type || ''}
                 onChange={(e) => updateWidgetConfig(w, { view_type: e.target.value })}
               >
                 <option value="">Select type...</option>
                 <option value="table">Table</option>
                 <option value="kanban">Kanban</option>
                 <option value="gallery">Gallery</option>
                 <option value="chart">Chart</option>
                 <option value="form">Form</option>
                 <option value="richtext">Rich Text</option>
                 <option value="iframe">Embed</option>
                 <option value="custom">Custom</option>
               </select>
             </div>
             <div className="mt-2">
               <label className="text-xs text-muted-foreground">Data Source</label>
               <input
                 className="w-full mt-1 p-1 bg-white/5 rounded text-sm"
                 value={w.source || ''}
                 placeholder="e.g., tasks, metrics..."
                 onChange={(e) => updateWidgetConfig(w, { source: e.target.value })}
               />
             </div>
           </div>
         );
       }
     };

     return (
       <div>
         <div className="flex items-center gap-3 mb-3">
           <div className="p-2 bg-primary/10 rounded-lg"><Layout className="h-4 w-4 text-primary" /></div>
           <span className="font-bold">{parsed.meta?.name}</span>
         </div>

         <div className="mb-4">
           <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
             <Database className="h-3 w-3" /> {parsed.databases?.map((d:any)=> d.key).join(', ')}
           </div>
         </div>

            <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Preview</div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={undoLastChange}>undo</Button>
            <Button size="sm" variant="ghost" onClick={() => persistColumns(liveColumns)}>persist</Button>
            <Button size="sm" variant="ghost" onClick={() => setFullscreenOpen(true)}>
              <Maximize2 className="h-4 w-4 mr-1" /> fullscreen
            </Button>
            <Button size="sm" variant="ghost" onClick={createDocument} disabled={!isValid}>
              <FilePlus className="h-4 w-4 mr-1" /> create doc
            </Button>
          </div>
        </div>
        <PreviewCanvas
          columns={liveColumns}
          columnWidths={previewState.columnWidths}
          onColumnWidthsChange={(w)=> setPreviewState(s=> ({...s, columnWidths: w}))}
          onColumnsChange={(c)=> { setLiveColumns(c); persistColumns(c); }}
          renderWidget={renderWidget}
        />
        
        {/* fullscreen preview dialog */}
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] p-0 bg-background/95 backdrop-blur-xl border-white/10">
            <DialogHeader className="px-6 py-4 border-b border-white/10 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-lg">{(() => {
                  try {
                    const parsed = JSON.parse(json);
                    return parsed.meta?.name || 'Document Preview';
                  } catch { return 'Document Preview'; }
                })()}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Preview how this will appear as a document
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={createDocument} disabled={!isValid}>
                  <FilePlus className="h-4 w-4 mr-1" /> create document
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFullscreenOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-6" style={{height: 'calc(95vh - 80px)'}}>
              <PreviewCanvas
                columns={liveColumns}
                columnWidths={previewState.columnWidths}
                onColumnWidthsChange={(w)=> setPreviewState(s=> ({...s, columnWidths: w}))}
                onColumnsChange={(c)=> { setLiveColumns(c); persistColumns(c); }}
                renderWidget={renderWidget}
              />
            </div>
          </DialogContent>
        </Dialog>
        <EventModal open={eventModalOpen} event={editingEvent} onClose={() => setEventModalOpen(false)} onSave={(ev:any) => {
          if (!ev) return;
          // save into previewdata
          const df = ev.dateField || 'date';
          setPreviewData(d => { const copy = {...d}; copy[ev.source] = copy[ev.source] ? [...copy[ev.source]] : []; // replace matching by id/title+date
            let found=false; copy[ev.source] = copy[ev.source].map((x:any)=> { if ((x.title||x.name) === (editingEvent.title||editingEvent.name) && (x[df]||x.date) === (editingEvent[df]||editingEvent.date)) { found=true; return {...x,...ev}; } return x; });
            if (!found) copy[ev.source].push(ev);
            return copy; });
          setEventModalOpen(false);
        }} onDelete={(ev:any) => {
          if (!ev) return;
          setPreviewData(d => { const copy = {...d}; copy[ev.source] = (copy[ev.source]||[]).filter((x:any)=> !((x.title||x.name) === (ev.title||ev.name) && (x[ev.dateField||'date']||x.date) === (ev[ev.dateField||'date']||ev.date))); return copy; });
          setEventModalOpen(false);
        }} />
       </div>
     );
   })()}
   {!isValid && (
   <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
   <Info className="h-10 w-10 mb-4 opacity-10" />
   <p className="text-sm">paste json to preview pipeline</p>
   </div>
   )}
  </CardContent>
 </Card>
 </div>
  </div>
  </div>
  );
}
