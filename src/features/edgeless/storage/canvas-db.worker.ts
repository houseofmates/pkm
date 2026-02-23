// canvas-db.worker.ts
// all indexeddb operations for the canvas run here, off the main thread
// communicates with db-bridge.ts via structured message passing

import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb' // DBSchema is purely a type and already imported as such

interface canvasdbschema extends DBSchema {
    oplog: {
        key: string
        value: {
            id: string
            drawingId: string
            timestamp: number
            op: unknown
            synced: boolean
            serverAckedAt?: number
        }
        indexes: { 'by-timestamp': number; 'by-drawing': string }
    }
    checkpoints: {
        key: string
        value: {
            id: string
            drawingId: string
            timestamp: number
            state: unknown
        }
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

let db: IDBPDatabase<canvasdbschema> | null = null

async function getdb(): Promise<IDBPDatabase<canvasdbschema>> {
    if (db) return db
    db = await openDB<canvasdbschema>('pkm-canvas-v1', 1)
    return db
}

// message handler
self.onmessage = async (e: MessageEvent) => {
    const { id, method, args } = e.data
    try {
        const handler = handlers[method]
        if (!handler) throw new Error(`unknown method: ${method}`)
        const result = await handler(...args)
        self.postMessage({ id, result })
    } catch (error) {
        console.error(`[Worker] Error in ${method}:`, error)
        self.postMessage({ id, error: (error as Error).message })
    }
}

const handlers: Record<string, (...args: any[]) => Promise<unknown>> = {
    async appendop(drawingid: string, op: unknown) {
        const d = await getdb()
        const entry = {
            id: `${drawingid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            drawingId: drawingid,
            timestamp: Date.now(),
            op,
            synced: false,
        }
        await d.put('oplog', entry)
        return entry
    },

    async appendops(drawingid: string, ops: unknown[]) {
        if (!ops || ops.length === 0) return []
        const d = await getdb()
        const tx = d.transaction('oplog', 'readwrite')
        const entries: any[] = []
        const baseTs = Date.now()
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i]
            const entry = {
                id: `${drawingid}-${baseTs + i}-${Math.random().toString(36).slice(2, 7)}`,
                drawingId: drawingid,
                timestamp: baseTs + i,
                op,
                synced: false,
            }
            await tx.store.put(entry)
            entries.push(entry)
        }
        await tx.done
        return entries
    },

    async getunsyncedops(drawingid: string) {
        const d = await getdb()
        const all = await d.getAllFromIndex('oplog', 'by-drawing', drawingid)
        return all.filter((e) => !e.synced).sort((a, b) => a.timestamp - b.timestamp)
    },

    async getrecentops(drawingid: string, limit = 100) {
        const d = await getdb()
        const all = await d.getAllFromIndex('oplog', 'by-drawing', drawingid)
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
    },

    async markopssynced(ids: string[]) {
        const d = await getdb()
        const tx = d.transaction('oplog', 'readwrite')
        for (const id of ids) {
            const entry = await tx.store.get(id)
            if (entry) {
                entry.synced = true
                await tx.store.put(entry)
            }
        }
        await tx.done
    },

    async pruneoldops(drawingid: string, keepcount = 500) {
        try {
            const d = await getdb()
            const all = await d.getAllFromIndex('oplog', 'by-drawing', drawingid)
            if (all.length <= keepcount) return 0

            // sort by timestamp ascending (oldest first)
            const sorted = all.sort((a, b) => a.timestamp - b.timestamp)

            // determine which ones to delete (oldest ones, but keep 'keepcount' newest)
            // and only delete if they are synced
            const potentialDeletes = sorted.slice(0, all.length - keepcount)
            const todelete = potentialDeletes.filter((e) => e.synced)

            if (todelete.length === 0) return 0

            const tx = d.transaction('oplog', 'readwrite')
            for (const entry of todelete) {
                await tx.store.delete(entry.id)
            }
            await tx.done
            return todelete.length
        } catch (e) {
            console.error('[Worker] pruneoldops failed:', e)
            throw e
        }
    },

    async savecheckpoint(drawingid: string, state: unknown) {
        const d = await getdb()
        const checkpoint = {
            id: `${drawingid}-${Date.now()}`,
            drawingId: drawingid,
            timestamp: Date.now(),
            state,
        }
        await d.put('checkpoints', checkpoint)

        // keep only last 3 checkpoints per drawing
        const all = await d.getAllFromIndex('checkpoints', 'by-drawing', drawingid)
        if (all.length > 3) {
            const todrop = all.sort((a, b) => a.timestamp - b.timestamp).slice(0, all.length - 3)
            const tx = d.transaction('checkpoints', 'readwrite')
            for (const cp of todrop) await tx.store.delete(cp.id)
            await tx.done
        }
    },

    async getlatestcheckpoint(drawingid: string) {
        const d = await getdb()
        const all = await d.getAllFromIndex('checkpoints', 'by-drawing', drawingid)
        return all.sort((a, b) => b.timestamp - a.timestamp)[0] || null
    },

    async getdrawingmeta(id: string) {
        const d = await getdb()
        return (await d.get('drawings', id)) || null
    },

    async updatedrawingmeta(id: string, patch: Record<string, unknown>) {
        const d = await getdb()
        const existing = await d.get('drawings', id)
        const updated = {
            ...(existing || { id, createdAt: Date.now(), title: 'untitled', syncState: 'pending' as const }),
            ...patch,
            updatedAt: Date.now(),
        }
        await d.put('drawings', updated as canvasdbschema['drawings']['value'])
        return updated
    },

    async listpendingdrawings() {
        const d = await getdb()
        return d.getAllFromIndex('drawings', 'by-sync-state', 'pending')
    },

    async gettoken(key: string) {
        const d = await getdb()
        const entry = await d.get('tokens', key)
        if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
            await d.delete('tokens', key)
            return null
        }
        return entry?.value || null
    },

    async settoken(key: string, value: string, ttlminutes?: number) {
        const d = await getdb()
        await d.put('tokens', {
            key,
            value,
            expiresAt: ttlminutes ? Date.now() + ttlminutes * 60 * 1000 : undefined,
        })
    },

    async cleartoken(key: string) {
        const d = await getdb()
        await d.delete('tokens', key)
    },
}
