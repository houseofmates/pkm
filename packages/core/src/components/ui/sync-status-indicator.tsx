/**
 * sync status indicator component
 * provides real-time visual feedback for sync operations
 * designed for users with memory difficulties - clear, simple, and informative
 */

import React, { useState, useEffect } from 'react'
import { robustSync } from '@/services/robust-sync.service'
import { autoGitSync } from '@/services/auto-git-sync.service'
import { conflictResolution } from '@/services/conflict-resolution.service'
import { cn } from '@/lib/utils'

interface SyncStatus {
  connected: boolean
  connecting: boolean
  queueSize: number
  lastSync: number
  failedAttempts: number
  conflicts: number
  status: 'connected' | 'connecting' | 'disconnected' | 'degraded'
}

interface GitSyncStatus {
  isRunning: boolean
  lastSync: number
  nextSync: number
  pendingChanges: number
  conflicts: number
  error: string | null
}

interface SyncStatusIndicatorProps {
  className?: string
  showDetails?: boolean
  compact?: boolean
}

export function SyncStatusIndicator({ 
  className, 
  showDetails = false, 
  compact = false 
}: SyncStatusIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    connecting: false,
    queueSize: 0,
    lastSync: 0,
    failedAttempts: 0,
    conflicts: 0,
    status: 'disconnected'
  })

  const [gitStatus, setGitStatus] = useState<GitSyncStatus>({
    isRunning: false,
    lastSync: 0,
    nextSync: 0,
    pendingChanges: 0,
    conflicts: 0,
    error: null
  })

  const [conflictStats, setConflictStats] = useState({
    total: 0,
    resolved: 0,
    recent: 0
  })

  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(robustSync.getSyncStatus())
      setGitStatus(autoGitSync.getStatus())
      setConflictStats(conflictResolution.getStats())
    }

    // initial update
    updateStatus()

    // set up listeners for real-time updates
    const syncInterval = setInterval(updateStatus, 2000)

    // listen for sync events
    const handleSyncEvent = (event: any) => {
      updateStatus()
    }

    robustSync.addEventListener('status-changed', handleSyncEvent)
    autoGitSync.addEventListener('sync-completed', handleSyncEvent)
    conflictResolution.addEventListener('conflict-detected', handleSyncEvent)

    return () => {
      clearInterval(syncInterval)
      robustSync.removeEventListener('status-changed', handleSyncEvent)
      autoGitSync.removeEventListener('sync-completed', handleSyncEvent)
      conflictResolution.removeEventListener('conflict-detected', handleSyncEvent)
    }
  }, [])

  const getStatusColor = () => {
    if (syncStatus.connected && syncStatus.queueSize === 0) return 'text-green-500'
    if (syncStatus.connecting) return 'text-yellow-500'
    if (syncStatus.queueSize > 10) return 'text-orange-500'
    if (!syncStatus.connected) return 'text-red-500'
    return 'text-blue-500'
  }

  const getStatusIcon = () => {
    if (syncStatus.connecting) return '⟳'
    if (!syncStatus.connected) return '⚠'
    if (syncStatus.queueSize > 0) return '⏳'
    if (conflictStats.recent > 0) return '⚡'
    return '✓'
  }

  const getStatusText = () => {
    if (syncStatus.connecting) return 'connecting'
    if (!syncStatus.connected) return 'offline'
    if (syncStatus.queueSize > 0) return `syncing (${syncStatus.queueSize})`
    if (conflictStats.recent > 0) return 'conflicts resolved'
    return 'synced'
  }

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'never'
    const diff = Date.now() - timestamp
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1 text-xs', getStatusColor(), className)}>
        <span className="animate-pulse">{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
      </div>
    )
  }

  return (
    <div className={cn('bg-gray-900 border border-gray-800 rounded-lg p-3', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn('text-lg', getStatusColor())}>
            {syncStatus.connecting ? '⟳' : getStatusIcon()}
          </span>
          <span className="text-white font-medium">sync status</span>
        </div>
        <span className={cn('text-sm', getStatusColor())}>
          {getStatusText()}
        </span>
      </div>

      {showDetails && (
        <div className="space-y-2 text-xs text-gray-400">
          {/* connection status */}
          <div className="flex justify-between">
            <span>connection:</span>
            <span className={cn(syncStatus.connected ? 'text-green-400' : 'text-red-400')}>
              {syncStatus.connected ? 'connected' : 'disconnected'}
            </span>
          </div>

          {/* queue status */}
          <div className="flex justify-between">
            <span>pending:</span>
            <span className={cn(syncStatus.queueSize > 0 ? 'text-yellow-400' : 'text-gray-400')}>
              {syncStatus.queueSize} items
            </span>
          </div>

          {/* last sync */}
          <div className="flex justify-between">
            <span>last sync:</span>
            <span>{formatTime(syncStatus.lastSync)}</span>
          </div>

          {/* git sync status */}
          <div className="flex justify-between">
            <span>auto-git:</span>
            <span className={cn(gitStatus.isRunning ? 'text-green-400' : 'text-gray-400')}>
              {gitStatus.isRunning ? 'active' : 'inactive'}
            </span>
          </div>

          {/* conflicts */}
          {conflictStats.total > 0 && (
            <div className="flex justify-between">
              <span>conflicts:</span>
              <span className={cn(conflictStats.recent > 0 ? 'text-yellow-400' : 'text-gray-400')}>
                {conflictStats.resolved}/{conflictStats.total} resolved
              </span>
            </div>
          )}

          {/* error status */}
          {(syncStatus.failedAttempts > 0 || gitStatus.error) && (
            <div className="flex justify-between text-red-400">
              <span>errors:</span>
              <span>{syncStatus.failedAttempts} attempts</span>
            </div>
          )}
        </div>
      )}

      {/* action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => robustSync.forceSync()}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          disabled={!syncStatus.connected || syncStatus.connecting}
        >
          sync now
        </button>
        
        <button
          onClick={() => autoGitSync.forceSync()}
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          disabled={!gitStatus.isRunning}
        >
          git sync
        </button>

        {conflictStats.total > 0 && (
          <button
            onClick={() => {
              // open conflict resolution dialog
              console.log('open conflict resolution')
            }}
            className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            view conflicts
          </button>
        )}
      </div>
    </div>
  )
}

// hook for using sync status in components
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    connected: false,
    connecting: false,
    queueSize: 0,
    lastSync: 0,
    failedAttempts: 0,
    conflicts: 0,
    status: 'disconnected'
  })

  useEffect(() => {
    const updateStatus = () => {
      setStatus(robustSync.getSyncStatus())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  return status
}

// hook for git sync status
export function useGitSyncStatus() {
  const [status, setStatus] = useState<GitSyncStatus>({
    isRunning: false,
    lastSync: 0,
    nextSync: 0,
    pendingChanges: 0,
    conflicts: 0,
    error: null
  })

  useEffect(() => {
    const updateStatus = () => {
      setStatus(autoGitSync.getStatus())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  return status
}