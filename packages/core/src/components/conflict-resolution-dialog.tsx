/**
 * conflict resolution dialog
 * provides visual interface for resolving sync conflicts
 * shows last-write-wins auto-resolution with option to override
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { secureLogger } from '@/lib/secure-logger'
import { offlineQueueService } from '@/services/offline-queue.service'

interface Conflict {
  id: string
  operationId: string
  type: string
  clientData: any
  serverData: any
  timestamp: number
  resolution: string
}

interface ConflictResolutionDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ConflictResolutionDialog({ isOpen, onClose }: ConflictResolutionDialogProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadConflicts()
    }
  }, [isOpen])

  useEffect(() => {
    // Listen for conflict resolution events
    const handleConflictResolved = (event: CustomEvent) => {
      const { conflictId, resolution, type } = event.detail
      toast.success(`Conflict auto-resolved: ${type} (${resolution})`)
      loadConflicts() // Refresh the list
    }

    window.addEventListener('pkm:conflict-resolved', handleConflictResolved as EventListener)
    return () => {
      window.removeEventListener('pkm:conflict-resolved', handleConflictResolved as EventListener)
    }
  }, [])

  const loadConflicts = async () => {
    setLoading(true)
    try {
      const pendingConflicts = await offlineQueueService.getPendingConflicts()
      setConflicts(pendingConflicts)
    } catch (error) {
      secureLogger.error('[ConflictDialog] Failed to load conflicts:', error)
      toast.error('Failed to load conflicts')
    } finally {
      setLoading(false)
    }
  }

  const handleResolveConflict = async (conflictId: string, resolution: 'client_wins' | 'server_wins') => {
    setResolving(conflictId)
    try {
      await offlineQueueService.resolveConflict(conflictId, resolution)
      toast.success(`Conflict resolved with ${resolution}`)
      await loadConflicts()
    } catch (error) {
      secureLogger.error('[ConflictDialog] Failed to resolve conflict:', error)
      toast.error('Failed to resolve conflict')
    } finally {
      setResolving(null)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const renderDataDiff = (clientData: any, serverData: any) => {
    const clientJson = JSON.stringify(clientData, null, 2)
    const serverJson = JSON.stringify(serverData, null, 2)

    return (
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <h4 className="font-semibold text-blue-600 mb-2">Your Version</h4>
          <pre className="bg-blue-50 p-2 rounded overflow-auto max-h-32 text-blue-900">
            {clientJson}
          </pre>
        </div>
        <div>
          <h4 className="font-semibold text-orange-600 mb-2">Server Version</h4>
          <pre className="bg-orange-50 p-2 rounded overflow-auto max-h-32 text-orange-900">
            {serverJson}
          </pre>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⚠️</span>
            Sync Conflicts
          </CardTitle>
          <CardDescription>
            Resolve conflicts between your local changes and server data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading conflicts...</div>
          ) : conflicts.length === 0 ? (
            <Alert>
              <AlertDescription>
                No pending conflicts found. All conflicts have been auto-resolved.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertDescription>
                  {conflicts.length} conflict(s) found. Most are auto-resolved with "last-write-wins" (server wins).
                </AlertDescription>
              </Alert>
              
              {conflicts.map((conflict) => (
                <Card key={conflict.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{conflict.type}</Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(conflict.timestamp)}
                        </span>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderDataDiff(conflict.clientData, conflict.serverData)}
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveConflict(conflict.id, 'client_wins')}
                        disabled={resolving === conflict.id}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {resolving === conflict.id ? 'Resolving...' : 'Keep Your Version'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveConflict(conflict.id, 'server_wins')}
                        disabled={resolving === conflict.id}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        {resolving === conflict.id ? 'Resolving...' : 'Keep Server Version'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook to show conflict dialog when needed
export function useConflictResolution() {
  const [isOpen, setIsOpen] = useState(false)

  const showConflictDialog = () => setIsOpen(true)
  const hideConflictDialog = () => setIsOpen(false)

  return {
    ConflictResolutionDialog: () => (
      <ConflictResolutionDialog isOpen={isOpen} onClose={hideConflictDialog} />
    ),
    showConflictDialog,
    hideConflictDialog
  }
}