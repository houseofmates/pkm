/**
 * recovery dashboard component
 * provides visual feedback about auto-save status, recovery operations, and system health
 * designed to be calming and reassuring for users with memory difficulties
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Database, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Shield,
  Activity
} from 'lucide-react'
import { autoSaveService } from '@/services/auto-save.service'
import { offlineQueueService } from '@/services/offline-queue.service'
import { useSocketState } from '@/hooks/use-socket'

interface RecoveryStats {
  pendingSaves: number
  lastSave: number
  isSaving: boolean
  recoveryAttempts: number
}

interface SyncStats {
  total: number
  byType: Record<string, number>
  overdue: number
  failed: number
}

export function RecoveryDashboard() {
  const [recoveryStats, setRecoveryStats] = useState<RecoveryStats>({
    pendingSaves: 0,
    lastSave: 0,
    isSaving: false,
    recoveryAttempts: 0
  })
  
  const [syncStats, setSyncStats] = useState<SyncStats>({
    total: 0,
    byType: {},
    overdue: 0,
    failed: 0
  })
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  
  const { status: socketStatus } = useSocketState()

  useEffect(() => {
    const updateStats = () => {
      try {
        const autoSaveStats = autoSaveService.getStats()
        setRecoveryStats(autoSaveStats)
        
        // Get sync stats if available
        offlineQueueService.getStats().then(stats => {
          setSyncStats(stats)
        }).catch(() => {
          // Service might not be available
        })
      } catch (error) {
        console.error('Failed to update stats:', error)
      }
    }

    updateStats()
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds
    
    return () => clearInterval(interval)
  }, [])

  const handleForceSave = async () => {
    setIsRefreshing(true)
    try {
      await autoSaveService.forceSave()
      setLastRefresh(Date.now())
    } catch (error) {
      console.error('Force save failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'just now'
    if (diff < 120000) return '1 minute ago'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
    if (diff < 7200000) return '1 hour ago'
    return `${Math.floor(diff / 3600000)} hours ago`
  }

  const getHealthStatus = () => {
    const issues = []
    
    if (recoveryStats.pendingSaves > 10) {
      issues.push('Many pending saves')
    }
    
    if (syncStats.failed > 0) {
      issues.push('Failed sync operations')
    }
    
    if (socketStatus !== 'connected') {
      issues.push('Disconnected from server')
    }
    
    if (recoveryStats.recoveryAttempts > 0) {
      issues.push('Recent recovery attempts')
    }
    
    if (issues.length === 0) {
      return { status: 'healthy', message: 'All systems operating normally', color: 'green' }
    } else if (issues.length <= 2) {
      return { status: 'warning', message: issues.join(', '), color: 'yellow' }
    } else {
      return { status: 'critical', message: 'Multiple issues detected', color: 'red' }
    }
  }

  const healthStatus = getHealthStatus()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Overall Health Status */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Overall status of your PKM system's safety and reliability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full bg-${healthStatus.color}-500`} />
            <span className="font-medium capitalize">{healthStatus.status}</span>
            <span className="text-sm text-gray-600">{healthStatus.message}</span>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Save Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Auto-Save Status
          </CardTitle>
          <CardDescription>
            Your work is being saved automatically every 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{recoveryStats.pendingSaves}</div>
              <div className="text-sm text-gray-600">Pending Saves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {recoveryStats.lastSave > 0 ? formatTimeAgo(recoveryStats.lastSave) : 'Never'}
              </div>
              <div className="text-sm text-gray-600">Last Save</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {recoveryStats.isSaving ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{recoveryStats.recoveryAttempts}</div>
              <div className="text-sm text-gray-600">Recovery Attempts</div>
            </div>
          </div>
          
          {recoveryStats.pendingSaves > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Save Progress</span>
                <span>{recoveryStats.pendingSaves} items</span>
              </div>
              <Progress value={Math.max(0, 100 - recoveryStats.pendingSaves * 10)} className="h-2" />
            </div>
          )}
          
          <Button 
            onClick={handleForceSave} 
            disabled={isRefreshing}
            className="w-full"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Save Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {socketStatus === 'connected' ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Sync Status
          </CardTitle>
          <CardDescription>
            Synchronization with server and cloud storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={socketStatus === 'connected' ? 'default' : 'destructive'}>
              {socketStatus}
            </Badge>
            <span className="text-sm text-gray-600">
              {socketStatus === 'connected' ? 'Connected to server' : 'Disconnected from server'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStats.total}</div>
              <div className="text-sm text-gray-600">Total Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{syncStats.overdue}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{syncStats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {syncStats.total - syncStats.overdue - syncStats.failed}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
          </div>
          
          {Object.keys(syncStats.byType).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Operations by Type</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(syncStats.byType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="capitalize">{type}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reassurance Message */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Your data is safe.</strong> The PKM system automatically saves your work every 30 seconds 
          and can recover from crashes or browser closures. Even if you lose connection, your work is 
          stored locally and will sync when you're back online.
        </AlertDescription>
      </Alert>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {formatTimeAgo(lastRefresh)}
      </div>
    </div>
  )
}