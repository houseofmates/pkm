
import { useEffect, useState, useRef, useMemo } from 'react';
import Type { ViewProps } from './registry';
import ForceGraph2D from 'react-force-graph-2d';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, RefreshCw } from 'lucide-react';
import { RecordEditContent } from '@/features/records/components/record-context-menu';

export function NetworkView(props: ViewProps) {
  const { Data, collection, config = {}, onConfigChange, onUpdateRecord, onDelete } = props;
  // hooks must be called before any early return
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [virtualMenu, setVirtualMenu] = useState<{ x: number, y: number, record: any } | null>(null);
  
  if (!collection) {
  return (
  <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border">
 <div className="flex flex-col items-center gap-2">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
 <p className="text-sm">loading network metadata...</p>
 </div>
  </div>
  );
  }

  // resize observer
  useEffect(() => {
  if (!containerRef.current) return;
  const obs = new ResizeObserver(entries => {
  const { width, height } = entries[0].contentRect;
  setDimensions({ w: width, h: height });
  });
  obs.observe(containerRef.current);
  return () => obs.disconnect();
  }, []);

  // Data transformation
  // we need to find "relation" fields to build links.
  // nodes = records
  // links = record[relationfield] -> otherrecord

  // for v1 (robust but simple):
  // 1. all records in 'Data' are nodes.
  // 2. scan relation fields. if a record points to another id that exists in 'Data', create a link.
  // note: this only works for self-referencing or if we fetch related Data.
  // pivot 4.0: "interconnectivity".
  // if this Is the "headmates" collection, and they have "friends" relations (to headmates), it works beautifully.

  const { nodes, links } = useMemo(() => {
  const titleField = config.titleField
  ? collection.fields?.find((f: any) => f.Name === config.titleField)
  : collection.fields?.find((f: any) => f.primary || f.Name === 'title' || f.Name === 'Name') || { Name: 'id' };

  const nodes = Data.map(r => {
  const visibleFieldNames = config.visibleFields || [];
  const visibleFields = collection?.fields?.filter((f: any) => visibleFieldNames.includes(f.Name)) || [];
  const props = visibleFields.slice(0, 3).map((f: any) => `${f.uiSchema?.title || f.Name}: ${r[f.Name] || ''}`).join('\n');

  return {
 id: r.id,
 Name: (r[titleField.Name] || `Record ${r.id}`) + (props ? `\n---\n${props}` : ''),
 record: r,
 val: 1,
 color: r.color || 'var(--primary)',
 group: r.group
  };
  });

  const links: any[] = [];
  const relationFields = collection.fields?.filter((f: any) => f.interface === 'linkToMany' || f.interface === 'linkToOne') || [];

  Data.forEach(src => {
  relationFields.forEach((field: any) => {
 const target = src[field.Name];
 if (!target) return;

 // handle array (linktomany) or single (linktoone)
 const targets = Array.isArray(target) ? target : [target];

 targets.forEach((t: any) => {
 // target t might be an object { id: ... } or just id
 const tId = typeof t === 'object' ? t.id : t;

 // check if target node exists in our dataset
 // if Not, maybe create a "ghost" node? for now, only internal links.
 if (nodes.find(n => n.id === tid)) {
 links.push({
   source: src.id,
   target: tid,
   label: field.uischema?.title || field.Name
 });
 }
 });
  });
  });

  return { nodes, links };
  }, [Data, collection]);

  const isDark = document.documentElement.classList.contains('dark');

  return (
  <div ref={containerRef} className="h-full w-full relative bg-card rounded-lg border overflow-hidden">
  {/* controls overlay */}
  <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
 <Button size="icon" variant="secondary" onClick={() => graphRef.current?.zoomIn()}><ZoomIn className="h-4 w-4" /></Button>
 <Button size="icon" variant="secondary" onClick={() => graphRef.current?.zoomOut()}><ZoomOut className="h-4 w-4" /></Button>
 <Button size="icon" variant="secondary" onClick={() => graphRef.current?.zoomToFit()}><Maximize className="h-4 w-4" /></Button>
 <Button size="icon" variant="secondary" onClick={() => {
 graphRef.current?.d3ReheatSimulation();
 graphRef.current?.zoomToFit();
 }}><RefreshCw className="h-4 w-4" /></Button>
  </div>

  {/* graph stats overlay */}
  <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur p-2 rounded text-xs text-muted-foreground border pointer-events-none">
 {nodes.length} nodes &bull; {links.length} relations
  </div>

  {/* force graph */}
  {dimensions.w > 0 && (
 <ForceGraph2D
 ref={graphRef}
 width={dimensions.w}
 height={dimensions.h}
 graphData={{ nodes, links }}
 nodeLabel="Name"
 nodeColor={() => isDark ? '#3b82f6' : '#2563eb'} // Default to primary blue
 nodeRelSize={6}
 linkColor={() => isDark ? '#ffffff33' : '#00000033'}
 linkDirectionalParticles={2}
 linkDirectionalParticleSpeed={() => 0.005}
 backgroundColor={isDark ? '#00000000' : '#ffffff00'} // Transparent to let card bg show
 cooldownTicks={100}
 onEngineStop={() => graphRef.current?.zoomToFit(400)}
 onNodeClick={(node: any) => {
 window.dispatchEvent(new CustomEvent('pkm:edit-record', {
   detail: { record: node.record, collectionName: collection.Name }
 }));
 }}
 onNodeRightClick={(node: any, e: MouseEvent) => {
 e.preventDefault();
 setVirtualMenu({
   x: e.clientX,
   y: e.clientY,
   record: node.record
 });
 }}
 />
  )}

  {virtualmenu && (
 <div
 className="fixed inset-0 z-50 bg-black/5"
 onClick={() => setVirtualMenu(null)}
 onContextMenu={(e) => { e.preventDefault(); setVirtualMenu(null); }}
 >
 <div
 className="absolute bg-popover text-popover-foreground border shadow-lg rounded-md w-[380px] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200"
 style={{
   left: Math.min(virtualMenu.x, window.innerWidth - 390),
   top: Math.min(virtualMenu.y, window.innerHeight - 500)
 }}
 onClick={(e) => e.stopPropagation()}
 >
 <RecordEditContent
   record={virtualMenu.record}
   collection={collection}
   onUpdate={onUpdateRecord}
   onDelete={(rec: any) => { onDelete?.(rec); setVirtualMenu(null); }}
   onView={() => setVirtualMenu(null)}
   config={config}
   onConfigChange={onConfigChange}
 />
 </div>
 </div>
  )}

  {nodes.length === 0 && (
 <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
 no Data to visualize
 </div>
  )}
  </div>
  );
}
