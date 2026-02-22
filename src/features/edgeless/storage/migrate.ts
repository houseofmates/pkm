// migration utility: localstorage/lzstring -> indexeddb/oplog
// one-time migration for existing drawings

import { updateDrawingMeta, saveCheckpoint } from './canvas-db'
import { secureLogger } from '@/lib/secure-logger'

interface LegacyDrawing {
  id: string
  title: string
  content?: string // lzstring compressed
  thumbnail?: string
}

export interface MigrationResult {
  migrated: number
  failed: number
  skipped: number
  details: Array<{ id: string; status: 'migrated' | 'failed' | 'skipped'; error?: string }>
}

export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, failed: 0, skipped: 0, details: [] }

  // find all drawing keys in localstorage
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('drawing-')) {
      keys.push(key)
    }
  }

  secureLogger.info('[migrate] found', keys.length, 'potential drawings in localstorage')

  for (const key of keys) {
    try {
      // parse key: drawing-config-{id} or drawing-content-{id}
      const match = key.match(/^drawing-(config|content)-(.+)$/)
      if (!match) continue

      const [, type, id] = match

      if (type === 'config') {
        // migrate config
        const configStr = localStorage.getItem(key)
        if (!configStr) continue

        const config = JSON.parse(configStr)
        await updateDrawingMeta(id, {
          title: config.title || 'untitled',
          thumbnail: config.thumbnail,
          syncState: 'pending', // trigger re-sync
        })

        secureLogger.info('[migrate] migrated config for', id)
        // drop legacy config
        localStorage.removeItem(key)
      } else if (type === 'content') {
        // migrate content as checkpoint
        const contentStr = localStorage.getItem(key)
        if (!contentStr) continue

        // decompress
        const LZString = await import('lz-string')
        const decompressed = LZString.decompressFromUTF16(contentStr)

        if (decompressed) {
          const data = JSON.parse(decompressed)
          await saveCheckpoint(id, data)

          secureLogger.info('[migrate] migrated content for', id, '-', data.objects?.length || 0, 'objects')
          result.migrated++
          result.details.push({ id, status: 'migrated' })
          // drop legacy content
          localStorage.removeItem(key)
        } else {
          secureLogger.warn('[migrate] failed to decompress', id)
          result.failed++
          result.details.push({ id, status: 'failed', error: 'Decompression failed' })
        }
      }
    } catch (e) {
      secureLogger.error('[migrate] error migrating', key, e)
      result.failed++
      result.details.push({ id: key, status: 'failed', error: String(e) })
    }
  }

  secureLogger.info('[migrate] complete:', result)
  return result
}

export async function hasLegacyDrawings(): Promise<boolean> {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('drawing-')) {
      return true
    }
  }
  return false
}
