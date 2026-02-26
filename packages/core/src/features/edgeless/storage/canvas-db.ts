import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb' // types only
import type { DrawOp, OpLogEntry, CanvasCheckpoint } from './oplog'
import { secureLogger } from '@/lib/secure-logger'

const DB_NAME = 'pkm-canvas-v1'
// bump version to ensure upgrade runs for clients that created the DB without stores
const DB_VERSION = 2

interface CanvasDBSchema extends DBSchema {
  oplog: {
    key: string
    value: OpLogEntry
    indexes: { 'by-timestamp': number; 'by-drawing': string }
  }
  checkpoints: {
    key: string
    value: CanvasCheckpoint
    indexes: { 'by-drawing': string }
  }
  drawings: {
    key: string
    value: {
      id: string
      title: string
      createdAt: number
      updatedAt: number
      thumbnail?: string
      syncState: 'pending' | 'synced' | 'conflict'
      serverId?: string
    }
    indexes: { 'by-sync-state': string }
  }
  tokens: {
    key: string
    value: {
      key: string
      value: string
      expiresAt?: number
    }
  }
}

let dbPromise: Promise<IDBPDatabase<CanvasDBSchema>> | null = null

export function getCanvasDB(): Promise<IDBPDatabase<CanvasDBSchema>> {
  if (dbPromise) return dbPromise

  dbPromise = openDB<CanvasDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      // ensure stores exist even if a prior version was created without them
      const ensureStore = (
        name: 'oplog' | 'checkpoints' | 'drawings' | 'tokens',
        options: IDBObjectStoreParameters,
        indexes: Array<{ name: IDBValidKey; keyPath: string }>,
      ) => {
        const store = (db.objectStoreNames.contains(name)
          ? transaction.objectStore(name)
          : db.createObjectStore(name, options)) as IDBObjectStore
        indexes.forEach(({ name: idxName, keyPath }) => {
          const indexName = String(idxName)
          if (!store.indexNames.contains(indexName)) store.createIndex(indexName, keyPath)
        })
      }

      ensureStore('oplog', { keyPath: 'id' }, [
        { name: 'by-timestamp', keyPath: 'timestamp' },
        { name: 'by-drawing', keyPath: 'drawingId' },
      ])

      ensureStore('checkpoints', { keyPath: 'id' }, [
        { name: 'by-drawing', keyPath: 'drawingId' },
      ])

      ensureStore('drawings', { keyPath: 'id' }, [
        { name: 'by-sync-state', keyPath: 'syncState' },
      ])

      if (!db.objectStoreNames.contains('tokens')) {
        db.createObjectStore('tokens', { keyPath: 'key' })
      }
    },
  })

  return dbPromise
}

// oplog operations
export async function appendOp(drawingId: string, op: DrawOp): Promise<OpLogEntry> {
  const db = await getCanvasDB()
  const entry: OpLogEntry = {
    id: `${drawingId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    drawingId,
    timestamp: Date.now(),
    op,
    synced: false,
  }
  await db.put('oplog', entry)
  return entry
}

/**
 * appendops - batch-insert multiple oplog entries in a single transaction.
 * used to reduce round-trips / pressure on idb during high-op bursts.
 */
export async function appendOps(drawingId: string, ops: DrawOp[]): Promise<OpLogEntry[]> {
  if (!ops || ops.length === 0) return []
  const db = await getCanvasDB()
  const tx = db.transaction('oplog', 'readwrite')
  const result: OpLogEntry[] = []
  const baseTs = Date.now()
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const entry: OpLogEntry = {
      id: `${drawingId}-${baseTs + i}-${Math.random().toString(36).slice(2, 7)}`,
      drawingId,
      timestamp: baseTs + i,
      op,
      synced: false,
    }
    await tx.store.put(entry)
    result.push(entry)
  }
  await tx.done
  return result
}

export async function getUnsyncedOps(drawingId: string): Promise<OpLogEntry[]> {
  const db = await getCanvasDB()
  const all = await db.getAllFromIndex('oplog', 'by-drawing', drawingId)
  return all.filter((e) => !e.synced).sort((a, b) => a.timestamp - b.timestamp)
}

export async function markOpsSynced(ids: string[]): Promise<void> {
  const db = await getCanvasDB()
  const tx = db.transaction('oplog', 'readwrite')
  for (const id of ids) {
    const entry = await tx.store.get(id)
    if (entry) {
      entry.synced = true
      await tx.store.put(entry)
    }
  }
  await tx.done
}

export async function getRecentOps(drawingId: string, limit = 100): Promise<OpLogEntry[]> {
  const db = await getCanvasDB()
  const all = await db.getAllFromIndex('oplog', 'by-drawing', drawingId)
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}

export async function pruneOldOps(drawingId: string, keepCount = 500): Promise<number> {
  try {
    const db = await getCanvasDB()
    const all = await db.getAllFromIndex('oplog', 'by-drawing', drawingId)
    if (all.length <= keepCount) return 0

    // keep the most recent, delete the rest
    const toDelete = all
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, all.length - keepCount)
      .filter((e) => e.synced) // only delete synced ops

    if (toDelete.length === 0) return 0

    const tx = db.transaction('oplog', 'readwrite')
    for (const entry of toDelete) {
      await tx.store.delete(entry.id)
    }
    await tx.done
    return toDelete.length
  } catch (e) {
    secureLogger.error('[DB] pruneOldOps failed', e)
    throw e
  }
}

// checkpoint operations
export async function saveCheckpoint(drawingId: string, state: unknown): Promise<void> {
  const db = await getCanvasDB()
  const checkpoint: CanvasCheckpoint = {
    id: `${drawingId}-${Date.now()}`,
    drawingId,
    timestamp: Date.now(),
    state,
  }
  await db.put('checkpoints', checkpoint)

  // keep only last 3 checkpoints per drawing
  const all = await db.getAllFromIndex('checkpoints', 'by-drawing', drawingId)
  if (all.length > 3) {
    const toDelete = all.sort((a, b) => a.timestamp - b.timestamp).slice(0, all.length - 3)
    const tx = db.transaction('checkpoints', 'readwrite')
    for (const cp of toDelete) {
      await tx.store.delete(cp.id)
    }
    await tx.done
  }
}

export async function getLatestCheckpoint(drawingId: string): Promise<CanvasCheckpoint | undefined> {
  const db = await getCanvasDB()
  const all = await db.getAllFromIndex('checkpoints', 'by-drawing', drawingId)
  return all.sort((a, b) => b.timestamp - a.timestamp)[0]
}

// drawing metadata operations
export async function getDrawingMeta(id: string) {
  const db = await getCanvasDB()
  return db.get('drawings', id)
}

export async function updateDrawingMeta(
  id: string,
  patch: Partial<{ title: string; thumbnail: string; syncState: 'pending' | 'synced' | 'conflict'; serverId?: string }>
) {
  const db = await getCanvasDB()
  const existing = await db.get('drawings', id)
  const updated = {
    ...(existing || { id, createdAt: Date.now(), title: 'untitled', syncState: 'pending' as const }),
    ...patch,
    title: (patch as { title?: string }).title ?? existing?.title ?? 'untitled',
    updatedAt: Date.now(),
  }
  await db.put('drawings', updated as CanvasDBSchema['drawings']['value'])
  return updated
}

export async function listPendingDrawings() {
  const db = await getCanvasDB()
  return db.getAllFromIndex('drawings', 'by-sync-state', 'pending')
}

export async function deleteDrawing(id: string): Promise<void> {
  const db = await getCanvasDB()
  await db.delete('drawings', id)
}

// token operations (with in-memory cache)
const memoryTokens = new Map<string, string>()

export async function getToken(key: string): Promise<string | undefined> {
  // check memory first (non-blocking)
  if (memoryTokens.has(key)) {
    return memoryTokens.get(key)
  }

  // fallback to idb
  const db = await getCanvasDB()
  const entry = await db.get('tokens', key)
  if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
    await db.delete('tokens', key)
    return undefined
  }
  if (entry) {
    memoryTokens.set(key, entry.value)
  }
  return entry?.value
}

export async function setToken(key: string, value: string, ttlMinutes?: number) {
  const db = await getCanvasDB()
  memoryTokens.set(key, value)
  await db.put('tokens', {
    key,
    value,
    expiresAt: ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : undefined,
  })
}

export async function clearToken(key: string) {
  memoryTokens.delete(key)
  const db = await getCanvasDB()
  await db.delete('tokens', key)
}

export function clearMemoryTokens() {
  memoryTokens.clear()
}