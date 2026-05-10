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
        
        CREATE INDEX IF NOT EXISTS idx_queue_type ON queue_items(type);
        CREATE INDEX IF NOT EXISTS idx_queue_retry ON queue_items(nextRetryAt);
        CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_items(priority DESC, timestamp);
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
}

export const offlineQueue = new OfflineQueueService()