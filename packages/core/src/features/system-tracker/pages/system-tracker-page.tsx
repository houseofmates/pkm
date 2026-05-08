import React, { useState } from 'react';
import RelationshipGraph from '../components/relationship-graph';
import InnerWorldScenes from '../components/inner-world-scenes';
function SystemTrackerPage() {
  const [activeTab, setActiveTab] = useState('relationships');
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a', color: 'white' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => setActiveTab('relationships')} style={{ padding: '0.5rem 1rem', background: activeTab === 'relationships' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'relationships' ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>relationships</button>
        <button onClick={() => setActiveTab('inner-world')} style={{ padding: '0.5rem 1rem', background: activeTab === 'inner-world' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'inner-world' ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>inner world</button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'relationships' && <RelationshipGraph />}
        {activeTab === 'inner-world' && <InnerWorldScenes />}
      </div>
    </div>
  );
}
export default SystemTrackerPage;