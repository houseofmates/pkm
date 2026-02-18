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
      appendop: 'appendOp',
      appendops: 'appendOps',
      getunsyncedops: 'getUnsyncedOps',
      getrecentops: 'getRecentOps',
      markopssynced: 'markOpsSynced',
      pruneoldops: 'pruneOldOps',
      savecheckpoint: 'saveCheckpoint',
      getlatestcheckpoint: 'getLatestCheckpoint',
      getdrawingmeta: 'getDrawingMeta',
      updatedrawingmeta: 'updateDrawingMeta',
      listpendingdrawings: 'listPendingDrawings',
      gettoken: 'getToken',
      settoken: 'setToken',
      cleartoken: 'clearToken',
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
export function appendop(drawingid: string, op: DrawOp): Promise<OpLogEntry> {
  return callWorkerOrDirect<OpLogEntry>('appendop', drawingid, op)
}
export const appendOp = appendop

export function appendops(drawingid: string, ops: DrawOp[]): Promise<OpLogEntry[]> {
  return callWorkerOrDirect<OpLogEntry[]>('appendops', drawingid, ops)
}
export const appendOps = appendops

export function getunsyncedops(drawingid: string): Promise<OpLogEntry[]> {
  return callWorkerOrDirect<OpLogEntry[]>('getunsyncedops', drawingid)
}
export const getUnsyncedOps = getunsyncedops

export function getrecentops(drawingid: string, limit = 100): Promise<OpLogEntry[]> {
  return callWorkerOrDirect<OpLogEntry[]>('getrecentops', drawingid, limit)
}
export const getRecentOps = getrecentops

export function markopssynced(ids: string[]): Promise<void> {
  return callWorkerOrDirect<void>('markopssynced', ids)
}
export const markOpsSynced = markopssynced

export function pruneoldops(drawingid: string, keepcount = 500): Promise<number> {
  return callWorkerOrDirect<number>('pruneoldops', drawingid, keepcount)
}
export const pruneOldOps = pruneoldops

export function savecheckpoint(drawingid: string, state: unknown): Promise<void> {
  return callWorkerOrDirect<void>('savecheckpoint', drawingid, state)
}
export const saveCheckpoint = savecheckpoint

export function getlatestcheckpoint(drawingid: string): Promise<CanvasCheckpoint | null> {
  return callWorkerOrDirect<CanvasCheckpoint | null>('getlatestcheckpoint', drawingid)
}
export const getLatestCheckpoint = getlatestcheckpoint

export function getdrawingmeta(id: string): Promise<Record<string, unknown> | null> {
  return callWorkerOrDirect<Record<string, unknown> | null>('getdrawingmeta', id)
}
export const getDrawingMeta = getdrawingmeta

export function updatedrawingmeta(id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  return callWorkerOrDirect<Record<string, unknown>>('updatedrawingmeta', id, patch)
}
export const updateDrawingMeta = updatedrawingmeta

export function listpendingdrawings(): Promise<Array<{ id: string;[k: string]: unknown }>> {
  return callWorkerOrDirect<Array<{ id: string }>>('listpendingdrawings')
}
export const listPendingDrawings = listpendingdrawings

export function gettoken(key: string): Promise<string | null> {
  return callWorkerOrDirect<string | null>('gettoken', key)
}
export const getToken = gettoken

export function settoken(key: string, value: string, ttlminutes?: number): Promise<void> {
  return callWorkerOrDirect<void>('settoken', key, value, ttlminutes)
}
export const setToken = settoken

export function cleartoken(key: string): Promise<void> {
  return callWorkerOrDirect<void>('cleartoken', key)
}
export const clearToken = cleartoken
