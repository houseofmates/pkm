// migration utility: localstorage/lzstring -> indexeddb/oplog
// one-time migration for existing drawings

import { updateDrawingMeta, saveCheckpoint } from './canvas-db'

interface LegacyDrawing {
  id: string
  title: string
  content?: string // lzstring compressed
  thumbnail?: string
}

export async function migrateFromLocalStorage(): Promise<{
  migrated: number
  failed: number
  skipped: number
}> {
  const result = { migrated: 0, failed: 0, skipped: 0 }

  // find all drawing keys in localstorage
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('drawing-')) {
      keys.push(key)
    }
  }

  console.log('[migrate] found', keys.length, 'potential drawings in localstorage')

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

        console.log('[migrate] migrated config for', id)
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

          console.log('[migrate] migrated content for', id, '-', data.objects?.length || 0, 'objects')
          result.migrated++
        } else {
          console.warn('[migrate] failed to decompress', id)
          result.failed++
        }

        // optionally: remove from localstorage after migration
        // localstorage.removeitem(key)
      }
    } catch (e) {
      console.error('[migrate] error migrating', key, e)
      result.failed++
    }
  }

  console.log('[migrate] complete:', result)
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
