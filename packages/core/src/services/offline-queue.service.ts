/**
 * sqlite-based offline queue for bulletproof data persistence
 * ensures no changes are ever lost even if connection drops completely
 */

import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { secureLogger } from '@/lib/secure-logger'

interface QueueItem {
  id: string
  type: 'canvas' | 'headmates' | 'system'
  payload: string
  timestamp: number
  retries: number
  maxRetries: number
  nextRetryAt: number
  priority: number
  createdAt: string
  updatedAt: string
}

class OfflineQueueService {
  private db: any = null
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.db = await open({
        filename: './offline-queue.db',
        driver: sqlite3.Database
      })

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS queue_items (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          retries INTEGER DEFAULT 0,
          maxRetries INTEGER DEFAULT 10,
          nextRetryAt INTEGER NOT NULL,
          priority INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS conflicts (
          id TEXT PRIMARY KEY,
          operationId TEXT NOT NULL,
          type TEXT NOT NULL,
          clientData TEXT NOT NULL,
          serverData TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          resolution TEXT DEFAULT 'pending',
          resolvedAt INTEGER,
          resolvedData TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_queue_type ON queue_items(type);
        CREATE INDEX IF NOT EXISTS idx_queue_retry ON queue_items(nextRetryAt);
        CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_items(priority DESC, timestamp);
        CREATE INDEX IF NOT EXISTS idx_conflicts_resolution ON conflicts(resolution);
        CREATE INDEX IF NOT EXISTS idx_conflicts_timestamp ON conflicts(timestamp);
      `)

      this.isInitialized = true
      secureLogger.info('[OfflineQueue] initialized successfully')
    } catch (error) {
      secureLogger.error('[OfflineQueue] initialization failed:', error)
      throw error
    }
  }

  async enqueue(type: QueueItem['type'], payload: any, priority = 0): Promise<string> {
    await this.ensureInitialized()

    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const now = new Date().toISOString()

    try {
      await this.db.run(
        `INSERT INTO queue_items 
         (id, type, payload, timestamp, retries, maxRetries, nextRetryAt, priority, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          type,
          JSON.stringify(payload),
          Date.now(),
          0,
          10,
          Date.now(),
          priority,
          now,
          now
        ]
      )

      secureLogger.debug(`[OfflineQueue] enqueued item ${id} of type ${type}`)
      return id
    } catch (error) {
      secureLogger.error(`[OfflineQueue] failed to enqueue item ${id}:`, error)
      throw error
    }
  }

  async dequeue(limit = 50): Promise<QueueItem[]> {
    await this.ensureInitialized()

    try {
      const items = await this.db.all(
        `SELECT * FROM queue_items 
         WHERE nextRetryAt <= ? 
         ORDER BY priority DESC, timestamp ASC 
         LIMIT ?`,
        [Date.now(), limit]
      )

      return items.map(item => ({
        ...item,
        payload: JSON.parse(item.payload)
      }))
    } catch (error) {
      secureLogger.error('[OfflineQueue] failed to dequeue items:', error)
      return []
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureInitialized()

    try {
      const result = await this.db.run('DELETE FROM queue_items WHERE id = ?', [id])

      if (result.changes === 0) {
        secureLogger.warn(`[OfflineQueue] item ${id} not found for removal`)
      } else {
        secureLogger.debug(`[OfflineQueue] removed item ${id}`)
      }
    } catch (error) {
      secureLogger.error(`[OfflineQueue] failed to remove item ${id}:`, error)
      throw error
    }
  }

  async updateRetry(id: string, retries: number, nextRetryAt: number): Promise<void> {
    await this.ensureInitialized()

    try {
      const result = await this.db.run(
        `UPDATE queue_items 
         SET retries = ?, nextRetryAt = ?, updatedAt = ? 
         WHERE id = ?`,
        [retries, nextRetryAt, new Date().toISOString(), id]
      )

      if (result.changes === 0) {
        secureLogger.warn(`[OfflineQueue] item ${id} not found for retry update`)
      }
    } catch (error) {
      secureLogger.error(`[OfflineQueue] failed to update retry for item ${id}:`, error)
      throw error
    }
  }

  async getStats(): Promise<{
    total: number
    byType: Record<string, number>
    overdue: number
    failed: number
  }> {
    await this.ensureInitialized()

    try {
      const total = await this.db.get('SELECT COUNT(*) as count FROM queue_items')

      const byType = await this.db.all(
        'SELECT type, COUNT(*) as count FROM queue_items GROUP BY type'
      )
      const byTypeMap = byType.reduce((acc, row) => {
        acc[row.type] = row.count
        return acc
      }, {} as Record<string, number>)

      const overdue = await this.db.get(
        'SELECT COUNT(*) as count FROM queue_items WHERE nextRetryAt <= ? AND retries > 5',
        [Date.now()]
      )

      const failed = await this.db.get(
        'SELECT COUNT(*) as count FROM queue_items WHERE retries >= maxRetries'
      )

      return {
        total: total.count,
        byType: byTypeMap,
        overdue: overdue.count,
        failed: failed.count
      }
    } catch (error) {
      secureLogger.error('[OfflineQueue] failed to get stats:', error)
      return { total: 0, byType: {}, overdue: 0, failed: 0 }
    }
  }

  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.ensureInitialized()

    try {
      const cutoff = Date.now() - maxAge
      const result = await this.db.run(
        'DELETE FROM queue_items WHERE timestamp < ? AND retries >= maxRetries',
        [cutoff]
      )

      secureLogger.info(`[OfflineQueue] cleaned up ${result.changes} old items`)
      return result.changes
    } catch (error) {
      secureLogger.error('[OfflineQueue] cleanup failed:', error)
      return 0
    }
  }

  async peek(type?: string, limit = 10): Promise<QueueItem[]> {
    await this.ensureInitialized()

    try {
      let query = `SELECT * FROM queue_items`
      const params: any[] = []

      if (type) {
        query += ' WHERE type = ?'
        params.push(type)
      }

      query += ' ORDER BY priority DESC, timestamp ASC LIMIT ?'
      params.push(limit)

      const items = await this.db.all(query, params)

      return items.map(item => ({
        ...item,
        payload: JSON.parse(item.payload)
      }))
    } catch (error) {
      secureLogger.error('[OfflineQueue] failed to peek items:', error)
      return []
    }
  }

  async clear(): Promise<void> {
    await this.ensureInitialized()

    try {
      await this.db.run('DELETE FROM queue_items')
      secureLogger.info('[OfflineQueue] cleared all items')
    } catch (error) {
      secureLogger.error('[OfflineQueue] failed to clear items:', error)
      throw error
    }
  }

  async vacuum(): Promise<void> {
    await this.ensureInitialized()

    try {
      await this.db.exec('VACUUM')
      secureLogger.info('[OfflineQueue] vacuumed database')
    } catch (error) {
      secureLogger.error('[OfflineQueue] vacuum failed:', error)
      throw error
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
      this.isInitialized = false
      secureLogger.info('[OfflineQueue] closed database connection')
    }
  }

  // Conflict resolution methods
  async detectConflict(operation: any, serverResponse: any): Promise<boolean> {
    await this.ensureInitialized()

    try {
      // Check if server response indicates a conflict
      if (serverResponse?.conflict || serverResponse?.versionMismatch) {
        return true
      }

      // For canvas operations, check version conflicts
      if (operation.type === 'canvas' && serverResponse?.serverVersion) {
        const clientVersion = operation.payload.version || 0
        if (clientVersion < serverResponse.serverVersion) {
          secureLogger.warn(`[OfflineQueue] Version conflict detected: client=${clientVersion}, server=${serverResponse.serverVersion}`)
          return true
        }
      }

      return false
    } catch (error) {
      secureLogger.error('[OfflineQueue] Conflict detection failed:', error)
      return false
    }
  }

  async handleConflict(operation: any, serverResponse: any): Promise<{
    resolution: 'resolved' | 'failed' | 'manual_required'
    resolvedData?: any
    conflictInfo?: any
  }> {
    await this.ensureInitialized()

    try {
      // Last-write-wins strategy with user notification
      const serverData = serverResponse?.serverData || serverResponse
      const clientData = operation.payload

      // Create conflict record for UI notification
      const conflictRecord = {
        id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        operationId: operation.id,
        type: operation.type,
        clientData,
        serverData,
        timestamp: Date.now(),
        resolution: 'pending'
      }

      // Store conflict for UI display
      await this.db.run(
        `INSERT INTO conflicts (id, operationId, type, clientData, serverData, timestamp, resolution)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          conflictRecord.id,
          conflictRecord.operationId,
          conflictRecord.type,
          JSON.stringify(conflictRecord.clientData),
          JSON.stringify(conflictRecord.serverData),
          conflictRecord.timestamp,
          conflictRecord.resolution
        ]
      )

      // Apply last-write-wins resolution (server wins)
      secureLogger.info(`[OfflineQueue] Auto-resolving conflict with last-write-wins: ${conflictRecord.id}`)

      // Mark conflict as resolved
      await this.db.run(
        'UPDATE conflicts SET resolution = ?, resolvedAt = ? WHERE id = ?',
        ['server_wins', Date.now(), conflictRecord.id]
      )

      // Notify user about conflict resolution
      this.notifyConflictResolution(conflictRecord, 'server_wins', serverData)

      return {
        resolution: 'resolved',
        resolvedData: serverData,
        conflictInfo: conflictRecord
      }
    } catch (error) {
      secureLogger.error('[OfflineQueue] Conflict resolution failed:', error)
      return {
        resolution: 'failed',
        conflictInfo: { error: error.message }
      }
    }
  }

  async getPendingConflicts(): Promise<any[]> {
    await this.ensureInitialized()

    try {
      const conflicts = await this.db.all(
        'SELECT * FROM conflicts WHERE resolution = "pending" ORDER BY timestamp ASC'
      )

      return conflicts.map(conflict => ({
        ...conflict,
        clientData: JSON.parse(conflict.clientData),
        serverData: JSON.parse(conflict.serverData)
      }))
    } catch (error) {
      secureLogger.error('[OfflineQueue] Failed to get pending conflicts:', error)
      return []
    }
  }

  async resolveConflict(conflictId: string, resolution: 'client_wins' | 'server_wins'): Promise<void> {
    await this.ensureInitialized()

    try {
      const conflict = await this.db.get('SELECT * FROM conflicts WHERE id = ?', [conflictId])
      if (!conflict) {
        secureLogger.warn(`[OfflineQueue] Conflict ${conflictId} not found`)
        return
      }

      const resolvedData = resolution === 'client_wins'
        ? JSON.parse(conflict.clientData)
        : JSON.parse(conflict.serverData)

      // Update conflict record
      await this.db.run(
        'UPDATE conflicts SET resolution = ?, resolvedAt = ?, resolvedData = ? WHERE id = ?',
        [resolution, Date.now(), JSON.stringify(resolvedData), conflictId]
      )

      // Notify user about resolution
      this.notifyConflictResolution(conflict, resolution, resolvedData)

      secureLogger.info(`[OfflineQueue] Manually resolved conflict ${conflictId} with ${resolution}`)
    } catch (error) {
      secureLogger.error('[OfflineQueue] Manual conflict resolution failed:', error)
      throw error
    }
  }

  private notifyConflictResolution(conflict: any, resolution: string, resolvedData: any): void {
    // Emit event for UI components to handle
    const event = new CustomEvent('pkm:conflict-resolved', {
      detail: {
        conflictId: conflict.id,
        type: conflict.type,
        resolution,
        resolvedData,
        timestamp: Date.now()
      }
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event)
    }

    // Also use toast notification if available
    if (typeof window !== 'undefined' && (window as any).toast) {
      const message = resolution === 'server_wins'
        ? `Conflict resolved: Server version kept for ${conflict.type}`
        : `Conflict resolved: Your version kept for ${conflict.type}`

        ; (window as any).toast.info(message)
    }
  }

  async enqueue(event: string, args: any[], priority = 0): Promise<string> {
    await this.ensureInitialized()

    const id = `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const now = new Date().toISOString()

    try {
      await this.db.run(
        `INSERT INTO queue_items 
         (id, type, payload, timestamp, retries, maxRetries, nextRetryAt, priority, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          this.getEventType(event),
          JSON.stringify({ event, args }),
          Date.now(),
          0,
          10,
          Date.now(),
          priority,
          now,
          now
        ]
      )

      secureLogger.debug(`[OfflineQueue] enqueued item ${id} of type ${event}`)
      return id
    } catch (error) {
      secureLogger.error(`[OfflineQueue] failed to enqueue item ${id}:`, error)
      throw error
    }
  }

  async dequeue(limit = 50): Promise<any[]> {
    await this.ensureInitialized()

    try {
      const items = await this.db.all(
        `SELECT * FROM queue_items 
         WHERE nextRetryAt <= ? 
         ORDER BY priority DESC, timestamp ASC 
         LIMIT ?`,
        [Date.now(), limit]
      )

      return items.map(item => ({
        id: item.id,
        event: JSON.parse(item.payload).event,
        args: JSON.parse(item.payload).args,
        type: item.type,
        timestamp: item.timestamp,
        retries: item.retries,
        maxRetries: item.maxRetries
      }))
    } catch (error) {
      secureLogger.error('[OfflineQueue] failed to dequeue items:', error)
      return []
    }
  }

  async requeueFailed(operations: any[]): Promise<void> {
    await this.ensureInitialized()

    for (const op of operations) {
      try {
        const nextRetryAt = Date.now() + this.getRetryDelay(op.retries)
        await this.updateRetry(op.id, op.retries + 1, nextRetryAt)
        secureLogger.debug(`[OfflineQueue] requeued operation ${op.id} (retry ${op.retries + 1})`)
      } catch (error) {
        secureLogger.error(`[OfflineQueue] failed to requeue operation ${op.id}:`, error)
      }
    }
  }

  private getEventType(event: string): QueueItem['type'] {
    if (event.includes('canvas') || event.includes('drawing')) return 'canvas'
    if (event.includes('headmate') || event.includes('system')) return 'headmates'
    return 'system'
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000
    const maxDelay = 30000
    const jitter = Math.random() * 1000
    return Math.min(maxDelay, baseDelay * Math.pow(2, Math.min(retryCount, 8))) + jitter
  }
}

export const offlineQueueService = new OfflineQueueService()