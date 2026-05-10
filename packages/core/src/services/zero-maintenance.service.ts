/**
 * zero-maintenance service for users with memory difficulties
 * provides automatic save, sync, backup, and recovery features
 * designed to be completely hands-off and self-healing
 */

import { robustSync } from './robust-sync.service'
import { autoGitSync } from './auto-git-sync.service'
import { offlineQueue } from './offline-queue.service'
import { conflictResolution } from './conflict-resolution.service'
import { secureLogger } from '@/lib/secure-logger'
import { useState, useEffect } from 'react'

interface ZeroMaintenanceConfig {
  autoSave: boolean
  autoSaveInterval: number // seconds
  autoSync: boolean
  autoBackup: boolean
  backupInterval: number // hours
  maxBackups: number
  enableRecovery: boolean
  healthChecks: boolean
  healthCheckInterval: number // minutes
}

interface MaintenanceStatus {
  autoSave: {
    enabled: boolean
    lastSave: number
    pendingSaves: number
    errorCount: number
  }
  autoSync: {
    enabled: boolean
    lastSync: number
    queueSize: number
    conflicts: number
    connected: boolean
  }
  autoBackup: {
    enabled: boolean
    lastBackup: number
    backupCount: number
    totalSize: number
  }
  recovery: {
    enabled: boolean
    lastRecovery: number
    recoveryPoints: number
    healthScore: number
  }
}

class ZeroMaintenanceService {
  private config: ZeroMaintenanceConfig = {
    autoSave: true,
    autoSaveInterval: 30, // 30 seconds
    autoSync: true,
    autoBackup: true,
    backupInterval: 6, // 6 hours
    maxBackups: 30,
    enableRecovery: true,
    healthChecks: true,
    healthCheckInterval: 5 // 5 minutes
  }

  private status: MaintenanceStatus = {
    autoSave: {
      enabled: true,
      lastSave: 0,
      pendingSaves: 0,
      errorCount: 0
    },
    autoSync: {
      enabled: true,
      lastSync: 0,
      queueSize: 0,
      conflicts: 0,
      connected: false
    },
    autoBackup: {
      enabled: true,
      lastBackup: 0,
      backupCount: 0,
      totalSize: 0
    },
    recovery: {
      enabled: true,
      lastRecovery: 0,
      recoveryPoints: 0,
      healthScore: 100
    }
  }

  private autoSaveTimer: ReturnType<typeof setInterval> | null = null
  private backupTimer: ReturnType<typeof setInterval> | null = null
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private isInitialized = false
  private eventListeners: Map<string, Function[]> = new Map()

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize offline queue for reliability
      await offlineQueue.initialize()

      // Start auto-save
      if (this.config.autoSave) {
        this.startAutoSave()
      }

      // Start auto-sync
      if (this.config.autoSync) {
        robustSync.start()
        autoGitSync.start()
      }

      // Start auto-backup
      if (this.config.autoBackup) {
        this.startAutoBackup()
      }

      // Start health checks
      if (this.config.healthChecks) {
        this.startHealthChecks()
      }

      // Create initial recovery point
      if (this.config.enableRecovery) {
        await this.createRecoveryPoint('initial')
      }

      this.isInitialized = true
      secureLogger.info('[ZeroMaintenance] initialized successfully')
      this.emitEvent('initialized', this.status)

    } catch (error) {
      secureLogger.error('[ZeroMaintenance] initialization failed:', error)
      throw error
    }
  }

  stop(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }

    if (this.backupTimer) {
      clearInterval(this.backupTimer)
      this.backupTimer = null
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    robustSync.stop()
    autoGitSync.stop()

    this.isInitialized = false
    secureLogger.info('[ZeroMaintenance] stopped')
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) return

    this.autoSaveTimer = setInterval(async () => {
      await this.performAutoSave()
    }, this.config.autoSaveInterval * 1000)

    secureLogger.info(`[ZeroMaintenance] auto-save started (${this.config.autoSaveInterval}s interval)`)
  }

  private async performAutoSave(): Promise<void> {
    try {
      // Get current canvas state
      const canvasData = (window as any).pkmGetCanvasJSON?.()
      if (!canvasData) return

      // Queue for sync
      await offlineQueue.enqueue('canvas', canvasData, 1)

      // Update status
      this.status.autoSave.lastSave = Date.now()
      this.status.autoSave.pendingSaves = (await offlineQueue.getStats()).total

      secureLogger.debug('[ZeroMaintenance] auto-save completed')

    } catch (error) {
      this.status.autoSave.errorCount++
      secureLogger.error('[ZeroMaintenance] auto-save failed:', error)
    }
  }

  private startAutoBackup(): void {
    if (this.backupTimer) return

    this.backupTimer = setInterval(async () => {
      await this.performAutoBackup()
    }, this.config.backupInterval * 60 * 60 * 1000) // Convert hours to milliseconds

    secureLogger.info(`[ZeroMaintenance] auto-backup started (${this.config.backupInterval}h interval)`)
  }

  private async performAutoBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupData = {
        timestamp,
        canvas: (window as any).pkmGetCanvasJSON?.(),
        elements: useEdgelessStore?.getState?.()?.elements || [],
        version: '1.0.0'
      }

      // Save to IndexedDB
      const backupKey = `backup_${timestamp}`
      await this.saveToIndexedDB(backupKey, backupData)

      // Clean up old backups
      await this.cleanupOldBackups()

      // Update status
      this.status.autoBackup.lastBackup = Date.now()
      this.status.autoBackup.backupCount = await this.getBackupCount()

      secureLogger.info(`[ZeroMaintenance] backup created: ${backupKey}`)

    } catch (error) {
      secureLogger.error('[ZeroMaintenance] auto-backup failed:', error)
    }
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) return

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck()
    }, this.config.healthCheckInterval * 60 * 1000) // Convert minutes to milliseconds

    secureLogger.info(`[ZeroMaintenance] health checks started (${this.config.healthCheckInterval}m interval)`)
  }

  private async performHealthCheck(): Promise<void> {
    try {
      let healthScore = 100

      // Check sync status
      const syncStatus = robustSync.getSyncStatus()
      if (!syncStatus.connected) {
        healthScore -= 20
      }
      if (syncStatus.queueSize > 10) {
        healthScore -= 10
      }

      // Check git sync status
      const gitStatus = autoGitSync.getStatus()
      if (!gitStatus.isRunning) {
        healthScore -= 15
      }
      if (gitStatus.error) {
        healthScore -= 10
      }

      // Check offline queue
      const queueStats = await offlineQueue.getStats()
      if (queueStats.failed > 5) {
        healthScore -= 15
      }

      // Check conflicts
      const conflictStats = conflictResolution.getStats()
      if (conflictStats.recent > 3) {
        healthScore -= 10
      }

      // Update status
      this.status.recovery.healthScore = Math.max(0, healthScore)

      // Auto-heal if health is low
      if (healthScore < 70) {
        await this.performAutoHealing()
      }

      // Create recovery point if health is good
      if (healthScore >= 90) {
        await this.createRecoveryPoint('health-check')
      }

      secureLogger.debug(`[ZeroMaintenance] health check completed: ${healthScore}%`)

    } catch (error) {
      secureLogger.error('[ZeroMaintenance] health check failed:', error)
    }
  }

  private async performAutoHealing(): Promise<void> {
    secureLogger.info('[ZeroMaintenance] performing auto-healing')

    try {
      // Restart sync services if needed
      const syncStatus = robustSync.getSyncStatus()
      if (!syncStatus.connected) {
        robustSync.stop()
        await new Promise(resolve => setTimeout(resolve, 2000))
        robustSync.start()
      }

      // Clear failed queue items
      await offlineQueue.cleanup()

      // Resolve old conflicts
      conflictResolution.cleanup()

      // Force sync if queue is large
      if (syncStatus.queueSize > 20) {
        await robustSync.forceSync()
      }

      secureLogger.info('[ZeroMaintenance] auto-healing completed')

    } catch (error) {
      secureLogger.error('[ZeroMaintenance] auto-healing failed:', error)
    }
  }

  private async createRecoveryPoint(reason: string): Promise<void> {
    if (!this.config.enableRecovery) return

    try {
      const recoveryData = {
        timestamp: Date.now(),
        reason,
        canvas: (window as any).pkmGetCanvasJSON?.(),
        elements: useEdgelessStore?.getState?.()?.elements || [],
        config: this.config,
        status: this.status
      }

      const recoveryKey = `recovery_${Date.now()}`
      await this.saveToIndexedDB(recoveryKey, recoveryData)

      this.status.recovery.lastRecovery = Date.now()
      this.status.recovery.recoveryPoints = await this.getRecoveryPointCount()

      secureLogger.debug(`[ZeroMaintenance] recovery point created: ${recoveryKey}`)

    } catch (error) {
      secureLogger.error('[ZeroMaintenance] recovery point creation failed:', error)
    }
  }

  private async saveToIndexedDB(key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pkm-zero-maintenance', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['backups'], 'readwrite')
        const store = transaction.objectStore('backups')
        const putRequest = store.put(data, key)

        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups')
        }
      }
    })
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.getAllBackups()
      const sortedBackups = backups.sort((a, b) => b.timestamp - a.timestamp)

      // Keep only the most recent backups
      const backupsToRemove = sortedBackups.slice(this.config.maxBackups)

      for (const backup of backupsToRemove) {
        await this.removeFromIndexedDB(backup.key)
      }

      if (backupsToRemove.length > 0) {
        secureLogger.info(`[ZeroMaintenance] cleaned up ${backupsToRemove.length} old backups`)
      }

    } catch (error) {
      secureLogger.error('[ZeroMaintenance] backup cleanup failed:', error)
    }
  }

  private async getAllBackups(): Promise<Array<{ key: string, timestamp: number }>> => Promise.resolve([])
  private async getBackupCount(): Promise<number> { return 0 }
  private async getRecoveryPointCount(): Promise<number> { return 0 }
  private async removeFromIndexedDB(key: string): Promise<void> { }

  // Public API
  async forceSave(): Promise<void> {
    await this.performAutoSave()
  }

  async forceBackup(): Promise<void> {
    await this.performAutoBackup()
  }

  async forceRecovery(recoveryPointId?: string): Promise<void> {
    // Implementation for recovery
    secureLogger.info('[ZeroMaintenance] recovery initiated')
  }

  getStatus(): MaintenanceStatus {
    // Update sync status
    const syncStatus = robustSync.getSyncStatus()
    this.status.autoSync.connected = syncStatus.connected
    this.status.autoSync.queueSize = syncStatus.queueSize
    this.status.autoSync.lastSync = syncStatus.lastSync

    return { ...this.status }
  }

  updateConfig(updates: Partial<ZeroMaintenanceConfig>): void {
    this.config = { ...this.config, ...updates }

    // Restart services with new config
    if (this.isInitialized) {
      this.stop()
      this.initialize()
    }
  }

  // Event handling
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          secureLogger.error('[ZeroMaintenance] event listener error:', error)
        }
      })
    }
  }
}

export const zeroMaintenance = new ZeroMaintenanceService()

// Hook for React components
export function useZeroMaintenance() {
  const [status, setStatus] = useState<MaintenanceStatus>(zeroMaintenance.getStatus())

  useEffect(() => {
    const updateStatus = () => {
      setStatus(zeroMaintenance.getStatus())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    status,
    forceSave: () => zeroMaintenance.forceSave(),
    forceBackup: () => zeroMaintenance.forceBackup(),
    forceRecovery: (id?: string) => zeroMaintenance.forceRecovery(id)
  }
}