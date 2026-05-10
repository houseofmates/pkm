// safe canvas initialization hook
// handles errors, loading states, and cleanup

import { useEffect, useRef, useState, useCallback } from 'react'
import { productionGuard, perfMonitor } from '../lib/production-guards'
import { secureLogger } from '@/lib/secure-logger'

interface UseCanvasSafeOptions {
  onError?: (error: Error) => void
  onReady?: () => void
}

interface UseCanvasSafeReturn {
  isReady: boolean
  isError: boolean
  error: Error | null
  retry: () => void
}

export function useCanvasSafe(options: UseCanvasSafeOptions = {}): UseCanvasSafeReturn {
  const [isReady, setIsReady] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 3

  const initialize = useCallback(async () => {
    perfMonitor.mark('canvas-init-start')

    try {
      // check storage health first
      const { healthy, issues } = await import('../lib/production-guards').then(m => m.checkStorageHealth())
      if (!healthy) {
        secureLogger.warn('[UseCanvasSafe] storage issues:', issues)
      }

      // start production monitoring
      productionGuard.startMonitoring()

      perfMonitor.mark('canvas-init-end')
      perfMonitor.measure('canvas-init', 'canvas-init-start', 'canvas-init-end')

      setIsReady(true)
      setIsError(false)
      setError(null)
      retryCount.current = 0

      options.onReady?.()
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      secureLogger.error('[UseCanvasSafe] initialization failed:', err)

      setIsError(true)
      setError(err)
      options.onError?.(err)

      // auto-retry on first failure
      if (retryCount.current < maxRetries) {
        retryCount.current++
        setTimeout(() => {
          initialize()
        }, 1000 * retryCount.current)
      }
    }
  }, [options])

  const retry = useCallback(() => {
    setIsError(false)
    setError(null)
    setIsReady(false)
    retryCount.current = 0
    initialize()
  }, [initialize])

  useEffect(() => {
    initialize()

    return () => {
      productionGuard.stopMonitoring()
    }
  }, [initialize])

  return {
    isReady,
    isError,
    error,
    retry,
  }
}