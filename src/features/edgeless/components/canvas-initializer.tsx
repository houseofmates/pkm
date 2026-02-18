// canvas initialization component
// handles setup, migration, and health checks

import { useEffect, useState } from 'react'
import { useCanvasSafe } from '../hooks/use-canvas-safe'
import { hasLegacyDrawings, migrateFromLocalStorage } from '../storage'
import { productionGuard, checkStorageHealth } from '../lib/production-guards'
import { toast } from 'sonner'

interface CanvasInitializerProps {
  children: React.ReactNode
  onReady?: () => void
  onError?: (error: Error) => void
}

export function CanvasInitializer({ children, onReady, onError }: CanvasInitializerProps) {
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState('')
  const { isReady, isError, error, retry } = useCanvasSafe({
    onReady,
    onError,
  })

  useEffect(() => {
    const runMigration = async () => {
      const hasLegacy = await hasLegacyDrawings()
      if (!hasLegacy) return

      setIsMigrating(true)
      setMigrationStatus('checking for legacy data...')

      try {
        setMigrationStatus('migrating drawings to new storage...')
        const result = await migrateFromLocalStorage()

        if (result.migrated > 0) {
          toast.success(`migrated ${result.migrated} drawings to new storage`)
        }
        if (result.failed > 0) {
          toast.error(`failed to migrate ${result.failed} drawings`)
        }

        console.log('[canvas initializer] migration result:', result)
      } catch (e) {
        console.error('[canvas initializer] migration failed:', e)
        toast.error('migration failed - some data may be lost')
      } finally {
        setIsMigrating(false)
      }
    }

    const checkHealth = async () => {
      const { healthy, issues } = await checkStorageHealth()
      if (!healthy) {
        console.warn('[canvas initializer] storage health issues:', issues)
        toast.warning('storage issues detected: ' + issues.join(', '))
      }
    }

    runMigration()
    checkHealth()

    // start production monitoring
    productionGuard.startMonitoring()

    return () => {
      productionguard.stopmonitoring()
    }
  }, [])

  if (iserror) {
    return (
      <div className="w-full h-screen bg-[#050505] flex items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-red-500 mb-4 lowercase">canvas failed to initialize</h2>
          <p className="text-zinc-400 mb-4 lowercase">{error?.message}</p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-[#f6b012] text-black rounded lowercase hover:bg-[#f6b012]/90"
          >
            retry
          </button>
        </div>
      </div>
    )
  }

  if (ismigrating || !isready) {
    return (
      <div className="w-full h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div
            className="text-[#f6b012] lowercase animate-pulse mb-2"
            style={{ fontFamily: 'varela round, sans-serif' }}
          >
            {ismigrating ? migrationstatus || 'migrating...' : 'initializing canvas...'}
          </div>
          {ismigrating && (
            <div className="text-xs text-zinc-500 lowercase">this may take a moment</div>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
