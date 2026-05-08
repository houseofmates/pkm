import React, { useEffect } from 'react';
import { useSystemTracker, type Scene } from '@/contexts/system-tracker-context';

export function InnerWorldScenes() {
  const { scenes, refreshScenes, loading } = useSystemTracker();

  useEffect(() => {
    refreshScenes();
  }, [refreshScenes]);

  return (
    <div style={{ padding: '1rem', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>inner world</h2>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>loading scenes...</span>
        </div>
      ) : scenes.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            no inner world scenes yet — create one from the scenes panel
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {scenes.map((scene: Scene) => (
            <div
              key={scene.id}
              style={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {scene.image_url ? (
                <img
                  src={scene.image_url}
                  alt={scene.name}
                  style={{ width: '100%', height: 160, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: 160, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>no image</span>
                </div>
              )}
              <div style={{ padding: '0.75rem' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{scene.name}</h3>
                {scene.description && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{scene.description}</p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {scene.location_type && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                      {scene.location_type}
                    </span>
                  )}
                  {scene.atmosphere && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                      {scene.atmosphere}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InnerWorldScenes;
