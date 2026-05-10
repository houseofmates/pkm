/**
 * conflict resolution service with visual notifications and diff viewing
 * implements last-write-wins strategy with user awareness
 */

import { secureLogger } from '@/lib/secure-logger'

interface ConflictData {
  itemId: string
  type: 'canvas' | 'headmates' | 'system'
  localVersion: any
  remoteVersion: any
  timestamp: number
  resolved: boolean
  resolutionStrategy: 'last-write-wins' | 'manual'
  resolvedAt?: number
}

interface ConflictNotification {
  id: string
  type: 'conflict'
  data: ConflictData
  message: string
  severity: 'info' | 'warning' | 'error'
  actions: Array<{
    label: string
    action: string
    primary?: boolean
  }>
}

class ConflictResolutionService {
  private conflicts: Map<string, ConflictData> = new Map()
  private notifications: ConflictNotification[] = []
  private eventListeners: Map<string, Function[]> = new Map()

  /**
   * detect and resolve conflicts between local and remote versions
   */
  async resolveConflict(
    itemId: string,
    type: ConflictData['type'],
    localVersion: any,
    remoteVersion: any
  ): Promise<ConflictData> {
    const conflict: ConflictData = {
      itemId,
      type,
      localVersion,
      remoteVersion,
      timestamp: Date.now(),
      resolved: false,
      resolutionStrategy: 'last-write-wins'
    }

    // detect if there's actually a conflict
    if (!this.hasActualConflict(localVersion, remoteVersion)) {
      conflict.resolved = true
      conflict.resolvedAt = Date.now()
      return conflict
    }

    // store conflict for tracking
    this.conflicts.set(itemId, conflict)

    // apply last-write-wins strategy
    const resolvedVersion = this.applyLastWriteWins(localVersion, remoteVersion)
    conflict.resolved = true
    conflict.resolvedAt = Date.now()

    // create notification for user
    this.createConflictNotification(conflict)

    // emit events for UI updates
    this.emitEvent('conflict-detected', conflict)
    this.emitEvent('conflict-resolved', { ...conflict, resolvedVersion })

    secureLogger.info(`[ConflictResolution] resolved conflict for ${itemId} using last-write-wins`)

    return conflict
  }

  /**
   * check if there's an actual conflict between versions
   */
  private hasActualConflict(local: any, remote: any): boolean {
    // simple timestamp comparison for most cases
    const localTime = this.extractTimestamp(local)
    const remoteTime = this.extractTimestamp(remote)

    // if timestamps are the same, no conflict
    if (localTime === remoteTime) return false

    // if one version is much newer, it's not really a conflict
    const timeDiff = Math.abs(localTime - remoteTime)
    if (timeDiff > 60000) return false // more than 1 minute difference

    // otherwise, treat as conflict
    return true
  }

  /**
   * extract timestamp from version data
   */
  private extractTimestamp(data: any): number {
    if (data?.timestamp) return data.timestamp
    if (data?.updatedAt) return new Date(data.updatedAt).getTime()
    if (data?.createdAt) return new Date(data.createdAt).getTime()
    return Date.now()
  }

  /**
   * apply last-write-wins strategy
   */
  private applyLastWriteWins(local: any, remote: any): any {
    const localTime = this.extractTimestamp(local)
    const remoteTime = this.extractTimestamp(remote)

    return localTime > remoteTime ? local : remote
  }

  /**
   * create visual notification for conflict
   */
  private createConflictNotification(conflict: ConflictData): void {
    const notification: ConflictNotification = {
      id: `conflict-${conflict.itemId}`,
      type: 'conflict',
      data: conflict,
      message: `Conflict resolved automatically for ${conflict.type} "${conflict.itemId}"`,
      severity: 'info',
      actions: [
        {
          label: 'view diff',
          action: 'view-diff',
          primary: false
        },
        {
          label: 'dismiss',
          action: 'dismiss',
          primary: true
        }
      ]
    }

    this.notifications.push(notification)
    this.emitEvent('notification', notification)

    // auto-dismiss after 10 seconds
    setTimeout(() => {
      this.dismissNotification(notification.id)
    }, 10000)
  }

  /**
   * get diff between two versions for viewing
   */
  getDiff(itemId: string): {
    local: any
    remote: any
    diff: Array<{
      path: string
      type: 'added' | 'removed' | 'modified'
      localValue?: any
      remoteValue?: any
    }>
  } | null {
    const conflict = this.conflicts.get(itemId)
    if (!conflict) return null

    return {
      local: conflict.localVersion,
      remote: conflict.remoteVersion,
      diff: this.calculateDiff(conflict.localVersion, conflict.remoteVersion)
    }
  }

  /**
   * calculate simple diff between objects
   */
  private calculateDiff(local: any, remote: any): Array<{
    path: string
    type: 'added' | 'removed' | 'modified'
    localValue?: any
    remoteValue?: any
  }> {
    const diff: Array<{
      path: string
      type: 'added' | 'removed' | 'modified'
      localValue?: any
      remoteValue?: any
    }> = []

    const compareObjects = (obj1: any, obj2: any, path = ''): void => {
      const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})])

      for (const key of keys) {
        const currentPath = path ? `${path}.${key}` : key
        const localValue = obj1?.[key]
        const remoteValue = obj2?.[key]

        if (localValue === undefined && remoteValue !== undefined) {
          diff.push({
            path: currentPath,
            type: 'added',
            remoteValue
          })
        } else if (localValue !== undefined && remoteValue === undefined) {
          diff.push({
            path: currentPath,
            type: 'removed',
            localValue
          })
        } else if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
          if (typeof localValue === 'object' && typeof remoteValue === 'object') {
            compareObjects(localValue, remoteValue, currentPath)
          } else {
            diff.push({
              path: currentPath,
              type: 'modified',
              localValue,
              remoteValue
            })
          }
        }
      }
    }

    compareObjects(local, remote)
    return diff
  }

  /**
   * get all conflicts
   */
  getConflicts(): ConflictData[] {
    return Array.from(this.conflicts.values())
  }

  /**
   * get active notifications
   */
  getNotifications(): ConflictNotification[] {
    return this.notifications.filter(n => !this.isNotificationDismissed(n.id))
  }

  /**
   * dismiss notification
   */
  dismissNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId)
    if (index !== -1) {
      this.notifications.splice(index, 1)
      this.emitEvent('notification-dismissed', { notificationId })
    }
  }

  /**
   * check if notification is dismissed
   */
  private isNotificationDismissed(notificationId: string): boolean {
    return !this.notifications.some(n => n.id === notificationId)
  }

  /**
   * add event listener
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * remove event listener
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * emit event to listeners
   */
  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          secureLogger.error(`[ConflictResolution] event listener error:`, error)
        }
      })
    }
  }

  /**
   * clear old conflicts
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge
    let removed = 0

    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.timestamp < cutoff) {
        this.conflicts.delete(id)
        removed++
      }
    }

    // also clean up old notifications
    this.notifications = this.notifications.filter(n =>
      n.data.timestamp > cutoff && !this.isNotificationDismissed(n.id)
    )

    secureLogger.info(`[ConflictResolution] cleaned up ${removed} old conflicts`)
    return removed
  }

  /**
   * get conflict statistics
   */
  getStats(): {
    total: number
    resolved: number
    byType: Record<string, number>
    recent: number
  } {
    const conflicts = Array.from(this.conflicts.values())

    return {
      total: conflicts.length,
      resolved: conflicts.filter(c => c.resolved).length,
      byType: conflicts.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recent: conflicts.filter(c => Date.now() - c.timestamp < 60000).length
    }
  }
}

export const conflictResolution = new ConflictResolutionService()