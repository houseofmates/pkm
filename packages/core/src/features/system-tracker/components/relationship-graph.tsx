import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSystemTracker, type Connection } from '@/contexts/system-tracker-context';
import { useFronter, type Headmate } from '@/contexts/fronter-context';
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

const RELATIONSHIP_STYLES = {
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
} as const;

type RelationshipType = keyof typeof RELATIONSHIP_STYLES;

interface GraphNode {
  id: string;
  name: string;
  color: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  relationship_type: string;
  strength: number;
  __connection?: Connection;
}

interface FormState {
  from_id: string;
  to_id: string;
  relationship_type: RelationshipType;
  strength: number;
  is_mutual: boolean;
  notes: string;
}

const ALL_TYPES = Object.keys(RELATIONSHIP_STYLES) as RelationshipType[];

const EMPTY_FORM: FormState = {
  from_id: '',
  to_id: '',
  relationship_type: 'friendship',
  strength: 5,
  is_mutual: false,
  notes: '',
};

const memberName = (m: Headmate) => m.name || m.id;

export function RelationshipGraph() {
  const { members } = useFronter();
  const { connections, refreshConnections, createConnection, deleteConnection, loading } = useSystemTracker();

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [activeFilters, setActiveFilters] = useState<RelationshipType[]>([]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setCreateError(null);
  };

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  const headmatesAvailable = useMemo(() => {
    return members.filter((h: Headmate) => h.id);
  }, [members]);

  const graphData = useMemo(() => {
    const connSet = activeFilters.length > 0
      ? connections.filter((c) => activeFilters.includes(c.relationship_type as RelationshipType))
      : connections;

    const nodes: GraphNode[] = headmatesAvailable.map((h: Headmate) => ({
      id: h.id,
      name: memberName(h),
      color: h.color || '#666',
      val: 5,
    }));

    const nodeIds = new Set(nodes.map(n => n.id));

    const links: GraphLink[] = connSet
      .map((c: Connection) => ({
        source: c.from_headmate_id,
        target: c.to_headmate_id,
        relationship_type: c.relationship_type || 'other',
        strength: c.strength || 5,
        __connection: c,
      }))
      .filter((l) => l.source && l.target && nodeIds.has(l.source) && nodeIds.has(l.target));

    return { nodes, links };
  }, [headmatesAvailable, connections, activeFilters]);

  const fontSize = useCallback((gs: number) => Math.max(8, Math.min(14, 10 / (gs || 1))), []);
  const nodeRadius = useCallback((gs: number) => Math.max(3, Math.min(12, 5 / (gs || 1))), []);

  const nodeCanvasObject = useCallback(
    (node: GraphNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;
      const fs = fontSize(globalScale);
      const r = nodeRadius(globalScale);

      ctx.font = `${fs}px ui-sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(node.name, node.x, node.y + r + fs + 2);

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
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
      const style = RELATIONSHIP_STYLES[link.relationship_type as RelationshipType] || RELATIONSHIP_STYLES.other;
      const src = link.source;
      const tgt = link.target;
      const gs = Math.max(globalScale, 0.2);

      const isSelected = selectedLink && selectedLink.source === link.source && selectedLink.target === link.target;

      ctx.save();
      ctx.strokeStyle = isSelected ? '#fff' : style.color;
      ctx.lineWidth = (isSelected ? style.width + 2 : style.width) / gs;
      if (style.dash.length > 0) {
        ctx.setLineDash(style.dash.map((d: number) => d / gs));
      }
      ctx.globalAlpha = isSelected ? 0.85 : (0.45 + (link.strength || 5) / 25);
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      ctx.restore();
    },
    [selectedLink],
  );

  const handleCreate = async () => {
    if (!form.from_id || !form.to_id) return;
    if (form.from_id === form.to_id) {
      setCreateError('cannot connect a headmate to itself');
      return;
    }
    setCreateError(null);
    setIsSubmitting(true);
    try {
      const result = await createConnection({
        from_headmate_id: form.from_id,
        to_headmate_id: form.to_id,
        relationship_type: form.relationship_type,
        strength: form.strength,
        is_mutual: form.is_mutual,
        notes: form.notes,
      });
      if (result) {
        setShowAddDialog(false);
        resetForm();
        await refreshConnections();
      } else {
        setCreateError('server returned no connection — try again');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'failed to create connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLink?.__connection) return;
    try {
      await deleteConnection(selectedLink.__connection.id);
      setSelectedLink(null);
      setSelectedNode(null);
      await refreshConnections();
    } catch (err) {
      console.error('failed to delete connection:', err);
    }
  };

  // ---- derived data for node details ----
  const nodeConnections = selectedNode
    ? graphData.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
    : [];

  const nodeConnectionBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; type: string }> = {};
    for (const l of nodeConnections) {
      const rel = l.relationship_type || 'other';
      if (!breakdown[rel]) breakdown[rel] = { count: 0, type: rel };
      breakdown[rel].count++;
    }
    return Object.values(breakdown).sort((a, b) => b.count - a.count);
  }, [nodeConnections]);

  const connectedHeadmates = useMemo(() => {
    if (!selectedNode) return [];
    const ids = new Set<string>();
    for (const l of nodeConnections) {
      if (l.source === selectedNode.id) ids.add(l.target);
      else ids.add(l.source);
    }
    return headmatesAvailable.filter(h => ids.has(h.id));
  }, [selectedNode, nodeConnections, headmatesAvailable]);

  // ---- to-list for dropdowns that excludes current from selection ----
  const getFilteredToMembers = (excludeId: string) =>
    headmatesAvailable.filter(m => m.id !== excludeId);

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}>relationship map</h2>
        <div style={s.btnRow}>
          <button onClick={() => setShowFilterDialog(true)} style={s.btn}>filter</button>
          <button onClick={() => { resetForm(); setShowAddDialog(true); }} style={s.btnAccent}>+ add</button>
          <button onClick={() => { setSelectedNode(null); setSelectedLink(null); }} style={s.btn}>clear</button>
        </div>
      </div>

      {/* Graph area */}
      <div style={s.grow}>
        {loading ? (
          <div style={s.empty}>loading graph data...</div>
        ) : graphData.nodes.length > 0 ? (
          <ForceGraph2D
            graphData={graphData}
            nodeLabel={(node: GraphNode) => node.name}
            nodeColor={(node: GraphNode) => node.color}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={(node: GraphNode) => { setSelectedNode(node); setSelectedLink(null); }}
            onLinkClick={(link: GraphLink) => {
              setSelectedNode(null);
              setSelectedLink(link);
            }}
            onBackgroundClick={() => { setSelectedNode(null); setSelectedLink(null); }}
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
        {graphData.nodes.length > 0 && (
          <div style={s.legend}>
            <h3 style={s.legendTitle}>relationship types</h3>
            {ALL_TYPES.map(type => (
              <div key={type} style={s.legendRow}>
                <div style={{ width: 24, height: 2, background: RELATIONSHIP_STYLES[type].color, opacity: 0.8 }} />
                <span style={s.legendText}>{type}</span>
              </div>
            ))}
          </div>
        )}

        {/* Node details panel */}
        {selectedNode && (
          <div style={s.detailPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedNode.color, flexShrink: 0 }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{selectedNode.name}</h3>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              {nodeConnections.length} connection{nodeConnections.length !== 1 ? 's' : ''}
            </span>

            {nodeConnectionBreakdown.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {nodeConnectionBreakdown.map(b => (
                  <span key={b.type} style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: RELATIONSHIP_STYLES[b.type as RelationshipType]?.color + '22' || 'rgba(255,255,255,0.05)',
                    color: RELATIONSHIP_STYLES[b.type as RelationshipType]?.color || 'rgba(255,255,255,0.5)',
                    border: '1px solid ' + (RELATIONSHIP_STYLES[b.type as RelationshipType]?.color + '44' || 'rgba(255,255,255,0.1)'),
                  }}>
                    {b.type} ×{b.count}
                  </span>
                ))}
              </div>
            )}

            {connectedHeadmates.length > 0 && (
              <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>connected to</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {connectedHeadmates.map(h => (
                    <span
                      key={h.id}
                      onClick={() => {
                        const node = graphData.nodes.find(n => n.id === h.id);
                        if (node) { setSelectedNode(node); setSelectedLink(null); }
                      }}
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '1px 4px', borderRadius: 3, background: 'rgba(255,255,255,0.04)' }}
                    >
                      {memberName(h)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected link panel */}
        {selectedLink && selectedLink.__connection && (
          <div style={s.detailPanel}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 8 }}>connection</h3>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              {(() => {
                const fromName = headmatesAvailable.find(h => h.id === selectedLink.source)?.name || selectedLink.source;
                const toName = headmatesAvailable.find(h => h.id === selectedLink.target)?.name || selectedLink.target;
                return `${fromName} → ${toName}`;
              })()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 20, height: 2, background: RELATIONSHIP_STYLES[selectedLink.relationship_type as RelationshipType]?.color || '#fff', opacity: 0.8 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{selectedLink.relationship_type}</span>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>strength: {selectedLink.strength}/10</span>
            {selectedLink.__connection.notes && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontStyle: 'italic' }}>
                {selectedLink.__connection.notes}
              </p>
            )}
            <button
              onClick={handleDelete}
              style={{ ...s.btnDanger, marginTop: 10 }}
            >
              delete connection
            </button>
          </div>
        )}
      </div>

      {/* Add connection dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) { resetForm(); } }}>
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
                  {headmatesAvailable.map(m => (
                    <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={s.label}>to headmate</label>
              <Select value={form.to_id} onValueChange={v => setForm(f => ({ ...f, to_id: v }))}>
                <SelectTrigger><SelectValue placeholder="select headmate" /></SelectTrigger>
                <SelectContent>
                  {getFilteredToMembers(form.from_id).map(m => (
                    <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={s.label}>type</label>
              <Select value={form.relationship_type} onValueChange={v => setForm(f => ({ ...f, relationship_type: v as RelationshipType }))}>
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
            {createError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, fontSize: 12, color: '#fca5a5' }}>
                {createError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddDialog(false)} style={s.btn}>cancel</button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !form.from_id || !form.to_id}
                style={{ ...s.btnAccent, opacity: (isSubmitting || !form.from_id || !form.to_id) ? 0.5 : 1 }}
              >
                {isSubmitting ? 'adding...' : 'add'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', maxWidth: 360 }}>
          <DialogHeader>
            <DialogTitle>filter by type</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <button onClick={() => setActiveFilters([...ALL_TYPES])} style={s.btnSmall}>select all</button>
              <button onClick={() => setActiveFilters([])} style={s.btnSmall}>clear all</button>
            </div>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const s = {
  container: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a' } as React.CSSProperties,
  header: { height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#111', flexShrink: 0 } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: 0 } as React.CSSProperties,
  btnRow: { display: 'flex', gap: 8 } as React.CSSProperties,
  btn: { padding: '4px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  btnSmall: { padding: '3px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.5)', fontSize: 10, cursor: 'pointer' } as React.CSSProperties,
  btnAccent: { padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { padding: '4px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#fca5a5', fontSize: 11, cursor: 'pointer' } as React.CSSProperties,
  grow: { flex: 1, position: 'relative', overflow: 'hidden' } as React.CSSProperties,
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: 14 } as React.CSSProperties,
  legend: { position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, maxWidth: 200, zIndex: 10 } as React.CSSProperties,
  legendTitle: { fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 } as React.CSSProperties,
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } as React.CSSProperties,
  legendText: { fontSize: 10, color: 'rgba(255,255,255,0.5)' } as React.CSSProperties,
  detailPanel: { position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 16, width: 260, zIndex: 10, maxHeight: 'calc(100% - 24px)', overflowY: 'auto' } as React.CSSProperties,
  label: { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 } as React.CSSProperties,
  textarea: { width: '100%', height: 80, padding: 8, background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', fontSize: 14, resize: 'vertical' } as React.CSSProperties,
} as const;

export default RelationshipGraph;
