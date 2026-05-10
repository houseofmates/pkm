/**
 * automatic bidirectional git sync service
 * provides cron-like scheduling and change-triggered syncing
 * ensures zero-maintenance operation for users with memory difficulties
 */

import { secureLogger } from '@/lib/secure-logger'

interface SyncStatus {
  isRunning: boolean
  lastSync: number
  nextSync: number
  pendingChanges: number
  conflicts: number
  error: string | null
  syncCount: number
  lastError: string | null
}

interface SyncConfig {
  autoSync: boolean
  syncInterval: number // minutes
  changeThreshold: number // number of changes to trigger immediate sync
  maxRetries: number
  retryDelay: number // minutes
  conflictResolution: 'auto' | 'manual'
}

class AutoGitSyncService {
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private changeWatcher: ReturnType<typeof setInterval> | null = null
  private status: SyncStatus = {
    isRunning: false,
    lastSync: 0,
    nextSync: 0,
    pendingChanges: 0,
    conflicts: 0,
    error: null,
    syncCount: 0,
    lastError: null
  }
  
  private config: SyncConfig = {
    autoSync: true,
    syncInterval: 15, // 15 minutes
    changeThreshold: 5, // trigger sync after 5 changes
    maxRetries: 3,
    retryDelay: 5, // 5 minutes
    conflictResolution: 'auto'
  }

  private lastKnownState: string = ''
  private pendingChanges: number = 0
  private eventListeners: Map<string, Function[]> = new Map()

  async start(): Promise<void> {
    if (this.status.isRunning) return

    try {
      // verify git repository
      await this.verifyGitRepo()
      
      // get initial state
      this.lastKnownState = await this.getRepoState()
      
      // start automatic sync timer
      this.startSyncTimer()
      
      // start change watcher
      this.startChangeWatcher()
      
      this.status.isRunning = true
      this.status.nextSync = Date.now() + (this.config.syncInterval * 60 * 1000)
      
      secureLogger.info('[AutoGitSync] started successfully')
      this.emitEvent('sync-started', this.status)
      
    } catch (error) {
      this.status.error = error.message
      secureLogger.error('[AutoGitSync] failed to start:', error)
      throw error
    }
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
    
    if (this.changeWatcher) {
      clearInterval(this.changeWatcher)
      this.changeWatcher = null
    }
    
    this.status.isRunning = false
    secureLogger.info('[AutoGitSync] stopped')
    this.emitEvent('sync-stopped', this.status)
  }

  async forceSync(): Promise<void> {
    if (!this.status.isRunning) {
      throw new Error('sync service not running')
    }

    try {
      await this.performSync()
      this.emitEvent('sync-completed', this.status)
    } catch (error) {
      this.emitEvent('sync-failed', { error: error.message, status: this.status })
      throw error
    }
  }

  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // restart timers with new config
    if (this.status.isRunning) {
      this.stop()
      this.start()
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status }
  }

  getConfig(): SyncConfig {
    return { ...this.config }
  }

  private startSyncTimer(): void {
    if (this.syncTimer) return

    this.syncTimer = setInterval(async () => {
      if (this.config.autoSync) {
        try {
          await this.performSync()
        } catch (error) {
          secureLogger.error('[AutoGitSync] scheduled sync failed:', error)
        }
      }
    }, this.config.syncInterval * 60 * 1000)
  }

  private startChangeWatcher(): void {
    if (this.changeWatcher) return

    this.changeWatcher = setInterval(async () => {
      try {
        const currentState = await this.getRepoState()
        
        if (currentState !== this.lastKnownState) {
          this.pendingChanges++
          this.lastKnownState = currentState
          
          // trigger immediate sync if threshold reached
          if (this.pendingChanges >= this.config.changeThreshold) {
            secureLogger.info(`[AutoGitSync] change threshold reached (${this.pendingChanges}), triggering sync`)
            await this.performSync()
            this.pendingChanges = 0
          }
        }
      } catch (error) {
        secureLogger.error('[AutoGitSync] change watcher failed:', error)
      }
    }, 30000) // check every 30 seconds
  }

  private async performSync(): Promise<void> {
    const startTime = Date.now()
    
    try {
      // check if there are any changes to sync
      const hasChanges = await this.hasUncommittedChanges()
      
      if (!hasChanges) {
        secureLogger.debug('[AutoGitSync] no changes to sync')
        return
      }

      // stage all changes
      await this.execGitCommand('git add .')
      
      // check for conflicts before committing
      const conflicts = await this.checkForConflicts()
      
      if (conflicts.length > 0) {
        if (this.config.conflictResolution === 'auto') {
          await this.resolveConflicts(conflicts)
        } else {
          this.status.conflicts = conflicts.length
          throw new Error(`${conflicts.length} merge conflicts detected`)
        }
      }

      // commit changes
      const commitMessage = await this.generateCommitMessage()
      await this.execGitCommand(`git commit -m "${commitMessage}"`)
      
      // pull remote changes
      await this.execGitCommand('git pull origin main')
      
      // push changes
      await this.execGitCommand('git push origin main')
      
      // update status
      this.status.lastSync = startTime
      this.status.nextSync = Date.now() + (this.config.syncInterval * 60 * 1000)
      this.status.syncCount++
      this.status.error = null
      this.status.lastError = null
      this.status.pendingChanges = 0
      this.status.conflicts = 0
      
      secureLogger.info(`[AutoGitSync] sync completed in ${Date.now() - startTime}ms`)
      
    } catch (error) {
      this.status.error = error.message
      this.status.lastError = error.message
      secureLogger.error('[AutoGitSync] sync failed:', error)
      throw error
    }
  }

  private async verifyGitRepo(): Promise<void> {
    try {
      await this.execGitCommand('git rev-parse --git-dir')
    } catch (error) {
      throw new Error('not a git repository')
    }
  }

  private async getRepoState(): Promise<string> {
    try {
      const status = await this.execGitCommand('git status --porcelain')
      const branch = await this.execGitCommand('git rev-parse --abbrev-ref HEAD')
      const commit = await this.execGitCommand('git rev-parse HEAD')
      return `${branch}:${commit}:${status}`
    } catch (error) {
      return 'unknown'
    }
  }

  private async hasUncommittedChanges(): Promise<boolean> {
    try {
      const status = await this.execGitCommand('git status --porcelain')
      return status.trim().length > 0
    } catch (error) {
      return false
    }
  }

  private async checkForConflicts(): Promise<string[]> {
    try {
      // check for merge conflicts
      const conflicts = await this.execGitCommand('git diff --name-only --diff-filter=U')
      return conflicts.trim().split('\n').filter(f => f.length > 0)
    } catch (error) {
      return []
    }
  }

  private async resolveConflicts(conflicts: string[]): Promise<void> {
    for (const file of conflicts) {
      // auto-resolve using ours (last-write-wins)
      await this.execGitCommand(`git checkout --ours ${file}`)
      await this.execGitCommand(`git add ${file}`)
    }
    
    secureLogger.info(`[AutoGitSync] auto-resolved ${conflicts.length} conflicts`)
  }

  private async generateCommitMessage(): Promise<string> {
    const timestamp = new Date().toISOString()
    const changeCount = this.pendingChanges || 1
    
    return `auto-sync: ${changeCount} change(s) ${timestamp}

Generated with [PKM Auto-Sync](https://github.com/pkm/auto-sync)

Co-Authored-By: PKM Auto-Sync <autosync@pkm.local>`
  }

  private async execGitCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')
      
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git command failed: ${stderr || error.message}`))
        } else {
          resolve(stdout.trim())
        }
      })
    })
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
          secureLogger.error(`[AutoGitSync] event listener error:`, error)
        }
      })
    }
  }

  /**
   * get sync statistics
   */
  getStats(): {
    totalSyncs: number
    averageSyncTime: number
    successRate: number
    lastSyncDuration: number
  } {
    return {
      totalSyncs: this.status.syncCount,
      averageSyncTime: 0, // would need to track timing history
      successRate: this.status.error ? 0.9 : 1.0, // simplified
      lastSyncDuration: 0 // would need to track last sync duration
    }
  }
}

export const autoGitSync = new AutoGitSyncService()