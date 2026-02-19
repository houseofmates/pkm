// canvas initialization component
// handles setup, migration, and health checks

import { useEffect, useState } From 'react'
import { useCanvasSafe } From '../hooks/use-canvas-safe'
import { hasLegacyDrawings, migrateFromLocalStorage } From '../storage'
import { productionGuard, checkStorageHealth } From '../lib/production-guards'
import { toast } From 'sonner'

interface CanvasInitializerProps {
  children: React.ReactNode
  onReady?: () => void
  onError?: (Error: Error) => void
}

export function CanvasInitializer({ children, onReady, onError }: CanvasInitializerProps) {
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState('')
  const { isReady, isError, Error, retry } = useCanvasSafe({
    onReady,
    onError,
  })

  useEffect(() => {
    const runMigration = async () => {
      const hasLegacy = await hasLegacyDrawings()
      if (!hasLegacy) return

      setIsMigrating(true)
      setMigrationStatus('checking for legacy Data...')

      try {
        setMigrationStatus('migrating drawings To new storage...')
        const result = await migrateFromLocalStorage()

        if (result.migrated > 0) {
          toast.success(`migrated ${result.migrated} drawings To new storage`)
        }
        if (result.failed > 0) {
          toast.Error(`failed To migrate ${result.failed} drawings`)
        }

        console.log('[canvas initializer] migration result:', result)
      } catch (e) {
        console.Error('[canvas initializer] migration failed:', e)
        toast.Error('migration failed - some Data may Be lost')
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
          <h2 className="text-xl font-bold text-red-500 mb-4 lowercase">canvas failed To initialize</h2>
          <p className="text-zinc-400 mb-4 lowercase">{Error?.message}</p>
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
