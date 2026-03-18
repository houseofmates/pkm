// batch sync service for canvas operations
// syncs oplog to nocobase every 5 seconds or 50 operations
// implements client-side uuid collision resolution

import { api } from '@/api/nocobase-client'
import {
  getUnsyncedOps,
  markOpsSynced,
  updateDrawingMeta,
  listPendingDrawings,
  getDrawingMeta,
  saveCheckpoint,
} from '../storage/canvas-db'
import type { OpLogEntry } from '../storage/oplog'
import { decryptObject, encryptObject } from '@/lib/encryption'

const SYNC_INTERVAL_MS = 5000
const SYNC_BATCH_SIZE = 50
const MAX_RETRIES = 3

const ENCRYPTION_ENABLED = import.meta.env.VITE_PKM_ENCRYPTION === 'true'

interface SyncBatch {
  drawingId: string
  ops: OpLogEntry[]
  checkpoint: unknown
  clientTimestamp: number
}

interface SyncState {
  isSyncing: boolean
  lastSyncAt: number
  pendingCount: number
}

class CanvasSyncService {
  private timer: ReturnType<typeof setInterval> | null = null
  private syncState: Map<string, SyncState> = new Map()
  private retryQueue: Map<string, { entry: OpLogEntry; retries: number }[]> = new Map()

  start(): void {
    if (this.timer) return

    // recover from crash: clear any stale sync state so drawings
    // stuck as 'issyncing' get picked up on the next cycle
    this.syncState.clear()
    this.retryQueue.clear()

    this.timer = setInterval(() => {
      this.syncAllPending()
    }, SYNC_INTERVAL_MS)

    // initial sync
    this.syncAllPending()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async forceSync(drawingId: string): Promise<boolean> {
    return this.syncDrawing(drawingId)
  }

  private async syncAllPending(): Promise<void> {
    const pending = await listPendingDrawings()
    for (const drawing of pending) {
      await this.syncDrawing(drawing.id)
    }
  }

  private async syncDrawing(drawingId: string): Promise<boolean> {
    const state = this.syncState.get(drawingId) || {
      isSyncing: false,
      lastSyncAt: 0,
      pendingCount: 0,
    }

    if (state.isSyncing) return false

    const unsynced = await getUnsyncedOps(drawingId, SYNC_BATCH_SIZE + 1)
    if (unsynced.length === 0) return true

    const batch = unsynced.slice(0, SYNC_BATCH_SIZE)
    const remainingCount = Math.max(0, unsynced.length - SYNC_BATCH_SIZE)

    state.isSyncing = true
    state.pendingCount = remainingCount
    this.syncState.set(drawingId, state)

    try {
      // get drawing metadata
      const meta = await getDrawingMeta(drawingId)

      // build payload
      const payload = {
        drawingId,
        clientId: this.getClientId(),
        timestamp: Date.now(),
        ops: batch.map((e) => ({
          id: e.id, // client-generated uuid
          type: e.op.type,
          data: e.op,
          timestamp: e.timestamp,
        })),
        checkpoint: null, // populated below
        title: meta?.title || 'untitled',
      }

      // fetch latest checkpoint if available
      // (not implemented here - would require canvas access)

      // send to nocobase
      const result = await this.sendToServer(payload)

      if (result.success) {
        // mark as synced
        await markOpsSynced(batch.map((e) => e.id))

        // update metadata
        await updateDrawingMeta(drawingId, {
          syncState: 'synced',
          serverId: result.serverDrawingId,
        })

        // save checkpoint after successful sync
        // (checkpoint data would come from canvas)

        state.lastSyncAt = Date.now()
        state.isSyncing = false
        this.syncState.set(drawingId, state)

        // process retry queue for this drawing
        await this.processRetryQueue(drawingId)

        return true
      } else if (result.conflict) {
        // handle collision
        await this.resolveConflict(drawingId, batch, result.serverOps || [])
        return false
      } else {
        throw new Error(result.error || 'sync failed')
      }
    } catch (err) {
      console.error('sync failed for drawing', drawingId, err)
      state.isSyncing = false
      this.syncState.set(drawingId, state)

      // queue for retry
      this.queueForRetry(drawingId, batch)
      return false
    }
  }

  private async sendToServer(payload: unknown): Promise<
    | { success: true; serverDrawingId?: string }
    | { success: false; conflict?: true; serverOps?: unknown[]; error?: string }
  > {
    try {
      const title = (payload as any).title || 'untitled'
      const drawingId = (payload as any).drawingId

      const payloadToStore = ENCRYPTION_ENABLED
        ? {
            meta: { drawingId, clientId: this.getClientId(), timestamp: Date.now(), title },
            encryptedPayload: await encryptObject(payload),
          }
        : payload

      // attempt to use pkm_canvases collection
      const res = await api.request('pkm_canvases', 'create', {
        method: 'POST',
        data: {
          title,
          content: JSON.stringify(payloadToStore),
          clientId: this.getClientId(),
        } as Record<string, unknown>,
      } as any)

      return { success: true, serverDrawingId: (res?.data as any)?.id }
    } catch (err: any) {
      // check for duplicate key (409 or 400 with unique constraint)
      if (err.response?.status === 409 || err.response?.data?.errors?.[0]?.type === 'unique violation') {
        // fetch server state for conflict resolution
        try {
          const serverOps = await this.fetchServerOps((payload as any).drawingId)
          return { success: false, conflict: true, serverOps }
        } catch {
          return { success: false, error: 'conflict resolution failed' }
        }
      }

      return { success: false, error: err.message }
    }
  }

  private async fetchServerOps(drawingId: string): Promise<unknown[]> {
    try {
      const res = await api.request('pkm_canvases', 'list', {
        method: 'GET',
        params: {
          filter: { 'content.drawingId': drawingId },
          sort: ['-createdAt'],
          pageSize: 1,
        } as Record<string, unknown>,
      } as any)

      const record = (res?.data as any)?.[0]
      if (record?.content) {
        const content = JSON.parse(record.content)
        if (content?.encryptedPayload) {
          try {
            const decrypted = await decryptObject<any>(content.encryptedPayload)
            return decrypted.ops || []
          } catch {
            return []
          }
        }
        return content.ops || []
      }
      return []
    } catch {
      return []
    }
  }

  private async resolveConflict(
    drawingId: string,
    localOps: OpLogEntry[],
    serverOps: unknown[]
  ): Promise<void> {
    // last-write-wins based on timestamp
    // if server has newer ops, we need to merge

    const localIds = new Set(localOps.map((o) => o.id))
    const serverNewOps = serverOps.filter((o: any) => !localIds.has(o.id))

    if (serverNewOps.length > 0) {
      // server has ops we don't have
      // mark local ops as conflicted for manual resolution
      await updateDrawingMeta(drawingId, { syncState: 'conflict' })

      // emit event for ui
      window.dispatchEvent(
        new CustomEvent('pkm:sync-conflict', {
          detail: { drawingId, localOps, serverOps },
        })
      )
    } else {
      // we have all server ops, just resync
      await markOpsSynced(localOps.map((o) => o.id))
      await updateDrawingMeta(drawingId, { syncState: 'synced' })
    }
  }

  private queueForRetry(drawingId: string, ops: OpLogEntry[]): void {
    const existing = this.retryQueue.get(drawingId) || []
    for (const op of ops) {
      const existingEntry = existing.find((e) => e.entry.id === op.id)
      if (existingEntry) {
        existingEntry.retries++
      } else {
        existing.push({ entry: op, retries: 1 })
      }
    }
    this.retryQueue.set(drawingId, existing)
  }

  private async processRetryQueue(drawingId: string): Promise<void> {
    const queue = this.retryQueue.get(drawingId) || []
    const toRetry = queue.filter((e) => e.retries < MAX_RETRIES)

    if (toRetry.length > 0) {
      // retry these ops
      this.retryQueue.set(
        drawingId,
        queue.filter((e) => e.retries >= MAX_RETRIES) // keep failed ones for logging
      )

      // they will be picked up on next sync cycle as unsynced
      await updateDrawingMeta(drawingId, { syncState: 'pending' })
    }
  }

  private getClientId(): string {
    // stable client identifier
    let id = localStorage.getItem('pkm_client_id')
    if (!id) {
      id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem('pkm_client_id', id)
    }
    return id
  }

  getSyncState(drawingId: string): SyncState {
    return (
      this.syncState.get(drawingId) || {
        isSyncing: false,
        lastSyncAt: 0,
        pendingCount: 0,
      }
    )
  }
}

export const canvasSync = new CanvasSyncService()

// react hook for sync status
export function useSyncStatus(drawingId: string) {
  return canvasSync.getSyncState(drawingId)
}