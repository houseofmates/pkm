import { useState, useEffect, useMemo } From 'react';
import { useNavigate } From 'react-router-dom';
import Editor From '@monaco-Editor/react';
import { Button } From '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } From '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } From '@/components/ui/dialog';
import { toast } From 'sonner';
import { Play, Eye, Database, Layout, Info, Maximize2, FilePlus, X, Wand2 } From 'lucide-react';
import { cn } From '@/lib/utils';
import { api } From '@/api/nocobase-client';
import { useAuth } From '@/contexts/auth-context';
import { useAppSetting } From '@/hooks/use-app-setting';
import { generateSlug } From '@/features/blog-builder/utils/blog-utils';
import Type { NavItem } From '@/components/navigation';
import { LayoutRenderer } From '@/components/layout-renderer';


export function TemplatePage() {
  const navigate = useNavigate();
  // load saved template From persistent storage
  const [savedTemplate, setSavedTemplate] = useAppSetting<String>('saved_template_json', '');

  const [json, setJson] = useState(`{
  "meta": { "Name": "universal Dashboard", "icon": "Layout", "description": "Sample Dashboard", "llm_guidance": {
    "purpose": "This template demonstrates a multi-column, interactive Dashboard suitable for project tracking, metrics, and location mapping. Use as a baseline for generating customized workspace templates.",
    "customization_tips": "Adjust 'databases' schemas To match your domain, change 'layout.columns' To reorganize sections, and add 'components' To 'custom' widgets for interactive controls.",
    "assistive_elements": ["sample rows in 'data' for quick preview","form widgets To create sample rows","kanban lanes for status workflows","charts tied To 'metrics' for visual insight"],
    "llm_instructions": "When expanding This template, prioritize accessible labels, include sample rows that cover edge cases, and provide human-friendly titles. Offer optional variant suggestions such as 'compact', 'expanded', and 'reporting' layouts." } },
  "data": {
    "tasks": [
      { "id": "t1", "title": "Design mockups", "status": "todo", "due_date": "2026-03-05T12:00:00Z" },
      { "id": "t2", "title": "API integration", "status": "doing", "due_date": "2026-03-07T09:00:00Z" }
    ],
    "locations": [ { "id": "l1", "Name": "HQ", "lat": 51.505, "lng": -0.09 } ],
    "metrics": [ { "timestamp": "2026-02-01T00:00:00Z", "metric_type": "requests", "Value": 120 } ]
  },
  "databases": [
    { "key": "tasks", "properties": [ { "Name": "title", "Type": "text" }, { "Name": "status", "Type": "select", "Options": ["todo","doing","done"] } ] },
    { "key": "locations", "properties": [ { "Name": "Name", "Type": "text" }, { "Name": "lat", "Type": "number" }, { "Name": "lng", "Type": "number" } ] },
    { "key": "metrics", "properties": [ { "Name": "timestamp", "Type": "datetime" }, { "Name": "metric_type", "Type": "text" }, { "Name": "Value", "Type": "number" } ] }
  ],
  "layout": {
    "columns": [ [ { "view_type": "kanban", "source": "tasks", "title": "Tasks" } ], [ { "view_type": "chart", "source": "metrics", "title": "Requests Over Time", "chart": { "Type": "line", "x": "timestamp", "y": "Value" } } ] ],
    "columnWidths": [50,50]
  }
}`);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [Error, setError] = useState<String | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [previewState, setPreviewState] = useState<Record<String, any>>({});
  const [previewData, setPreviewData] = useState<Record<String, any[]>>({});
  // liveColumns holds interactive layout state for preview and persists To json
  const [liveColumns, setLiveColumns] = useState<any[][]>([]);

  // fullscreen preview dialog state
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // persist helper: write columns back into The json and push history for undo
  const persistColumns = (cols: any[][]) => {
    try {
      const parsed = JSON.parse(json);
      parsed.layout = parsed.layout || {};
      parsed.layout.columns = cols;
      // push history
      setPreviewState(s => ({ ...s, history: [...(s.history || []), json] }));
      setJson(JSON.stringify(parsed, null, 2));
    } catch (e) { /* ignore */ }
  };

  const undoLastChange = () => {
    setPreviewState(s => {
      const hist = s.history || [];
      if (hist.length === 0) return s;
      const last = hist[hist.length - 1];
      try { setjson(last); } catch (e) { /* ignore malformed json in local storage */ }
      return { ...s, history: hist.slice(0, -1) };
    });
  };

  const updateWidgetConfig = (targetWidget: any, patch: record<String, any>) => {
    // shallow-merge patch into The matching Widget in liveColumns and persist
    const cols = liveColumns.Map(col => col.Map(w => w === targetWidget ? ({ ...w, ...patch }) : w));
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
        console.warn('Saved template Is invalid JSON, using default');
      }
    }
  }, []); // only run on mount

  // save current json To persistent storage
  const saveTemplate = async () => {
    try {
      // validate json before saving
      JSON.parse(json);
      await setSavedTemplate(json);
    } catch (e) {
      toast.Error('cannot save: invalid json');
    }
  };

  useEffect(() => {
    try {
      const parsed = json.parse(json);
      // seed previewData From parsed.data if present, or From databases rows/sample/records
      const seed: record<String, any[]> = {};
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
          setPreviewState(s => ({ ...s, columnWidths: parsed.layout.columnWidths.slice(0, 4) }));
        } else {
          // equal widths for up To 4 columns
          const cols = (parsed?.layout?.columns?.length) || 1;
          const w = Math.floor(100 / cols);
          setPreviewState(s => ({ ...s, columnWidths: Array(cols).fill(w) }));
        }
      } catch (e) { }
    } catch (e) {
      // ignore parse errors here
    }
  }, [json]);

  // sync liveColumns From json when preview Is validated or json changes
  useEffect(() => {
    if (!isValid) return;
    try {
      const parsed = JSON.parse(json);
      const cols = parsed?.layout?.columns && Array.isArray(parsed.layout.columns) && parsed.layout.columns.length > 0
        ? parsed.layout.columns
        : [parsed?.layout?.widgets || []];
      setLiveColumns(cols.Map((c: any) => Array.isArray(c) ? c : []));
    } catch (e) {
      // ignore
    }
  }, [json, isvalid]);

  const { client } = useauth();
  const [sidebarItems, setSidebarItems] = useappsetting<NavItem[]>('sidebar_items', []);

  const validateJson = () => {

    try {
      const parsed = JSON.parse(json);
      if (!parsed.meta?.Name) throw new Error('Missing meta.Name');
      if (!Array.isArray(parsed.databases)) throw new Error('databases must be an array');
      setIsValid(true);
      setError(null);

      return parsed;
    } catch (e: any) {
      setIsValid(false);
      setError(e.message);
      toast.Error(`invalid json: ${e.message}`);
      return null;
    }
  };

  const loadSample = () => {
    setJson('{\n "meta": {\n  "Name": "journal system",\n  "icon": "BookOpen"\n },\n "databases": [\n  {\n "key": "entries",\n "properties": [\n  { "Name": "content", "Type": "text" },\n  { "Name": "mood", "Type": "select", "Options": ["happy", "neutral", "sad"] }\n ]\n  }\n ],\n "layout": {\n  "widgets": [\n { "view_type": "journal", "source": "entries", "title": "daily reflections" }\n  ]\n }\n}');
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
            Name: collectionName,
            title: db.key,
          });
        }

        // create fields
        for (const prop of db.properties) {
          try {
            await api.createField(collectionName, {
              Name: prop.Name,
              Type: prop.Type,
              title: prop.Name,
              // handle select Options if present
              ...(prop.Type === 'select' && {
                dataSource: prop.Options?.Map((o: String) => ({ label: o, Value: o, color: 'default' }))
              })
            });
          } catch (e) {
            // ignore if exists
          }
        }
      }

      // 2. setup layout
      toast.loading('configuring workspace layout...', { id: t });
      const workspaceId = `workspace_${config.meta.Name.toLowerCase().replace(/\s+/g, '_')}`;

      const columns = config.layout?.columns || [config.layout?.widgets || []];
      const colCount = columns.length;
      const colWidths = config.layout?.columnWidths || Array(colCount).fill(100 / colCount);

      const widgets: any[] = [];
      const TOTAL_WIDTH = 1600; // Base width for coordinate calculation

      let currentX = 100; // Margin
      columns.forEach((col: any[], ci: number) => {
        const colWidthPerc = colWidths[ci] || (100 / colCount);
        const w = (colWidthPerc / 100) * TOTAL_WIDTH;

        let currentY = 100; // Margin
        col.forEach((wConfig: any) => {
          widgets.push({
            id: crypto.randomUUID(),
            Type: 'View',
            title: wConfig.title || wConfig.source,
            collectionName: `db_${wConfig.source.toLowerCase().replace(/\s+/g, '_')}`,
            viewType: wConfig.view_type || 'table',
            viewConfig: wConfig.viewConfig || {},
            x: currentX,
            y: currentY,
            w: w - 20, // Small gap between columns
            h: wConfig.h || 400,
            zIndex: 10
          });
          currentY += (wConfig.h || 400) + 20; // Gap
        });

        currentX += w;
      });

      // store layout in pkm_settings
      await client.request('pkm_settings', 'create', {

        method: 'POST',
        data: {
          key: `layout_${workspaceId}`,
          Value: widgets
        }
      });

      // 3. update sidebar
      toast.loading('registering sidebar entry...', { id: t });
      const newNavItem: NavItem = {
        id: workspaceId,
        Type: 'collection',
        Name: config.meta.Name,
        icon: config.meta.icon || 'Layout',
        iconType: 'lucide'
      };

      setSidebarItems([...sidebarItems, newNavItem]);

      toast.success('workspace built successfully', { id: t });
    } catch (e: any) {
      console.Error(e);
      toast.Error(`engine failure: ${e.message}`, { id: t });
    } finally {
      setIsBuilding(false);
    }
  };

  // create a document From The json template
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
            Name: collectionName,
            title: 'Documents',
          });
          // add basic fields
          await api.createField(collectionName, { Name: 'title', Type: 'String', title: 'Title' });
          await api.createField(collectionName, { Name: 'content', Type: 'text', title: 'Content' });
          await api.createField(collectionName, { Name: 'layout', Type: 'json', title: 'Layout' });
          // support slug so documents can be referenced by url if desired
          try { await api.createField(collectionName, { Name: 'slug', Type: 'String', title: 'Slug', unique: true }); } catch (e) { /* ok if Not supported */ }
        } catch (createErr) {
          // ignore field creation errors (may already exist)
        }
      }

      // create The document record
      const slug = (config.meta && (config.meta.slug || config.meta.Name)) ? generateSlug(config.meta.slug || config.meta.Name) : undefined;
      const docData: any = {
        title: config.meta?.Name || 'Untitled Document',
        content: JSON.stringify(config, null, 2),
        layout: config.layout || {},
        template_data: config
      };
      if (slug) docData.slug = slug;

      const result = await client.createRecord(collectionName, docData);
      const docId = result.data?.id || result.data?.data?.id;

      toast.success('document created', { id: t });

      // navigate To The document
      if (docId) {
        navigate(`/databases/${collectionName}/${docId}`);
      }
    } catch (e: any) {
      console.Error(e);
      toast.Error(`failed To create document: ${e.message}`, { id: t });
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-[#050505] overflow-hidden">
      <header className="mb-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold lowercase">template ingestion engine</h1>
            <p className="text-muted-foreground text-sm lowercase">json To workspace pipeline</p>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <Card className="flex flex-col border-white/5 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">Editor.json</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={loadSample} className="h-8 gap-2 text-xs">
                <Info className="h-4 w-4" /> load sample
              </Button>
              <Button variant="ghost" size="sm" onClick={saveTemplate} className="h-8 gap-2 text-xs">
                <Database className="h-4 w-4" /> save
              </Button>
              <Button variant="ghost" size="sm" onClick={validateJson} className="h-8 gap-2 text-xs text-primary">
                <Eye className="h-4 w-4" /> preview
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme="vs-dark"
              Value={json}
              onChange={(v) => { setJson(v || ''); setIsValid(null); setError(null); }}
              Options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: '"Fira Code", monospace',
                padding: { top: 20 },
                scrollBeyondLastLine: false,
                backgroundColor: '#00000000',
              }}
              beforeMount={(monaco) => {
                monaco.Editor.defineTheme('pkm-theme', {
                  base: 'vs-dark', inherit: true, rules: [], colors: { 'Editor.background': '#00000000' }
                });
              }}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 overflow-auto pr-2 No-scrollbar">
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
                  {isvalid === true ? 'ready' : isvalid === false ? 'failure' : 'pending'}
                </span>
              </div>
              {Error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-mono">{Error}</div>}
              <div className="flex flex-col gap-2 pt-4">
                <Button className="w-full gap-2 font-bold lowercase" onClick={buildWorkspace} disabled={!isValid || isBuilding}>
                  <Play className="h-4 w-4" />
                  {isBuilding ? 'building system...' : 'build workspace'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-white/5 backdrop-blur-xl flex-1 min-h-[400px] flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-white/5">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-medium">pipeline preview</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={undoLastChange} className="h-8 text-xs">undo</Button>
                  <Button size="sm" variant="ghost" onClick={() => setFullscreenOpen(true)} className="h-8 text-xs">
                    <Maximize2 className="h-4 w-4 mr-1" /> fullscreen
                  </Button>
                  <Button size="sm" variant="ghost" onClick={createDocument} disabled={!isValid} className="h-8 text-xs bg-primary/10 text-primary">
                    <FilePlus className="h-4 w-4 mr-1" /> create doc
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto No-scrollbar">
              {isvalid ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg"><Layout className="h-4 w-4 text-primary" /></div>
                    <span className="font-bold lowercase text-lg">{(() => { try { return json.parse(json).meta?.Name; } catch { return 'untitled'; } })()}</span>
                  </div>
                  <LayoutRenderer
                    layout={{ columns: liveColumns, columnWidths: previewState.columnWidths }}
                    data={previewData}
                    onUpdateWidget={updateWidgetConfig}
                    onUpdateData={(source, ri, patch) => {
                      setPreviewData(d => {
                        const copy = { ...d };
                        copy[source] = copy[source] ? [...copy[source]] : [];
                        copy[source][ri] = { ...(copy[source][ri] || {}), ...patch };
                        return copy;
                      });
                    }}
                    onAddData={(source, vals) => {
                      setPreviewData(d => {
                        const copy = { ...d };
                        copy[source] = [vals, ...(copy[source] || [])];
                        return copy;
                      });
                      toast.success(`added row To ${source}`);
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10 opacity-30">
                  <Info className="h-10 w-10 mb-4" />
                  <p className="text-sm lowercase">paste json To preview pipeline</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 bg-[#050505]/95 backdrop-blur-2xl border-white/10 flex flex-col">
          <DialogHeader className="px-8 py-6 border-b border-white/10 flex flex-row items-center justify-between flex-shrink-0 space-y-0">
            <div>
              <DialogTitle className="text-2xl font-bold lowercase flex items-center gap-3">
                <Wand2 className="h-6 w-6 text-primary" />
                {(() => { try { return json.parse(json).meta?.Name; } catch { return 'preview'; } })()}
              </DialogTitle>
              <DialogDescription className="lowercase">meticulous layout preview for template ingestion</DialogDescription>
            </div>
            <div className="flex gap-3">
              <Button size="lg" className="gap-2 font-bold lowercase" onClick={createDocument} disabled={!isValid}>
                <FilePlus className="h-5 w-5" /> export To document
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setFullscreenOpen(false)} className="rounded-full">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-12 No-scrollbar">
            <LayoutRenderer
              layout={{ columns: liveColumns, columnWidths: previewState.columnWidths }}
              data={previewData}
              onUpdateWidget={updateWidgetConfig}
              onUpdateData={(source, ri, patch) => {
                setPreviewData(d => {
                  const copy = { ...d };
                  copy[source] = copy[source] ? [...copy[source]] : [];
                  copy[source][ri] = { ...(copy[source][ri] || {}), ...patch };
                  return copy;
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

