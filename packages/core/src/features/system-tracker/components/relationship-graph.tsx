import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSystemTracker, type Connection } from '@/contexts/system-tracker-context';
import { useFronter } from '@/contexts/fronter-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const RELATIONSHIP_STYLES: Record<string, { color: string; width: number; dash: number[] }> = {
  romantic:    { color: '#ff69b4', width: 4, dash: [5, 5] },
  familial:    { color: '#9b59b6', width: 2.5, dash: [] },
  friendship:  { color: '#32cd32', width: 3, dash: [] },
  protective:  { color: '#4169e1', width: 3, dash: [] },
  sibling:     { color: '#20b2aa', width: 2, dash: [5, 5] },
  parental:    { color: '#2e8b57', width: 3, dash: [] },
  child:       { color: '#ff7f50', width: 2, dash: [] },
  mentor:      { color: '#ffd700', width: 2, dash: [] },
  rival:       { color: '#dc143c', width: 2, dash: [8, 4, 2, 4] },
  indifferent: { color: '#c0c0c0', width: 1.5, dash: [] },
  conflicted:  { color: '#ff4500', width: 2, dash: [8, 4, 2, 4] },
  trauma_bond: { color: '#8b0000', width: 4, dash: [15, 3] },
  other:       { color: '#a0a0a0', width: 1.5, dash: [] },
};

interface GraphNode {
  id: string;
  name: string;
  color: string;
  val: number;
}

interface FormState {
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;
  is_mutual: boolean;
  notes: string;
}

const ALL_TYPES = Object.keys(RELATIONSHIP_STYLES);

export function RelationshipGraph() {
  const { members } = useFronter();
  const { connections, refreshConnections, createConnection } = useSystemTracker();

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [form, setForm] = useState<FormState>({
    from_id: '',
    to_id: '',
    relationship_type: 'friendship',
    strength: 5,
    is_mutual: false,
    notes: '',
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const resetForm = () => setForm({
    from_id: '', to_id: '', relationship_type: 'friendship',
    strength: 5, is_mutual: false, notes: '',
  });

  // Pull fresh data on mount AND when connections change
  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  const graphData = useMemo(() => {
    const connSet = activeFilters.length > 0
      ? connections.filter((c: Connection) => activeFilters.includes(c.relationship_type))
      : connections;

    const nodes: GraphNode[] = members
      .map((h: any) => ({
        id: String(h.id ?? h.content?.id ?? ''),
        name: String(h.name ?? h.content?.name ?? 'unknown'),
        color: String(h.color ?? h.content?.color ?? '#666'),
        val: 5,
      }))
      .filter((n: GraphNode) => n.id && n.name !== 'unknown');

    const nodeIds = new Set(nodes.map(n => n.id));

    const links = connSet
      .map((c: Connection) => ({
        source: String(c.from_headmate_id ?? ''),
        target: String(c.to_headmate_id ?? ''),
        relationship_type: String(c.relationship_type || 'other'),
        strength: Number(c.strength) || 5,
      }))
      .filter((l: any) => l.source && l.target && nodeIds.has(l.source) && nodeIds.has(l.target));

    return { nodes, links };
  }, [members, connections, activeFilters]);

  const fontSize = useCallback((gs: number) => Math.max(8, Math.min(14, 10 / (gs || 1))), []);
  const nodeRadius = useCallback((gs: number) => Math.max(3, Math.min(12, 5 / (gs || 1))), []);

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node?.x == null || node?.y == null) return;
      const fs = fontSize(globalScale);
      const r = nodeRadius(globalScale);
      const x = node.x;
      const y = node.y;

      // Label
      ctx.font = `${fs}px ui-sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(node.name, x, y + r + fs + 2);

      // Circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || '#666';
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.2 / Math.max(globalScale, 0.2);
      ctx.stroke();
    },
    [fontSize, nodeRadius],
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!link?.source?.x || !link?.target?.x) return;
      const style = RELATIONSHIP_STYLES[link.relationship_type] || RELATIONSHIP_STYLES.other;
      const src = link.source;
      const tgt = link.target;
      const gs = Math.max(globalScale, 0.2);

      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width / gs;
      if (style.dash.length > 0) {
        ctx.setLineDash(style.dash.map((d: number) => d / gs));
      }
      ctx.globalAlpha = 0.45 + (link.strength || 5) / 25;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      ctx.restore();
    },
    [],
  );

  const handleCreate = async () => {
    if (!form.from_id || !form.to_id) return;
    try {
      await createConnection({
        from_headmate_id: form.from_id,
        to_headmate_id: form.to_id,
        relationship_type: form.relationship_type,
        strength: form.strength,
        is_mutual: form.is_mutual,
        notes: form.notes,
      });
      setShowAddDialog(false);
      resetForm();
      await refreshConnections();
    } catch (err) {
      console.error('failed to create connection:', err);
    }
  };

  const selectedConnections = selectedNode
    ? graphData.links.filter((l: any) => l.source === selectedNode.id || l.target === selectedNode.id)
    : [];

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}>relationship map</h2>
        <div style={s.btnRow}>
          <button onClick={() => setShowFilterDialog(true)} style={s.btn}>filter</button>
          <button onClick={() => { resetForm(); setShowAddDialog(true); }} style={s.btnAccent}>+ add</button>
          <button onClick={() => setSelectedNode(null)} style={s.btn}>clear</button>
        </div>
      </div>

      {/* Graph area */}
      <div style={s.grow}>
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            graphData={graphData}
            nodeLabel={(node: any) => node.name}
            nodeColor={(node: any) => node.color}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={(node: any) => setSelectedNode(node)}
            onBackgroundClick={() => setSelectedNode(null)}
            backgroundColor="#0a0a0a"
            warmupTicks={100}
            cooldownTicks={50}
            linkDistance={120}
            chargeStrength={-40}
          />
        ) : (
          <div style={s.empty}>add headmates and connections to see the map</div>
        )}

        {/* Legend */}
        <div style={s.legend}>
          <h3 style={s.legendTitle}>relationship types</h3>
          {ALL_TYPES.map(type => (
            <div key={type} style={s.legendRow}>
              <div style={{ width: 24, height: 2, background: RELATIONSHIP_STYLES[type].color, opacity: 0.8 }} />
              <span style={s.legendText}>{type}</span>
            </div>
          ))}
        </div>

        {/* Node details panel */}
        {selectedNode && (
          <div style={s.detailPanel}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{selectedNode.name}</h3>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              connections: {selectedConnections.length}
            </span>
          </div>
        )}
      </div>

      {/* Add connection dialog (shadcn) */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle>add connection</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div>
              <label style={s.label}>from headmate</label>
              <Select value={form.from_id} onValueChange={v => setForm(f => ({ ...f, from_id: v }))}>
                <SelectTrigger><SelectValue placeholder="select headmate" /></SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name || m.content?.name || '?'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={s.label}>to headmate</label>
              <Select value={form.to_id} onValueChange={v => setForm(f => ({ ...f, to_id: v }))}>
                <SelectTrigger><SelectValue placeholder="select headmate" /></SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name || m.content?.name || '?'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={s.label}>type</label>
              <Select value={form.relationship_type} onValueChange={v => setForm(f => ({ ...f, relationship_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={s.label}>strength: {form.strength}</label>
              <Slider value={[form.strength]} min={1} max={10} step={1} onValueChange={([v]) => setForm(f => ({ ...f, strength: v }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              <input type="checkbox" checked={form.is_mutual} onChange={e => setForm(f => ({ ...f, is_mutual: e.target.checked }))} style={{ accentColor: '#fff' }} />
              mutual
            </label>
            <div>
              <label style={s.label}>notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={s.textarea}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddDialog(false)} style={s.btn}>cancel</button>
              <button onClick={handleCreate} style={s.btnAccent}>add</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter dialog (shadcn) */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', maxWidth: 360 }}>
          <DialogHeader>
            <DialogTitle>filter by type</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {ALL_TYPES.map(type => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={activeFilters.includes(type)}
                  onChange={() => setActiveFilters(prev =>
                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                  )}
                  style={{ accentColor: '#fff' }}
                />
                <div style={{ width: 16, height: 2, background: RELATIONSHIP_STYLES[type].color }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{type}</span>
              </label>
            ))}
            <button onClick={() => setActiveFilters([])} style={{ ...s.btn, marginTop: 8 }}>clear all</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a' },
  header: { height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#111', flexShrink: 0 },
  title: { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: 0 },
  btnRow: { display: 'flex', gap: 8 },
  btn: { padding: '4px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' },
  btnAccent: { padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, cursor: 'pointer' },
  grow: { flex: 1, position: 'relative', overflow: 'hidden' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  legend: { position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, maxWidth: 200, zIndex: 10 },
  legendTitle: { fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 1 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  legendText: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  detailPanel: { position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 16, width: 260, zIndex: 10 },
  label: { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  textarea: { width: '100%', height: 80, padding: 8, background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', fontSize: 14, resize: 'vertical' as const },
};

export default RelationshipGraph;
