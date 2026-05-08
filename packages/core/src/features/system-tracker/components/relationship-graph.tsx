import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSystemTracker } from '@/contexts/system-tracker-context';
import { useFronter } from '@/contexts/fronter-context';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Check } from 'lucide-react';

export const RELATIONSHIP_STYLES: Record<string, { color: string; width: number; dash: number[] }> = {
  romantic:   { color: '#ff69b4', width: 4, dash: [5, 5] },
  familial:   { color: '#9b59b6', width: 2.5, dash: [] },
  friendship: { color: '#32cd32', width: 3, dash: [] },
  protective: { color: '#4169e1', width: 3, dash: [] },
  sibling:    { color: '#20b2aa', width: 2, dash: [5, 5] },
  parental:   { color: '#2e8b57', width: 3, dash: [] },
  child:      { color: '#ff7f50', width: 2, dash: [] },
  mentor:     { color: '#ffd700', width: 2, dash: [] },
  rival:      { color: '#dc143c', width: 2, dash: [8, 4, 2, 4] },
  indifferent:{ color: '#c0c0c0', width: 1.5, dash: [] },
  conflicted: { color: '#ff4500', width: 2, dash: [8, 4, 2, 4] },
  trauma_bond:{ color: '#8b0000', width: 4, dash: [15, 3] },
  other:      { color: '#a0a0a0', width: 1.5, dash: [] },
};

export function RelationshipGraph() {
  const { members } = useFronter();
  const { connections, refreshConnections, createConnection, deleteConnection } = useSystemTracker();

  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newConn, setNewConn] = useState({
    from: '', to: '', type: 'friendship', strength: 5, is_mutual: false, notes: ''
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const fgRef = useRef<any>(null);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  const graphData = useMemo(() => {
    const filteredConnections = activeFilters.length > 0
      ? connections.filter((c: any) => activeFilters.includes(c.relationship_type))
      : connections;

    const nodes = members.map((h: any) => {
      const rawName = h.name || h.content?.name || 'unknown';
      return {
        id: h.id?.toString?.() || h.content?.id || h.content?.member || h.id,
        name: rawName,
        color: h.color || h.content?.color || '#666',
        val: 5,
      };
    }).filter((n: any) => n.id && n.name);

    const links = filteredConnections.map((c: any) => {
      const fromId = (c.from_headmate?.id || c.from_headmate)?.toString();
      const toId = (c.to_headmate?.id || c.to_headmate)?.toString();
      return {
        source: fromId,
        target: toId,
        relationship_type: c.relationship_type || 'other',
        strength: c.strength || 5,
      };
    }).filter((l: any) => l.source && l.target);

    return { nodes, links };
  }, [members, connections, activeFilters]);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x || 0;
    const y = node.y || 0;
    const fontSize = Math.max(8, 10 / (globalScale || 1));
    const size = Math.max(3, 5 / (globalScale || 1));

    ctx.font = ;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(node.name, x, y + size + fontSize + 2);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || '#666';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.2 / (globalScale || 1);
    ctx.stroke();
  }, []);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!link.source || !link.target) return;
    if (!link.source.x || !link.target.x) return;
    const style = RELATIONSHIP_STYLES[link.relationship_type] || RELATIONSHIP_STYLES.other;
    const src = link.source;
    const tgt = link.target;

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width / (globalScale || 1);
    if (style.dash.length > 0) {
      ctx.setLineDash(style.dash.map((d: number) => d / (globalScale || 1)));
    }
    ctx.globalAlpha = 0.6 + (link.strength || 5) / 20;
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  const allTypes = Object.keys(RELATIONSHIP_STYLES);

  return (
    <div className=w-full h-full flex flex-col bg-[#0a0a0a]>
      <header className=h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#111]>
        <h2 className=text-sm font-medium text-white/80>relationship map</h2>
        <div className=flex items-center gap-2>
          <button onClick={() => setShowFilterDialog(true)} className=px-3 py-1 rounded border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition>filter</button>
          <button onClick={() => setShowAddDialog(true)} className=px-3 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/20 transition>+ add</button>
          <button onClick={() => setSelectedNode(null)} className=px-3 py-1 rounded border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition>clear</button>
        </div>
      </header>

      <div className=flex-1 relative>
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel={(node: any) => node.name}
            nodeColor={(node: any) => node.color}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={(node: any) => setSelectedNode(node)}
            onBackgroundClick={() => setSelectedNode(null)}
            backgroundColor=transparent
            warmupTicks={100}
            cooldownTicks={50}
            linkDistance={120}
            chargeStrength={-40}
          />
        ) : (
          <div className=flex items-center justify-center h-full text-white/40 text-sm>add headmates and connections to see the map</div>
        )}

        {/* Legend */}
        <div className=absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg p-3 max-w-xs>
          <h3 className=text-xs font-medium text-white/60 mb-2 uppercase tracking-wider>legend</h3>
          <div className=space-y-1>
            {allTypes.map((type) => (
              <div key={type} className=flex items-center gap-2>
                <div className=w-6 h-0.5 style={{ backgroundColor: RELATIONSHIP_STYLES[type].color, opacity: 0.8 }} />
                <span className=text-xs text-white/50>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Node details */}
        {selectedNode && (
          <div className=absolute top-3 right-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg p-4 w-64>
            <h3 className=text-sm font-semibold text-white>{selectedNode.name}</h3>
            <div className=mt-2 text-xs text-white/50>
              connections: {graphData.links.filter((l: any) => l.source === selectedNode.id || l.target === selectedNode.id).length}
            </div>
          </div>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className=bg-[#111] border border-white/10 text-white max-w-sm>
          <DialogHeader>
            <DialogTitle className=text-sm>add connection</DialogTitle>
          </DialogHeader>
          <div className=space-y-3 mt-2>
            <div className=space-y-1>
              <label className=text-xs text-white/40>from headmate</label>
              <Select onValueChange={(v: string) => setNewConn(n => ({ ...n, from: v }))}>
                <SelectTrigger className=bg-black border-white/10><SelectValue placeholder=select /></SelectTrigger>
                <SelectContent className=bg-[#111] border-white/10>
                  {members.map((m: any) => (<SelectItem key={m.id} value={m.id?.toString?.() || m.content?.id}>{m.name || m.content?.name || '?'}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className=space-y-1>
              <label className=text-xs text-white/40>to headmate</label>
              <Select onValueChange={(v: string) => setNewConn(n => ({ ...n, to: v }))}>
                <SelectTrigger className=bg-black border-white/10><SelectValue placeholder=select /></SelectTrigger>
                <SelectContent className=bg-[#111] border-white/10>
                  {members.map((m: any) => (<SelectItem key={m.id} value={m.id?.toString?.() || m.content?.id}>{m.name || m.content?.name || '?'}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className=space-y-1>
              <label className=text-xs text-white/40>type</label>
              <Select onValueChange={(v: string) => setNewConn(n => ({ ...n, type: v }))}>
                <SelectTrigger className=bg-black border-white/10><SelectValue /></SelectTrigger>
                <SelectContent className=bg-[#111] border-white/10>
                  {allTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className=space-y-1>
              <label className=text-xs text-white/40>strength</label>
              <Slider value={[newConn.strength]} onValueChange={v => setNewConn(n => ({ ...n, strength: v[0] }))} min={1} max={10} step={1} className=py-2 />
            </div>
            <div className=flex items-center gap-2>
              <input type=checkbox id=mutual checked={newConn.is_mutual} onChange={e => setNewConn(n => ({ ...n, is_mutual: e.target.checked }))} className=accent-white />
              <label htmlFor=mutual className=text-xs text-white/40>mutual</label>
            </div>
            <Button onClick={() => { createConnection(newConn); setShowAddDialog(false); }} className=w-full bg-white/10 hover:bg-white/20 text-white text-xs>add connection</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className=bg-[#111] border border-white/10 text-white max-w-sm>
          <DialogHeader>
            <DialogTitle className=text-sm>filter by type</DialogTitle>
          </DialogHeader>
          <div className=space-y-2 mt-2>
            {allTypes.map((type) => (
              <label key={type} className=flex items-center gap-2 cursor-pointer>
                <div className=w-3 h-3 rounded-sm style={{ backgroundColor: RELATIONSHIP_STYLES[type].color }} />
                <span className=text-xs text-white/60>{type}</span>
              </label>
            ))}
            <Button onClick={() => setActiveFilters([])} className=w-full mt-2 bg-white/10 hover:bg-white/20 text-white text-xs>clear all</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
