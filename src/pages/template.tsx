import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Play, ShieldCheck, Database, Layout, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api/nocobase-client';
import { useAuth } from '@/contexts/auth-context';
import { useAppSetting } from '@/hooks/use-app-setting';
import { type NavItem } from '@/components/navigation';

export function TemplatePage() {
  const [json, setJson] = useState('{\n "meta": {\n  "name": "project alpha",\n  "icon": "Rocket"\n },\n "databases": [\n  {\n "key": "tasks",\n "properties": [\n  { "name": "title", "type": "string" },\n  { "name": "status", "type": "select", "options": ["todo", "doing", "done"] }\n ]\n  }\n ],\n "layout": {\n  "widgets": [\n { "view_type": "kanban", "source": "tasks", "title": "backlog" }\n  ]\n }\n}');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const { client } = useAuth();
  const [sidebarItems, setSidebarItems] = useAppSetting<NavItem[]>('sidebar_items', []);

  const validateJson = () => {
  try {
  const parsed = JSON.parse(json);
  if (!parsed.meta?.name) throw new Error('Missing meta.name');
  if (!Array.isArray(parsed.databases)) throw new Error('databases must be an array');
  setIsValid(true);
  setError(null);
  toast.success('JSON is valid!');
  return parsed;
  } catch (e: any) {
  setIsValid(false);
  setError(e.message);
  toast.error(`Invalid JSON: ${e.message}`);
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
  const t = toast.loading('Initializing workspace engine...');

  try {
  // 1. Create Databases
  toast.loading('Creating databases and fields...', { id: t });
  for (const db of config.databases) {
 const collectionName = `db_${db.key.toLowerCase().replace(/\s+/g, '_')}`;

 // Check if exists
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

 // Create Fields
 for (const prop of db.properties) {
 try {
 await api.createField(collectionName, {
   name: prop.name,
   type: prop.type,
   title: prop.name,
   // Handle select options if present
   ...(prop.type === 'select' && {
   dataSource: prop.options?.map((o: string) => ({ label: o, value: o, color: 'default' }))
   })
 });
 } catch (e) {
 // Ignore if exists
 }
 }
  }

  // 2. Setup Layout
  toast.loading('Configuring workspace layout...', { id: t });
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

  // Store layout in pkm_settings
  await client.request('pkm_settings', 'create', {
 method: 'POST',
 data: {
 key: `layout_${workspaceId}`,
 value: widgets
 }
  });

  // 3. Update Sidebar
  toast.loading('Registering sidebar entry...', { id: t });
  const newNavItem: NavItem = {
 id: workspaceId,
 type: 'collection',
 name: config.meta.name,
 icon: config.meta.icon || 'Layout',
 iconType: 'lucide'
  };

  setSidebarItems([...sidebarItems, newNavItem]);

  toast.success('Workspace built successfully!', { id: t });
  } catch (e: any) {
  console.error(e);
  toast.error(`Engine failure: ${e.message}`, { id: t });
  } finally {
  setIsBuilding(false);
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
 {/* Editor Zone */}
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
   onClick={validateJson}
   className="h-8 gap-2 text-xs"
   >
   <ShieldCheck className="h-4 w-4" /> validate
   </Button>
 </div>
 </CardHeader>
 <CardContent className="flex-1 p-0 relative">
 <Editor
   height="100%"
   defaultLanguage="json"
   theme="vs-dark"
   value={json}
   onChange={(v) => setJson(v || '')}
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

 {/* Status & Preview Zone */}
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

 <Card className="border-white/5 bg-white/5 backdrop-blur-xl flex-1 min-h-[300px]">
 <CardHeader className="py-3 px-4">
   <CardTitle className="text-sm font-medium">pipeline preview</CardTitle>
 </CardHeader>
 <CardContent className="px-4 pb-4">
   {isValid && (
   <div className="space-y-4">
   <div className="flex items-center gap-3">
  <div className="p-2 bg-primary/10 rounded-lg">
  <Layout className="h-4 w-4 text-primary" />
  </div>
  <span className="font-bold">{JSON.parse(json).meta?.name}</span>
   </div>
   <div className="space-y-2">
  <div className="flex items-center gap-2 text-xs text-muted-foreground  font-bold">
  <Database className="h-3 w-3" /> databases
  </div>
  {JSON.parse(json).databases?.map((db: any) => (
  <div key={db.key} className="p-2 bg-white/5 rounded border border-white/5 text-sm flex items-center justify-between">
  <span>{db.key}</span>
  <span className="text-[10px] text-muted-foreground">{db.properties?.length || 0} properties</span>
  </div>
  ))}
   </div>
   <div className="space-y-2">
  <div className="flex items-center gap-2 text-xs text-muted-foreground  font-bold">
  <Layout className="h-3 w-3" /> layout widgets
  </div>
  {JSON.parse(json).layout?.widgets?.map((w: any, i: number) => (
  <div key={i} className="p-2 bg-white/5 rounded border border-white/5 text-sm flex items-center justify-between">
  <span className="">{w.view_type}</span>
  <span className="text-[10px] text-muted-foreground">{w.source}</span>
  </div>
  ))}
   </div>
   </div>
   )}
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

import { Wand2 } from 'lucide-react';
