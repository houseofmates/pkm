import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSystemTracker } from '@/contexts/system-tracker-context';
import { useFronter } from '@/contexts/fronter-context';

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
};

export function RelationshipGraph() {
  const { members } = useFronter();
  const { connections, refreshConnections, createConnection } = useSystemTracker();

  const [selectedNode, setSelectedNode] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newConn, setNewConn] = useState({
    from_id: '', to_id: '', relationship_type: 'friendship', strength: 5, notes: ''
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const fgRef = useRef(null);

  useEffect(() => { refreshConnections(); }, [refreshConnections]);

  const allTypes = useMemo(() => Object.keys(RELATIONSHIP_STYLES), []);

  const graphData = useMemo(() => {
    const connSet = activeFilters.length > 0
      ? connections.filter(c => activeFilters.includes(c.relationship_type))
      : connections;

    const nodes = members.map(h => ({
      id: String(h.id || h.content?.id || ''),
      name: String(h.name || h.content?.name || 'unknown'),
      color: String(h.color || h.content?.color || '#666'),
      val: 5,
    })).filter(n => n.id && n.name !== 'unknown');

    const links = connSet.map(c => ({
      source: String(c.from_headmate || c.from_headmate_id || ''),
      target: String(c.to_headmate || c.to_headmate_id || ''),
      relationship_type: String(c.relationship_type || 'other'),
      strength: Number(c.strength) || 5,
    })).filter(l => l.source && l.target);

    return { nodes, links };
  }, [members, connections, activeFilters]);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    if (!node || node.x == null || node.y == null) return;
    const fontSize = Math.max(8, 10 / (globalScale || 1));
    const size = Math.max(3, 5 / (globalScale || 1));

    ctx.font = `${fontSize}px ui-sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(node.name, node.x, node.y + size + fontSize + 2);

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || '#666';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2 / (globalScale || 1);
    ctx.stroke();
  }, []);

  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    if (!link || !link.source || !link.target) return;
    if (link.source.x == null || link.target.x == null) return;
    const style = RELATIONSHIP_STYLES[link.relationship_type] || RELATIONSHIP_STYLES.other;
    const src = link.source;
    const tgt = link.target;

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width / (globalScale || 1);
    if (style.dash.length > 0 && globalScale > 0) {
      ctx.setLineDash(style.dash.map(d => d / globalScale));
    }
    ctx.globalAlpha = 0.5 + (link.strength || 5) / 25;
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  const handleCreate = async () => {
    if (!newConn.from_id || !newConn.to_id) return;
    try {
      await createConnection({
        from_headmate_id: newConn.from_id,
        to_headmate_id: newConn.to_id,
        relationship_type: newConn.relationship_type,
        strength: newConn.strength,
        is_mutual: false,
        notes: newConn.notes,
      });
      setShowAddDialog(false);
      setNewConn({ from_id: '', to_id: '', relationship_type: 'friendship', strength: 5, notes: '' });
      await refreshConnections();
    } catch (err) {
      // eslint-disable-next-line
      console.error('failed to create connection:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>relationship map</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowFilterDialog(true)} style={styles.btn}>filter</button>
          <button onClick={() => setShowAddDialog(true)} style={styles.btnAccent}>+ add</button>
          <button onClick={() => setSelectedNode(null)} style={styles.btn}>clear</button>
        </div>
      </div>

      <div style={styles.grow}>
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel={node => node.name}
            nodeColor={node => node.color}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={node => setSelectedNode(node)}
            onBackgroundClick={() => setSelectedNode(null)}
            backgroundColor="#0a0a0a"
            warmupTicks={100}
            cooldownTicks={50}
            linkDistance={120}
            chargeStrength={-40}
          />
        ) : (
          <div style={styles.empty}>add headmates and connections to see the map</div>
        )}

        <div style={styles.legend}>
          <h3 style={styles.legendTitle}>relationship types</h3>
          {allTypes.map(type => (
            <div key={type} style={styles.legendRow}>
              <div style={{ width: 24, height: 2, background: RELATIONSHIP_STYLES[type].color, opacity: 0.8 }} />
              <span style={styles.legendText}>{type}</span>
            </div>
          ))}
        </div>

        {selectedNode && (
          <div style={styles.detailPanel}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{selectedNode.name}</h3>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              connections: {graphData.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).length}
            </span>
          </div>
        )}
      </div>

      {showAddDialog && (
        <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowAddDialog(false); }}>
          <div style={styles.dialog}>
            <h3 style={styles.dialogTitle}>add connection</h3>
            <div style={styles.formRow}>
              <label style={styles.label}>from</label>
              <select
                value={newConn.from_id}
                onChange={e => setNewConn(n => ({ ...n, from_id: e.target.value }))}
                style={styles.select}
              >
                <option value="">select headmate</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.content?.name || '?'}</option>
                ))}
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>to</label>
              <select
                value={newConn.to_id}
                onChange={e => setNewConn(n => ({ ...n, to_id: e.target.value }))}
                style={styles.select}
              >
                <option value="">select headmate</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.content?.name || '?'}</option>
                ))}
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>type</label>
              <select
                value={newConn.relationship_type}
                onChange={e => setNewConn(n => ({ ...n, relationship_type: e.target.value }))}
                style={styles.select}
              >
                {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>strength: {newConn.strength}</label>
              <input
                type="range" min={1} max={10} step={1}
                value={newConn.strength}
                onChange={e => setNewConn(n => ({ ...n, strength: parseInt(e.target.value, 10) }))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>notes</label>
              <textarea
                value={newConn.notes}
                onChange={e => setNewConn(n => ({ ...n, notes: e.target.value }))}
                style={styles.textarea}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowAddDialog(false)} style={styles.btn}>cancel</button>
              <button onClick={handleCreate} style={styles.btnAccent}>add</button>
            </div>
          </div>
        </div>
      )}

      {showFilterDialog && (
        <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowFilterDialog(false); }}>
          <div style={styles.dialog}>
            <h3 style={styles.dialogTitle}>filter by type</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {allTypes.map(type => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={activeFilters.includes(type)}
                    onChange={() => setActiveFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                    style={{ accentColor: 'white' }}
                  />
                  <div style={{ width: 16, height: 2, background: RELATIONSHIP_STYLES[type].color }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{type}</span>
                </label>
              ))}
              <button
                onClick={() => setActiveFilters([])}
                style={{ ...styles.btn, marginTop: 8 }}
              >clear all</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a' },
  header: { height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#111' },
  title: { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: 0 },
  btn: { padding: '4px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' },
  btnAccent: { padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, cursor: 'pointer' },
  grow: { flex: 1, position: 'relative', overflow: 'hidden' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  legend: { position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, maxWidth: 200 },
  legendTitle: { fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  legendText: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  detailPanel: { position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 16, width: 260 },
  overlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' },
  dialog: { width: 400, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 24 },
  dialogTitle: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 },
  formRow: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  select: { width: '100%', padding: 8, background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', fontSize: 14 },
  textarea: { width: '100%', height: 80, padding: 8, background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', fontSize: 14, resize: 'vertical' },
};

export default RelationshipGraph;
