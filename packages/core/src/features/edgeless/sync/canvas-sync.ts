// sync service for canvas operations
// syncs checkpoints to nocobase using upsert pattern
// instant sync on save, load from server on init

import { nocobaseClient } from '@/lib/nocobase'
import {
getUnsyncedOps,
markOpsSynced,
updateDrawingMeta,
listPendingDrawings,
getDrawingMeta,
saveCheckpoint,
getLatestCheckpoint,
} from '../storage/canvas-db'
import type { OpLogEntry } from '../storage/oplog'
import { decryptObject, encryptObject } from '@/lib/encryption'
import { secureLogger } from '@/lib/secure-logger'

const SYNC_INTERVAL_MS = 2000
const MAX_RETRIES = 3

const ENCRYPTION_ENABLED = import.meta.env.VITE_PKM_ENCRYPTION === 'true'

interface CanvasState {
drawingId: string
clientId: string
timestamp: number
canvas: unknown
elements: unknown[]
title?: string
}

interface SyncState {
isSyncing: boolean
lastSyncAt: number
pendingCount: number
}

class CanvasSyncService {
private timer: ReturnType<typeof setInterval> | null = null
private syncState: Map<string, SyncState> = new Map()

start(): void {
if (this.timer) return

this.syncState.clear()

this.timer = setInterval(() => {
this.syncAllPending()
}, SYNC_INTERVAL_MS)

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

state.isSyncing = true
this.syncState.set(drawingId, state)

try {
const meta = await getDrawingMeta(drawingId)

// get canvas state from window (set by edgelesscanvas)
const win = window as unknown as { pkmGetCanvasJSON?: () => unknown }
const canvasData = win.pkmGetCanvasJSON?.()

if (!canvasData) {
state.isSyncing = false
this.syncState.set(drawingId, state)
return true
}

const payload: CanvasState = {
drawingId,
clientId: this.getClientId(),
timestamp: Date.now(),
canvas: (canvasData as any).canvas,
elements: (canvasData as any).elements || [],
title: meta?.title || 'untitled',
}

const result = await this.sendToServer(payload)

if (result.success) {
// mark any unsynced ops as synced
const unsynced = await getUnsyncedOps(drawingId)
if (unsynced.length > 0) {
await markOpsSynced(unsynced.map((o) => o.id))
}

await updateDrawingMeta(drawingId, {
syncState: 'synced',
serverId: result.serverId,
})

state.lastSyncAt = Date.now()
state.isSyncing = false
state.pendingCount = 0
this.syncState.set(drawingId, state)

return true
} else {
throw new Error(result.error || 'sync failed')
}
} catch (err) {
// don't spam console - collection might not exist on server yet
// local saves still work via indexeddb
const axiosErr = err as { response?: { status?: number }; message?: string }
if (axiosErr?.response?.status === 500) {
// server collection doesn't exist - this is expected on first run
// silently fail, local persistence still works
} else if (axiosErr?.response?.status === 404) {
// collection not found - also expected
} else {
secureLogger.warn('sync error (local save still works):', axiosErr.message)
}
state.isSyncing = false
this.syncState.set(drawingId, state)
return false
}
}

private async sendToServer(payload: CanvasState): Promise<
| { success: true; serverId?: string }
| { success: false; error?: string }
> {
try {
const payloadToStore = ENCRYPTION_ENABLED
? {
meta: { drawingId: payload.drawingId, clientId: payload.clientId, timestamp: payload.timestamp, title: payload.title },
encryptedPayload: await encryptObject(payload),
}
: payload

// try to find existing record using list with filter
const filter = JSON.stringify({ drawingId: payload.drawingId })
const existing = await nocobaseClient.request('pkm_canvases', 'list', {
method: 'GET',
params: {
filter,
pageSize: 1,
},
} as any)

const existingRecord = (existing as any)?.data?.[0]

if (existingRecord) {
// update existing
await nocobaseClient.request('pkm_canvases', 'update', {
method: 'POST',
params: { filterByTk: existingRecord.id },
data: {
title: payload.title,
content: JSON.stringify(payloadToStore),
clientId: payload.clientId,
updatedAt: new Date().toISOString(),
},
} as any)

return { success: true, serverId: existingRecord.id }
} else {
// create new
const res = await nocobaseClient.request('pkm_canvases', 'create', {
method: 'POST',
data: {
title: payload.title,
content: JSON.stringify(payloadToStore),
clientId: payload.clientId,
drawingId: payload.drawingId,
},
} as any)

return { success: true, serverId: (res as any)?.data?.id }
}
} catch (err: any) {
return { success: false, error: err.message }
}
}

async loadFromServer(drawingId: string): Promise<CanvasState | null> {
try {
const filter = JSON.stringify({ drawingId })
const res = await nocobaseClient.request('pkm_canvases', 'list', {
method: 'GET',
params: {
filter,
sort: '-updatedAt',
pageSize: 1,
},
} as any)

const record = (res as any)?.data?.[0]
if (!record?.content) return null

const content = JSON.parse(record.content)

if (content?.encryptedPayload) {
try {
const decrypted = await decryptObject<CanvasState>(content.encryptedPayload)
return decrypted
} catch {
return null
}
}

return content as CanvasState
} catch (err) {
// 500 = collection doesn't exist, return null silently
const axiosErr = err as { response?: { status?: number } }
if (axiosErr?.response?.status !== 500) {
secureLogger.debug('load from server failed (using local)', drawingId)
}
return null
}
}

private getClientId(): string {
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

export function useSyncStatus(drawingId: string) {
return canvasSync.getSyncState(drawingId)
}
