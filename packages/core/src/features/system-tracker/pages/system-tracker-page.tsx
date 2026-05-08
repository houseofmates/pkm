import React, { useState } from 'react';
import RelationshipGraph from '../components/relationship-graph';
import InnerWorldScenes from '../components/inner-world-scenes';

function SystemTrackerPage() {
  const [activeTab, setActiveTab] = useState('relationships');

  const tabStyle = (tab: string) => ({
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: 'none',
    color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '0.875rem',
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a', color: 'white' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => setActiveTab('relationships')} style={tabStyle('relationships')}>relationships</button>
        <button onClick={() => setActiveTab('inner-world')} style={tabStyle('inner-world')}>inner world</button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'relationships' && <RelationshipGraph />}
        {activeTab === 'inner-world' && <InnerWorldScenes />}
      </div>
    </div>
  );
}

export default SystemTrackerPage;
