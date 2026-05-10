import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a', color: 'white', position: 'relative' }}>
      {/* subtle animated gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 20% 30%, rgba(246,176,18,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(100,80,200,0.03) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 60% 40%, rgba(246,176,18,0.02) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => setActiveTab('relationships')}
          style={tabStyle(activeTab === 'relationships')}
          className="lowercase"
        >
          relationships
        </button>
        <button
          onClick={() => setActiveTab('inner-world')}
          style={tabStyle(activeTab === 'inner-world')}
          className="lowercase"
        >
          inner world
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'relationships' && (
            <motion.div
              key="relationships"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', height: '100%' }}
            >
              <RelationshipGraph />
            </motion.div>
          )}
          {activeTab === 'inner-world' && (
            <motion.div
              key="inner-world"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', height: '100%' }}
            >
              <InnerWorldScenes />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '0.5rem 1rem',
  background: 'transparent',
  border: 'none',
  color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  borderBottom: isActive ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
  transition: 'color 0.2s ease',
});

export default SystemTrackerPage;
