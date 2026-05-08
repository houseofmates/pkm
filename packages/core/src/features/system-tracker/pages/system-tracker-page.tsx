import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import RelationshipGraph from '../components/relationship-graph';
import InnerWorldScenes from '../components/inner-world-scenes';

function SystemTrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = (tabFromUrl === 'relationships' || tabFromUrl === 'inner-world') ? tabFromUrl : 'relationships';
  const [activeTab, setActiveTab] = useState<'relationships' | 'inner-world'>(initialTab);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  const tabStyle = (tab: 'relationships' | 'inner-world'): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: 'none',
    color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    borderBottom: activeTab === tab ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a', color: 'white' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => setActiveTab('relationships')} style={tabStyle('relationships')}>
          relationships
        </button>
        <button onClick={() => setActiveTab('inner-world')} style={tabStyle('inner-world')}>
          inner world
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'relationships' && <RelationshipGraph />}
        {activeTab === 'inner-world' && <InnerWorldScenes />}
      </div>
    </div>
  );
}

export default SystemTrackerPage;