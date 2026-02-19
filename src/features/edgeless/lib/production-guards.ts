// production safeguards for the canvas system
// error recovery, memory management, and performance monitoring

import { toast } from 'sonner'

interface MemoryStats {
  used: number
  total: number
  limit: number
}

class ProductionGuard {
  private memoryCheckInterval: ReturnType<typeof setInterval> | null = null
  private lastError: Error | null = null
  private errorCount = 0
  private readonly maxErrors = 5
  private readonly memoryThreshold = 0.9 // 90% memory usage

  startMonitoring(): void {
    // memory monitoring
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemory()
    }, 30000) // check every 30 seconds

    // global error handler
    window.addEventListener('error', this.handleGlobalError)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  stopMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }
    window.removeEventListener('error', this.handleGlobalError)
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  private checkMemory(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      if (memory) {
        const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit

        if (usedRatio > this.memoryThreshold) {
          console.warn('[production guard] high memory usage:', Math.round(usedRatio * 100) + '%')
          toast.warning('memory usage high - consider saving and refreshing', {
            duration: 5000,
          })

          // trigger emergency checkpoint
          this.emergencyCheckpoint()
        }
      }
    }
  }

  private handleGlobalError = (event: ErrorEvent) => {
    this.lastError = event.error
    this.errorCount++

    console.error('[production guard] global error:', event.error)

    if (this.errorCount >= this.maxErrors) {
      toast.error('multiple errors detected - please refresh the page')
      this.emergencyCheckpoint()
      this.errorCount = 0
    }
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('[production guard] unhandled rejection:', event.reason)

    // check if it's an indexeddb error
    if (event.reason?.name?.includes('IndexedDB') || event.reason?.message?.includes('indexeddb')) {
      toast.error('storage error - try clearing browser data')
    }
  }

  private emergencyCheckpoint(): void {
    try {
      const drawingId = (window as any).__pkmCurrentDrawingId
      if (!drawingId) return

      const canvasData = (window as any).pkmGetCanvasJSON?.()
      if (canvasData) {
        const backup = {
          timestamp: Date.now(),
          drawingId,
          data: canvasData,
        }
        localStorage.setItem(`pkm-emergency-${drawingId}`, JSON.stringify(backup))
        console.log('[production guard] emergency checkpoint saved')
      }
    } catch (e) {
      console.error('[production guard] emergency checkpoint failed:', e)
    }
  }

  getMemoryStats(): MemoryStats | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        }
      }
    }
    return null
  }

  getErrorStatus(): { count: number; lastError: Error | null } {
    return {
      count: this.errorCount,
      lastError: this.lastError,
    }
  }

  resetErrorCount(): void {
    this.errorCount = 0
    this.lastError = null
  }
}

export const productionGuard = new ProductionGuard()

// performance monitoring
class PerformanceMonitor {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number[]> = new Map()

  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark)
    if (!start) return 0

    const end = endMark ? this.marks.get(endMark) : performance.now()
    if (!end) return 0

    const duration = end - start

    // store for averaging
    const existing = this.measures.get(name) || []
    existing.push(duration)
    if (existing.length > 100) existing.shift() // keep last 100
    this.measures.set(name, existing)

    return duration
  }

  getAverage(name: string): number {
    const measures = this.measures.get(name)
    if (!measures || measures.length === 0) return 0
    return measures.reduce((a, b) => a + b, 0) / measures.length
  }

  getAllAverages(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [name, measures] of this.measures) {
      result[name] = measures.reduce((a, b) => a + b, 0) / measures.length
    }
    return result
  }
}

export const perfMonitor = new PerformanceMonitor()

// idb connection health check
export async function checkStorageHealth(): Promise<{
  healthy: boolean
  issues: string[]
}> {
  const issues: string[] = []

  try {
    // check indexeddb availability
    if (!('indexedDB' in window)) {
      issues.push('indexeddb not available')
    }

    // check storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      if (estimate.usage && estimate.quota) {
        const usageRatio = estimate.usage / estimate.quota
        if (usageRatio > 0.9) {
          issues.push('storage nearly full (' + Math.round(usageRatio * 100) + '%)')
        }
      }
    }

    // test idb write
    const testDb = await openDB('pkm-health-check', 1, {
      upgrade(db) {
        db.createObjectStore('test')
      },
    })
    await testDb.put('test', 'value', 'key')
    await testDb.delete('test', 'key')
    await testDb.close()

    // cleanup
    indexedDB.deleteDatabase('pkm-health-check')
  } catch (e) {
    issues.push('indexeddb write test failed: ' + (e as Error).message)
  }

  return {
    healthy: issues.length === 0,
    issues,
  }
}

// import for idb
import { openDB } from 'idb'