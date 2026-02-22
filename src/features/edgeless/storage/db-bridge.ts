// db-bridge.ts
// main-thread proxy for canvas-db.worker.ts
// provides promise-based rpc over postmessage
// falls back to direct `canvas-db` calls in test / non-worker environments

import * as directDb from './canvas-db'
import type { DrawOp, OpLogEntry, CanvasCheckpoint } from './oplog'

let worker: Worker | null = null
let nextid = 0
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()

function initWorkerIfNeeded() {
  if (worker) return
  // avoid creating a worker in test environments (vitest/node)
  if (typeof process !== 'undefined' && (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test')) {
    worker = null
    return
  }
  try {
    worker = new Worker(new URL('./canvas-db.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (error) p.reject(new Error(error))
      else p.resolve(result)
    }
    worker.onerror = (e: ErrorEvent) => {
      console.error('canvas-db worker error:', e.message)
    }
  } catch (err) {
    // fallback to direct db implementation
    worker = null
    console.warn('canvas-db worker unavailable, falling back to direct idb implementation')
  }
}

function callWorkerOrDirect<T>(method: string, ...args: unknown[]): Promise<T> {
  initWorkerIfNeeded()
  if (!worker) {
    // map lowercased worker method names to camelcase direct exports
    const mapping: Record<string, string> = {
      Appendop: 'appendOp',
      Appendops: 'appendOps',
      Getunsyncedops: 'getUnsyncedOps',
      Getrecentops: 'getRecentOps',
      Markopssynced: 'markOpsSynced',
      Pruneoldops: 'pruneOldOps',
      Savecheckpoint: 'saveCheckpoint',
      Getlatestcheckpoint: 'getLatestCheckpoint',
      Getdrawingmeta: 'getDrawingMeta',
      Updatedrawingmeta: 'updateDrawingMeta',
      Listpendingdrawings: 'listPendingDrawings',
      Deletedrawing: 'deleteDrawing',
      Gettoken: 'getToken',
      Settoken: 'setToken',
      Cleartoken: 'clearToken',
    }
    const directName = mapping[method] || method
    const fn = (directDb as any)[directName]
    if (!fn) return Promise.reject(new Error(`method not found on direct db: ${directName}`))
    try {
      const res = fn.apply(null, args)
      return Promise.resolve(res)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  return new Promise((resolve, reject) => {
    const id = nextid++
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, method, args })
  })
}

// public api — matches canvas-db.ts exports and provides lowercase variants
export function appendOp(drawingid: string, op: DrawOp): Promise<OpLogEntry> {
  return callWorkerOrDirect<OpLogEntry>('Appendop', drawingid, op)
}

export function appendOps(drawingid: string, ops: DrawOp[]): Promise<OpLogEntry[]> {
  return callWorkerOrDirect<OpLogEntry[]>('Appendops', drawingid, ops)
}

export function getUnsyncedOps(drawingid: string): Promise<OpLogEntry[]> {
  return callWorkerOrDirect<OpLogEntry[]>('Getunsyncedops', drawingid)
}

export function getRecentOps(drawingid: string, limit = 100): Promise<OpLogEntry[]> {
  return callWorkerOrDirect<OpLogEntry[]>('Getrecentops', drawingid, limit)
}

export function markOpsSynced(ids: string[]): Promise<void> {
  return callWorkerOrDirect<void>('Markopssynced', ids)
}

export function pruneOldOps(drawingid: string, keepcount = 500): Promise<number> {
  return callWorkerOrDirect<number>('Pruneoldops', drawingid, keepcount)
}

export function saveCheckpoint(drawingid: string, state: unknown): Promise<void> {
  return callWorkerOrDirect<void>('Savecheckpoint', drawingid, state)
}

export function getLatestCheckpoint(drawingid: string): Promise<CanvasCheckpoint | null> {
  return callWorkerOrDirect<CanvasCheckpoint | null>('Getlatestcheckpoint', drawingid)
}

export function getDrawingMeta(id: string): Promise<Record<string, unknown> | null> {
  return callWorkerOrDirect<Record<string, unknown> | null>('Getdrawingmeta', id)
}

export function updateDrawingMeta(id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  return callWorkerOrDirect<Record<string, unknown>>('Updatedrawingmeta', id, patch)
}

export function listPendingDrawings(): Promise<Array<{ id: string;[k: string]: unknown }>> {
  return callWorkerOrDirect<Array<{ id: string }>>('Listpendingdrawings')
}

export function deleteDrawing(id: string): Promise<void> {
  return callWorkerOrDirect<void>('Deletedrawing', id)
}

export function getToken(key: string): Promise<string | null> {
  return callWorkerOrDirect<string | null>('Gettoken', key)
}

export function setToken(key: string, value: string, ttlminutes?: number): Promise<void> {
  return callWorkerOrDirect<void>('Settoken', key, value, ttlminutes)
}

export function clearToken(key: string): Promise<void> {
  return callWorkerOrDirect<void>('Cleartoken', key)
}

export function clearMemoryTokens(): void {
  // synchronous, no worker needed
  const fn = (directDb as any).clearMemoryTokens
  if (fn) fn()
}
