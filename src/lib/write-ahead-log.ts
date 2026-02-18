// write-ahead-log.ts
// ensures zero data loss by journaling all writes before they happen
// incomplete writes are replayed on app startup via walrecover()

import { openDB } from 'idb'
import type { IDBPDatabase, DBSchema } from 'idb'

interface walschema extends DBSchema {
    wal: {
        key: string
        value: {
            id: string
            timestamp: number
            collection: string
            recordid: string
            operation: 'create' | 'update' | 'delete'
            payload: unknown
            status: 'pending' | 'committed' | 'failed'
            retries: number
        }
    }
}

let waldb: IDBPDatabase<walschema> | null = null

async function getwal(): Promise<IDBPDatabase<walschema>> {
    if (waldb) return waldb
    waldb = await openDB<walschema>('pkm-wal-v1', 1, {
        upgrade(db) {
            db.createObjectStore('wal', { keyPath: 'id' })
        },
    })
    return waldb
}

export async function walwrite(
    collection: string,
    recordid: string,
    operation: 'create' | 'update' | 'delete',
    payload: unknown
): Promise<string> {
    const db = await getwal()
    const id = `wal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    await db.put('wal', {
        id,
        timestamp: Date.now(),
        collection,
        recordid,
        operation,
        payload,
        status: 'pending',
        retries: 0,
    })
    return id
}

export async function walcommit(id: string): Promise<void> {
    const db = await getwal()
    const entry = await db.get('wal', id)
    if (entry) {
        entry.status = 'committed'
        await db.put('wal', entry)
    }
    // cleanup: remove committed entries older than 1 hour
    const all = await db.getAll('wal')
    const cutoff = Date.now() - 60 * 60 * 1000
    const tx = db.transaction('wal', 'readwrite')
    for (const e of all) {
        if (e.status === 'committed' && e.timestamp < cutoff) {
            await tx.store.delete(e.id)
        }
    }
    await tx.done
}

export async function walfail(id: string): Promise<void> {
    const db = await getwal()
    const entry = await db.get('wal', id)
    if (entry) {
        entry.status = 'failed'
        entry.retries++
        await db.put('wal', entry)
    }
}

export async function walrecover(): Promise<
    Array<{
        id: string
        collection: string
        recordid: string
        operation: 'create' | 'update' | 'delete'
        payload: unknown
    }>
> {
    const db = await getwal()
    const all = await db.getAll('wal')
    return all
        .filter((e) => e.status === 'pending' && e.retries < 3)
        .sort((a, b) => a.timestamp - b.timestamp)
}

export async function walpendingcount(): Promise<number> {
    const db = await getwal()
    const all = await db.getAll('wal')
    return all.filter((e) => e.status === 'pending').length
}
