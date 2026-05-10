import React from 'react';
import { useSocketState } from '@/hooks/use-socket';
import { useSystemStatus } from '@/hooks/use-system-status';
import { useOfflineStatus } from '@/services/offline-service';

const STATUS_DOT_SIZE = 8;

function StatusDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: STATUS_DOT_SIZE,
        height: STATUS_DOT_SIZE,
        borderRadius: '50%',
        backgroundColor: color,
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

function StatusItem({ label, color, value }: { label: string; color: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
      <StatusDot color={color} />
      <span style={{ opacity: 0.7 }}>{label}:</span>
      <span style={{ marginLeft: 4, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function SyncStatusBar() {
  const { status: socketStatus, retryCount, lastPingMs } = useSocketState();
  const { backendOnline, latencyMs } = useSystemStatus();
  const { pendingChanges, deadLetterCount } = useOfflineStatus();

  // git sync status from .sync-status.json if available
  const [gitStatus, setGitStatus] = React.useState<string>('unknown');

  React.useEffect(() => {
    let cancelled = false;
    async function fetchGitStatus() {
      try {
        const res = await fetch('/.sync-status.json', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data && data.status) {
          setGitStatus(data.status);
        }
      } catch {
        // ignore - file may not be served
      }
    }
    fetchGitStatus();
    const interval = setInterval(fetchGitStatus, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const socketColor =
    socketStatus === 'connected'
      ? '#22c55e'
      : socketStatus === 'reconnecting'
        ? '#eab308'
        : '#ef4444';

  const backendColor = backendOnline ? '#22c55e' : '#ef4444';

  const gitColor =
    gitStatus === 'synced'
      ? '#22c55e'
      : gitStatus === 'conflict'
        ? '#ef4444'
        : gitStatus === 'error'
          ? '#f97316'
          : '#9ca3af';

  const socketText =
    socketStatus === 'connected'
      ? `connected ${lastPingMs > 0 ? `(${lastPingMs}ms)` : ''}`
      : socketStatus === 'reconnecting'
        ? `reconnecting (#${retryCount})`
        : 'disconnected';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        backgroundColor: '#0a0a0a',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        fontFamily: '"Varela Round", sans-serif',
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        zIndex: 9999,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <StatusItem label="ws" color={socketColor} value={socketText} />
      <StatusItem label="backend" color={backendColor} value={backendOnline ? `online ${latencyMs > 0 ? `(${latencyMs}ms)` : ''}` : 'offline'} />
      <StatusItem label="git" color={gitColor} value={gitStatus} />
      {pendingChanges > 0 && (
        <StatusItem label="pending" color="#f6b012" value={`${pendingChanges}`} />
      )}
      {deadLetterCount > 0 && (
        <StatusItem label="dead" color="#ef4444" value={`${deadLetterCount}`} />
      )}
    </div>
  );
}
