import React, { useEffect, useState } from 'react';
import { useSocketState } from '@/hooks/use-socket';
import { gitSyncService, type GitSyncStatus } from '@/services/git-sync.service';
import { offlineQueueService } from '@/services/offline-queue.service';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  RefreshCwOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  GitBranch,
  Database
} from 'lucide-react';

interface SyncStatusPanelProps {
  className?: string;
}

export function SyncStatusPanel({ className = '' }: SyncStatusPanelProps) {
  const { status: socketStatus, lastPingMs, retryCount } = useSocketState();
  const [gitStatus, setGitStatus] = useState<GitSyncStatus | null>(null);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    // Subscribe to git sync status
    const unsubscribe = gitSyncService.subscribe(setGitStatus);

    // Initial status check
    gitSyncService.checkStatus();

    // Update queue size periodically
    const updateQueueSize = async () => {
      try {
        const size = await offlineQueueService.getQueueSize();
        setQueueSize(size);
      } catch (error) {
        console.error('Failed to get queue size:', error);
      }
    };

    updateQueueSize();
    const queueInterval = setInterval(updateQueueSize, 5000);

    return () => {
      unsubscribe();
      clearInterval(queueInterval);
    };
  }, []);

  const getConnectionIcon = () => {
    switch (socketStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'reconnecting':
        return <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'connecting':
        return <Wifi className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getGitIcon = () => {
    if (!gitStatus) return <GitBranch className="w-4 h-4 text-gray-500" />;

    switch (gitStatus.status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'idle':
        return gitStatus.pendingChanges > 0
          ? <RefreshCw className="w-4 h-4 text-yellow-500" />
          : <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'conflict':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <RefreshCwOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-300 mb-3">Sync Status</h3>

      {/* WebSocket Connection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getConnectionIcon()}
          <span className="text-sm text-gray-400">Connection</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 capitalize">{socketStatus}</div>
          {socketStatus === 'connected' && lastPingMs > 0 && (
            <div className="text-xs text-gray-600">{lastPingMs}ms</div>
          )}
          {socketStatus === 'reconnecting' && retryCount > 0 && (
            <div className="text-xs text-gray-600">Attempt {retryCount}</div>
          )}
        </div>
      </div>

      {/* Git Sync */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getGitIcon()}
          <span className="text-sm text-gray-400">Git Sync</span>
        </div>
        <div className="text-right">
          {gitStatus && (
            <>
              <div className="text-xs text-gray-500 capitalize">{gitStatus.status}</div>
              {gitStatus.pendingChanges > 0 && (
                <div className="text-xs text-yellow-600">{gitStatus.pendingChanges} pending</div>
              )}
              {gitStatus.conflicts.length > 0 && (
                <div className="text-xs text-red-600">{gitStatus.conflicts.length} conflicts</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Offline Queue */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Offline Queue</span>
        </div>
        <div className="text-xs text-gray-500">
          {queueSize} operations
        </div>
      </div>

      {/* Last Sync Times */}
      {gitStatus && (gitStatus.lastSync > 0 || gitStatus.lastPull > 0 || gitStatus.lastPush > 0) && (
        <div className="border-t border-gray-800 pt-3 space-y-1">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>Last sync: {gitStatus.lastSync > 0 ? formatTimeAgo(gitStatus.lastSync) : 'Never'}</span>
          </div>
          {gitStatus.lastPull > 0 && (
            <div className="flex items-center space-x-2 text-xs text-gray-600 ml-5">
              <span>Pull: {formatTimeAgo(gitStatus.lastPull)}</span>
            </div>
          )}
          {gitStatus.lastPush > 0 && (
            <div className="flex items-center space-x-2 text-xs text-gray-600 ml-5">
              <span>Push: {formatTimeAgo(gitStatus.lastPush)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-gray-800 pt-3 flex space-x-2">
        <button
          onClick={() => gitSyncService.triggerSync()}
          className="flex-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
          disabled={!gitStatus || gitStatus.status === 'syncing'}
        >
          Sync Now
        </button>
        <button
          onClick={() => gitSyncService.checkStatus()}
          className="flex-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}