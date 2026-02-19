
Layout was forced before the page was fully loaded. If stylesheets are not yet loaded this may cause a flash of unstyled content. index.js:1267:1
[vite] connecting... client:733:9
[vite] connected. client:827:12
Download the React DevTools for a better development experience: https://react.dev/link/react-devtools react-dom_client.js:20103:54
[PKM] [Router] Private: PKM subdomain detected secure-logger.ts:152:19
[PKM] [Router] Host: pkm.houseofmates.space, isPublicByDomain: false, isPkm: true, Result Public: false secure-logger.ts:152:19
Uncaught TypeError: document.getelementbyid is not a function
    <anonymous> main.tsx:41
main.tsx:41:28
downloadable font: rejected by sanitizer (font-family: "varela round" style:normal weight:400 stretch:100 src index:0) source: https://pkm.houseofmates.space/fonts/varelaround-regular.woff2

​

// write-ahead-log.ts
// ensures zero data loss by journaling all writes before they happen
// incomplete writes are replayed on app startup via walrecover()

import { openDB } from 'idb'
import type { IDBPDatabase, DBSchema } from 'idb'

interface WALSchema extends DBSchema {
    wal: {
        key: string
        value: {
            id: string
            timestamp: number
            collection: string
            recordId: string
            operation: 'create' | 'update' | 'delete'
            payload: unknown
            status: 'pending' | 'committed' | 'failed'
            retries: number
        }
    }
}

let walDb: IDBPDatabase<WALSchema> | null = null

async function getWAL(): Promise<IDBPDatabase<WALSchema>> {
    if (walDb) return walDb
    walDb = await openDB<WALSchema>('pkm-wal-v1', 1, {
        upgrade(db) {
            db.createObjectStore('wal', { keyPath: 'id' })
        },
    })
    return walDb
}

export async function walwrite(
    collection: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    payload: unknown
): Promise<string> {
    const db = await getWAL()
    const id = `wal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    await db.put('wal', {
        id,
        timestamp: Date.now(),
        collection,
        recordId,
        operation,
        payload,
        status: 'pending',
        retries: 0,
    })
    return id
}

export async function walcommit(id: string): Promise<void> {
    const db = await getWAL()
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
    const db = await getWAL()
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
        recordId: string
        operation: 'create' | 'update' | 'delete'
        payload: unknown
    }>
> {
    const db = await getWAL()
    const all = await db.getAll('wal')
    return all
        .filter((e) => e.status === 'pending' && e.retries < 3)
        .sort((a, b) => a.timestamp - b.timestamp)
}

export async function walpendingcount(): Promise<number> {
    const db = await getWAL()
    const all = await db.getAll('wal')
    return all.filter((e) => e.status === 'pending').length
}
