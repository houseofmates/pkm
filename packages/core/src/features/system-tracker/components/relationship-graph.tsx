import React, { useMemo, useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemTracker } from '@/contexts/system-tracker-context';
import { useFronter } from '@/contexts/fronter-context';
import { secureLogger } from '@/lib/secure-logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X, Plus, Filter } from 'lucide-react';
import { getStringColor } from '@/utils/color-generator';

// dynamic import to avoid ssr issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  name: string;
  color: string;
  val: number;
  avatar?: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  strength: number;
  style: Record<string, unknown>;
  notes: string;
}

const RELATIONSHIP_STYLES: Record<string, { color: string; width: number; dash: number[] }> = {
  romantic: { color: '#ff69b4', width: 4, dash: [] },
  familial: { color: '#ff8c00', width: 3, dash: [] },
  friendship: { color: '#32cd32', width: 2, dash: [] },
  protective: { color: '#4169e1', width: 3, dash: [] },
  sibling: { color: '#9400d3', width: 2, dash: [5, 5] },
  parental: { color: '#2e8b57', width: 3, dash: [] },
  child: { color: '#20b2aa', width: 2, dash: [] },
  mentor: { color: '#ffd700', width: 2, dash: [] },
  rival: { color: '#ff0000', width: 2, dash: [10, 5, 2, 5] },
  indifferent: { color: '#c0c0c0', width: 1, dash: [] },
  conflicted: { color: '#ff4500', width: 2, dash: [8, 4, 2, 4] },
  trauma_bond: { color: '#8b0000', width: 3, dash: [15, 3] },
  other: { color: '#a0a0a0', width: 1.5, dash: [3, 3] },
};

function nodeColor(member: any): string {
  if (member.color) return member.color;
  if (member.content?.color) return member.content.color;
  return getStringColor(member.name || member.content?.name || member.id || 'unknown');
}

export function RelationshipGraph() {
  const { members } = useFronter();
  const { connections, refreshConnections, createConnection, deleteConnection } = useSystemTracker();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newConnection, setNewConnection] = useState({
    from: '',
    to: '',
    type: 'friendship',
    strength: 5,
    is_mutual: false,
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const fgRef = useRef<any>();

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  useEffect(() => {
    const filteredConnections = activeFilters.length > 0
      ? connections.filter(c => activeFilters.includes(c.relationship_type))
      : connections;

    const nodes: GraphNode[] = members.map((m: any) => ({
      id: m.id?.toString() || m.content?.id || m.content?.member,
      name: m.name || m.content?.name || 'unknown',
      color: nodeColor(m),
      val: 5,
      avatar: m.avatar || m.avatar_url || m.content?.avatarUrl,
    })).filter((n: GraphNode) => n.name && n.name !== 'Unknown');

    const links: GraphLink[] = filteredConnections.map((c: any) => ({
      source: c.from_headmate?.toString() || c.from_headmate_id,
      target: c.to_headmate?.toString() || c.to_headmate_id,
      type: c.relationship_type || 'friendship',
      strength: c.strength || 5,
      style: typeof c.style === 'string' ? JSON.parse(c.style) : (c.style || {}),
      notes: c.notes || '',
    })).filter((l: GraphLink) => l.source && l.target);

    setGraphData({ nodes, links });
  }, [members, connections, activeFilters]);

  const handleCreateConnection = async () => {
    if (!newConnection.from || !newConnection.to) return;
    await createConnection({
      from_headmate_id: newConnection.from,
      to_headmate_id: newConnection.to,
      relationship_type: newConnection.type,
      strength: newConnection.strength,
      is_mutual: newConnection.is_mutual,
      notes: '',
      style: RELATIONSHIP_STYLES[newConnection.type] || RELATIONSHIP_STYLES.other,
    });
    setShowAddDialog(false);
    setNewConnection({ from: '', to: '', type: 'friendship', strength: 5, is_mutual: false });
    await refreshConnections();
  };

  const handleDeleteFromGraph = async (link: any) => {
    const targetId = link.target?.id || link.target;
    const sourceId = link.source?.id || link.source;
    const id = connections.find(c => {
      const cFrom = c.from_headmate?.toString() || c.from_headmate_id;
      const cTo = c.to_headmate?.toString() || c.to_headmate_id;
      return (cFrom === sourceId && cTo === targetId) || (cFrom === targetId && cTo === sourceId);
    })?.id;
    if (id) await deleteConnection(id);
  };

  const allTypes = Object.keys(RELATIONSHIP_STYLES);

  return (
    <div className=w-full h-full flex flex-col relative>
      <div className=flex items-center justify-between p-4 border-b border-white/10>
        <h2 className=text-lg font-semibold text-white>relationship map</h2>
        <div className=flex items-center gap-2>
          <Button
            size=sm
            variant=ghost
            onClick={() => setShowFilterDialog(true)}
            className=text-white/60 hover:text-white
          >
            <Filter className=h-4 w-4 mr-1 /> filter
          </Button>
          <Button
            size=sm
            variant=default
            onClick={() => setShowAddDialog(true)}
            className=bg-white/10 hover:bg-white/20 text-white
          >
            <Plus className=h-4 w-4 mr-1 /> add connection
          </Button>
        </div>
      </div>

      <div className=flex-1 relative bg-[#0a0a0a]>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel={(node: any) => }
          nodeColor={(node: any) => node.color}
          nodeVal={(node: any) => Math.max(3, 15 - graphData.nodes.length / 10)}
          linkColor={(link: any) => RELATIONSHIP_STYLES[link.type]?.color || '#a0a0a0'}
          linkWidth={(link: any) => RELATIONSHIP_STYLES[link.type]?.width || 2}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const start = fgRef.current?.getNodePosition(link.source.id || link.source) || { x: 0, y: 0 };
            const end = fgRef.current?.getNodePosition(link.target.id || link.target) || { x: 0, y: 0 };
            if (!start || !end) return;

            const style = RELATIONSHIP_STYLES[link.type] || RELATIONSHIP_STYLES.other;
            ctx.strokeStyle = style.color;
            ctx.lineWidth = style.width;
            ctx.setLineDash(style.dash);

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }}
          onNodeClick={(node: any) => setSelectedNode(node)}
          onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
          onLinkClick={(link: any) => {}}
          onBackgroundClick={() => setSelectedNode(null)}
          backgroundColor=#0a0a0a
          warmupTicks={100}
          cooldownTicks={50}
          d3VelocityDecay={0.3}
          d3AlphaDecay={0.05}
          linkDistance={80}
        />

        {hoveredNode && (
          <div className=absolute top-2 left-2 bg-black/80 backdrop-blur text-white p-2 rounded border border-white/10 text-sm pointer-events-none>
            {graphData.nodes.find(n => n.id === hoveredNode)?.name}
          </div>
        )}
      </div>

      {/* Add Connection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className=bg-[#1a1a1a] border border-white/10 text-white>
          <DialogHeader>
            <DialogTitle>new connection</DialogTitle>
          </DialogHeader>
          <div className=space-y-4>
            <div>
              <label className=text-sm text-white/60>from headmate</label>
              <Select value={newConnection.from} onValueChange={v => setNewConnection({ ...newConnection, from: v })}>
                <SelectTrigger className=bg-white/5 border-white/10><SelectValue/></SelectTrigger>
                <SelectContent className=bg-[#1a1a1a] border-white/10>{members.map((m: any) => (<SelectItem key={m.id} value={m.id?.toString() || m.content?.id}>{m.name || m.content?.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className=text-sm text-white/60>to headmate</label>
              <Select value={newConnection.to} onValueChange={v => setNewConnection({ ...newConnection, to: v })}>
                <SelectTrigger className=bg-white/5 border-white/10><SelectValue/></SelectTrigger>
                <SelectContent className=bg-[#1a1a1a] border-white/10>{members.map((m: any) => (<SelectItem key={m.id} value={m.id?.toString() || m.content?.id}>{m.name || m.content?.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className=text-sm text-white/60>relationship type</label>
              <Select value={newConnection.type} onValueChange={v => setNewConnection({ ...newConnection, type: v })}>
                <SelectTrigger className=bg-white/5 border-white/10><SelectValue/></SelectTrigger>
                <SelectContent className=bg-[#1a1a1a] border-white/10>{allTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className=text-sm text-white/60>strength</label>
              <Slider value={[newConnection.strength]} onValueChange={v => setNewConnection({ ...newConnection, strength: v[0] })} min={1} max={10} step={1} className=py-2 />
            </div>
            <div className=flex items-center gap-2>
              <input type=checkbox id=mutual checked={newConnection.is_mutual} onChange={e => setNewConnection({ ...newConnection, is_mutual: e.target.checked })} className=accent-white />
              <label htmlFor=mutual className=text-sm text-white/60>mutual connection</label>
            </div>
            <Button onClick={handleCreateConnection} className=w-full bg-white/10 hover:bg-white/20 text-white>create connection</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className=bg-[#1a1a1a] border border-white/10 text-white>
          <DialogHeader>
            <DialogTitle>filter by type</DialogTitle>
          </DialogHeader>
          <div className=space-y-2>
            {allTypes.map(type => (
              <div key={type} className=flex items-center gap-2>
                <input type=checkbox id={type} checked={activeFilters.includes(type)} onChange={e => {
                  if (e.target.checked) setActiveFilters(prev => [...prev, type]);
                  else setActiveFilters(prev => prev.filter(t => t !== type));
                }} className=accent-white />
                <label htmlFor={type} className=text-sm style={{ color: RELATIONSHIP_STYLES[type].color }}>{type}</label>
              </div>
            ))}
            <Button onClick={() => setActiveFilters([])} className=w-full mt-2 bg-white/10 hover:bg-white/20 text-white>clear filters</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Node Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className=absolute top-4 right-4 w-64 bg-[#1a1a1a] border border-white/10 rounded-lg p-4
          >
            <div className=flex items-center justify-between mb-2>
              <h3 className=font-semibold text-white>{selectedNode.name}</h3>
              <button onClick={() => setSelectedNode(null)} className=text-white/40 hover:text-white><X className=h-4 w-4 /></button>
            </div>
            <div className=text-sm text-white/50>
              connected to: {graphData.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).length} headmates
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
