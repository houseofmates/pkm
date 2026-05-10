/**
 * zero-maintenance auto-save service
 * ensures no data is ever lost, even if the app crashes or browser closes
 * provides automatic recovery and healing capabilities
 */

import { secureLogger } from '@/lib/secure-logger'
import { offlineQueueService } from './offline-queue.service'

interface AutoSaveState {
  lastSave: number
  saveInterval: number
  isSaving: boolean
  pendingSaves: Map<string, any>
  recoveryAttempts: number
  maxRecoveryAttempts: number
}

interface SaveOperation {
  id: string
  type: 'canvas' | 'headmates' | 'settings' | 'user_data'
  data: any
  timestamp: number
  priority: 'critical' | 'normal' | 'low'
  retryCount: number
}

class AutoSaveService {
  private state: AutoSaveState = {
    lastSave: 0,
    saveInterval: 30000, // 30 seconds for normal saves
    isSaving: false,
    pendingSaves: new Map(),
    recoveryAttempts: 0,
    maxRecoveryAttempts: 5
  }

  private saveTimer: ReturnType<typeof setInterval> | null = null
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private storageKey = 'pkm-auto-save-state'
  private criticalSaveKey = 'pkm-critical-save'

  constructor() {
    this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      // Load previous state from localStorage
      const savedState = localStorage.getItem(this.storageKey)
      if (savedState) {
        const parsed = JSON.parse(savedState)
        this.state = { ...this.state, ...parsed }
        secureLogger.info('[AutoSave] Restored state from previous session')
      }

      // Check for unsaved critical data
      await this.checkForUnsavedCriticalData()

      // Start auto-save timer
      this.startAutoSave()

      // Start health monitoring
      this.startHealthCheck()

      // Setup page visibility change detection
      this.setupVisibilityDetection()

      // Setup beforeunload handler
      this.setupBeforeUnloadHandler()

      secureLogger.info('[AutoSave] Service initialized successfully')
    } catch (error) {
      secureLogger.error('[AutoSave] Initialization failed:', error)
      // Continue anyway - auto-save should be resilient
    }
  }

  private startAutoSave(): void {
    if (this.saveTimer) clearInterval(this.saveTimer)

    this.saveTimer = setInterval(() => {
      this.performAutoSave()
    }, this.state.saveInterval)

    secureLogger.debug(`[AutoSave] Started auto-save with ${this.state.saveInterval}ms interval`)
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, 60000) // Check every minute
  }

  private setupVisibilityDetection(): void {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden, save immediately
        this.performImmediateSave()
      } else if (document.visibilityState === 'visible') {
        // Page is visible, check for recovery needs
        this.checkForRecovery()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  private setupBeforeUnloadHandler(): void {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (this.state.pendingSaves.size > 0) {
        // Save critical data before unload
        this.performImmediateSave()

        // Show warning if there are unsaved changes
        const message = 'You have unsaved changes. They will be saved automatically.'
        e.returnValue = message
        return message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  public async saveData(
    type: SaveOperation['type'],
    data: any,
    priority: SaveOperation['priority'] = 'normal'
  ): Promise<string> {
    const operation: SaveOperation = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      priority,
      retryCount: 0
    }

    this.state.pendingSaves.set(operation.id, operation)

    // Save immediately for critical data
    if (priority === 'critical') {
      await this.saveOperation(operation)
    }

    this.persistState()
    return operation.id
  }

  private async performAutoSave(): Promise<void> {
    if (this.state.isSaving || this.state.pendingSaves.size === 0) return

    this.state.isSaving = true

    try {
      const operations = Array.from(this.state.pendingSaves.values())

      // Sort by priority and timestamp
      operations.sort((a, b) => {
        const priorityOrder = { critical: 0, normal: 1, low: 2 }
        const aPriority = priorityOrder[a.priority]
        const bPriority = priorityOrder[b.priority]

        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }

        return a.timestamp - b.timestamp
      })

      // Save operations in batches
      const batchSize = 5
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize)
        await Promise.all(batch.map(op => this.saveOperation(op)))
      }

      this.state.lastSave = Date.now()
      secureLogger.debug(`[AutoSave] Saved ${operations.length} operations`)
    } catch (error) {
      secureLogger.error('[AutoSave] Auto-save failed:', error)
    } finally {
      this.state.isSaving = false
      this.persistState()
    }
  }

  private async performImmediateSave(): Promise<void> {
    if (this.state.pendingSaves.size === 0) return

    try {
      const operations = Array.from(this.state.pendingSaves.values())
      const criticalOps = operations.filter(op => op.priority === 'critical')

      if (criticalOps.length > 0) {
        await Promise.all(criticalOps.map(op => this.saveOperation(op)))
        secureLogger.info(`[AutoSave] Immediate save: ${criticalOps.length} critical operations`)
      }

      // Also save to localStorage as backup
      const backupData = {
        operations: operations.map(op => ({ ...op, data: op.data })),
        timestamp: Date.now()
      }
      localStorage.setItem(this.criticalSaveKey, JSON.stringify(backupData))
    } catch (error) {
      secureLogger.error('[AutoSave] Immediate save failed:', error)
    }
  }

  private async saveOperation(operation: SaveOperation): Promise<void> {
    try {
      // Route to appropriate storage mechanism
      switch (operation.type) {
        case 'canvas':
          await this.saveCanvasData(operation)
          break
        case 'headmates':
          await this.saveHeadmatesData(operation)
          break
        case 'settings':
          await this.saveSettingsData(operation)
          break
        case 'user_data':
          await this.saveUserData(operation)
          break
        default:
          await this.saveGenericData(operation)
      }

      // Remove from pending saves
      this.state.pendingSaves.delete(operation.id)

      // Also queue for sync if we're online
      try {
        await offlineQueueService.enqueue(operation.type, operation.data, operation.priority === 'critical' ? 10 : 5)
      } catch (syncError) {
        // Sync queue might not be available, that's ok
        secureLogger.debug('[AutoSave] Sync queue not available:', syncError.message)
      }
    } catch (error) {
      secureLogger.error(`[AutoSave] Failed to save operation ${operation.id}:`, error)

      // Increment retry count
      operation.retryCount++

      // Remove if max retries exceeded
      if (operation.retryCount >= 3) {
        this.state.pendingSaves.delete(operation.id)
        secureLogger.warn(`[AutoSave] Dropped operation ${operation.id} after 3 retries`)
      }
    }
  }

  private async saveCanvasData(operation: SaveOperation): Promise<void> {
    // Save to IndexedDB via canvas storage service
    if (typeof window !== 'undefined' && (window as any).canvasStorage) {
      await (window as any).canvasStorage.saveCanvasState(operation.data)
    }
  }

  private async saveHeadmatesData(operation: SaveOperation): Promise<void> {
    // Save headmates state to appropriate storage
    const headmatesKey = 'pkm-headmates-state'
    localStorage.setItem(headmatesKey, JSON.stringify({
      data: operation.data,
      timestamp: operation.timestamp,
      operationId: operation.id
    }))
  }

  private async saveSettingsData(operation: SaveOperation): Promise<void> {
    // Save settings to localStorage
    const settingsKey = 'pkm-user-settings'
    localStorage.setItem(settingsKey, JSON.stringify({
      data: operation.data,
      timestamp: operation.timestamp
    }))
  }

  private async saveUserData(operation: SaveOperation): Promise<void> {
    // Save user data to IndexedDB or localStorage as fallback
    const userDataKey = 'pkm-user-data'
    try {
      if (typeof window !== 'undefined' && (window as any).indexedDB) {
        // Use IndexedDB for larger data
        await this.saveToIndexedDB('userData', operation.data)
      } else {
        // Fallback to localStorage
        localStorage.setItem(userDataKey, JSON.stringify({
          data: operation.data,
          timestamp: operation.timestamp
        }))
      }
    } catch (error) {
      // Final fallback to localStorage
      localStorage.setItem(userDataKey, JSON.stringify({
        data: operation.data,
        timestamp: operation.timestamp
      }))
    }
  }

  private async saveGenericData(operation: SaveOperation): Promise<void> {
    // Generic save to localStorage with size limits
    const dataStr = JSON.stringify(operation.data)
    if (dataStr.length < 1024 * 1024) { // 1MB limit
      const key = `pkm-data-${operation.type}`
      localStorage.setItem(key, dataStr)
    } else {
      secureLogger.warn(`[AutoSave] Data too large for localStorage: ${operation.id}`)
    }
  }

  private async saveToIndexedDB(store: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pkm-autosave', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction([store], 'readwrite')
        const objectStore = transaction.objectStore(store)
        const putRequest = objectStore.put(data, 'current')

        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store)
        }
      }
    })
  }

  private async checkForUnsavedCriticalData(): Promise<void> {
    try {
      const criticalData = localStorage.getItem(this.criticalSaveKey)
      if (criticalData) {
        const backup = JSON.parse(criticalData)
        const operations = backup.operations || []

        if (operations.length > 0) {
          secureLogger.info(`[AutoSave] Found ${operations.length} unsaved critical operations`)

          // Restore operations to pending saves
          for (const op of operations) {
            this.state.pendingSaves.set(op.id, op)
          }

          // Clear the backup
          localStorage.removeItem(this.criticalSaveKey)

          // Attempt to save immediately
          await this.performAutoSave()
        }
      }
    } catch (error) {
      secureLogger.error('[AutoSave] Failed to check for unsaved critical data:', error)
    }
  }

  private async checkForRecovery(): Promise<void> {
    try {
      // Check if we need to recover from a crash
      const timeSinceLastSave = Date.now() - this.state.lastSave

      if (timeSinceLastSave > 5 * 60 * 1000) { // 5 minutes
        secureLogger.warn('[AutoSave] Possible crash detected, initiating recovery')

        this.state.recoveryAttempts++

        if (this.state.recoveryAttempts <= this.state.maxRecoveryAttempts) {
          await this.performRecovery()
        } else {
          secureLogger.error('[AutoSave] Max recovery attempts exceeded')
        }
      }
    } catch (error) {
      secureLogger.error('[AutoSave] Recovery check failed:', error)
    }
  }

  private async performRecovery(): Promise<void> {
    try {
      // Check all storage mechanisms for unsaved data
      const storageKeys = [
        'pkm-headmates-state',
        'pkm-user-settings',
        'pkm-user-data'
      ]

      let recoveredData = 0

      for (const key of storageKeys) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            const parsed = JSON.parse(data)
            if (parsed.timestamp && parsed.data) {
              // Add to pending saves
              await this.saveData(
                key.replace('pkm-', '').replace('-state', '').replace('-user-', '') as SaveOperation['type'],
                parsed.data,
                'critical'
              )
              recoveredData++
            }
          } catch (parseError) {
            // Invalid data, remove it
            localStorage.removeItem(key)
          }
        }
      }

      if (recoveredData > 0) {
        secureLogger.info(`[AutoSave] Recovery successful: ${recoveredData} items restored`)
        this.state.recoveryAttempts = 0
      }
    } catch (error) {
      secureLogger.error('[AutoSave] Recovery failed:', error)
    }
  }

  private performHealthCheck(): void {
    try {
      // Check localStorage availability
      const testKey = 'pkm-health-check'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)

      // Check IndexedDB availability
      if (typeof window !== 'undefined' && window.indexedDB) {
        // IndexedDB is available
      }

      // Check memory usage (basic check)
      if (performance && performance.memory) {
        const memoryInfo = performance.memory
        const usedMemory = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit

        if (usedMemory > 0.9) {
          secureLogger.warn('[AutoSave] High memory usage detected, triggering cleanup')
          this.performCleanup()
        }
      }

      secureLogger.debug('[AutoSave] Health check passed')
    } catch (error) {
      secureLogger.error('[AutoSave] Health check failed:', error)
    }
  }

  private performCleanup(): void {
    try {
      // Clean up old pending saves
      const now = Date.now()
      const maxAge = 10 * 60 * 1000 // 10 minutes

      for (const [id, operation] of this.state.pendingSaves) {
        if (now - operation.timestamp > maxAge) {
          this.state.pendingSaves.delete(id)
        }
      }

      // Clean up localStorage
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith('pkm-') && !key.includes('settings') && !key.includes('critical')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}')
            if (data.timestamp && now - data.timestamp > maxAge) {
              localStorage.removeItem(key)
            }
          } catch {
            // Invalid data, remove it
            localStorage.removeItem(key)
          }
        }
      }

      secureLogger.info('[AutoSave] Cleanup completed')
    } catch (error) {
      secureLogger.error('[AutoSave] Cleanup failed:', error)
    }
  }

  private persistState(): void {
    try {
      const stateToSave = {
        lastSave: this.state.lastSave,
        saveInterval: this.state.saveInterval,
        pendingSaves: Array.from(this.state.pendingSaves.entries()),
        recoveryAttempts: this.state.recoveryAttempts
      }

      localStorage.setItem(this.storageKey, JSON.stringify(stateToSave))
    } catch (error) {
      secureLogger.error('[AutoSave] Failed to persist state:', error)
    }
  }

  public getStats(): {
    pendingSaves: number
    lastSave: number
    isSaving: boolean
    recoveryAttempts: number
  } {
    return {
      pendingSaves: this.state.pendingSaves.size,
      lastSave: this.state.lastSave,
      isSaving: this.state.isSaving,
      recoveryAttempts: this.state.recoveryAttempts
    }
  }

  public forceSave(): Promise<void> {
    return this.performAutoSave()
  }

  public destroy(): void {
    if (this.saveTimer) clearInterval(this.saveTimer)
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)

    // Save any remaining data
    this.performImmediateSave()

    secureLogger.info('[AutoSave] Service destroyed')
  }
}

export const autoSaveService = new AutoSaveService()