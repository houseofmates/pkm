// link-registry.ts
// bidirectional adjacency list for document cross-references
// eliminates dangling pointers on rename, move, and delete
// persisted to localstorage with lazy hydration

import { storageManager } from '@/lib/storage-manager';

export interface LinkEntry {
    sourceId: string
    sourceCollection: string
    targetId: string
    targetCollection: string
    label: string
}

const STORAGE_KEY = 'pkm_link_registry'

class LinkRegistry {
    private outbound = new Map<string, Set<string>>()
    private inbound = new Map<string, Set<string>>()
    private entries = new Map<string, LinkEntry>()
    private dirty = false

    private key(source: string, target: string): string {
        return `${source}→${target}`
    }

    register(entry: LinkEntry): void {
        const k = this.key(entry.sourceId, entry.targetId)
        this.entries.set(k, entry)

        if (!this.outbound.has(entry.sourceId)) this.outbound.set(entry.sourceId, new Set())
        this.outbound.get(entry.sourceId)!.add(entry.targetId)

        if (!this.inbound.has(entry.targetId)) this.inbound.set(entry.targetId, new Set())
        this.inbound.get(entry.targetId)!.add(entry.sourceId)

        this.dirty = true
        this.schedulePersist()
    }

    unregister(sourceId: string, targetId: string): void {
        const k = this.key(sourceId, targetId)
        this.entries.delete(k)
        this.outbound.get(sourceId)?.delete(targetId)
        this.inbound.get(targetId)?.delete(sourceId)
        this.dirty = true
        this.schedulePersist()
    }

    // remove all outbound links from a source (used when re-scanning document content)
    clearOutbound(sourceId: string): void {
        const targets = this.outbound.get(sourceId)
        if (!targets) return
        for (const tid of targets) {
            const k = this.key(sourceId, tid)
            this.entries.delete(k)
            this.inbound.get(tid)?.delete(sourceId)
        }
        this.outbound.delete(sourceId)
        this.dirty = true
        this.schedulePersist()
    }

    // all documents that link to this target
    getBacklinks(targetId: string): LinkEntry[] {
        const sources = this.inbound.get(targetId)
        if (!sources) return []
        return [...sources]
            .map((sid) => this.entries.get(this.key(sid, targetId)))
            .filter(Boolean) as LinkEntry[]
    }

    // all documents that this source links to
    getOutlinks(sourceId: string): LinkEntry[] {
        const targets = this.outbound.get(sourceId)
        if (!targets) return []
        return [...targets]
            .map((tid) => this.entries.get(this.key(sourceId, tid)))
            .filter(Boolean) as LinkEntry[]
    }

    // when a note is renamed, update all link labels pointing at it
    // returns ids of source documents that need their content updated
    propagateRename(targetId: string, newLabel: string): string[] {
        const sources = this.inbound.get(targetId)
        if (!sources) return []

        const affected: string[] = []
        for (const sid of sources) {
            const k = this.key(sid, targetId)
            const entry = this.entries.get(k)
            if (entry) {
                entry.label = newLabel
                affected.push(sid)
            }
        }
        this.dirty = true
        this.schedulePersist()
        return affected
    }

    // when a note is moved to a different collection
    // returns ids of source documents that need their hrefs updated
    propagateMove(targetId: string, newCollection: string): string[] {
        const sources = this.inbound.get(targetId)
        if (!sources) return []

        const affected: string[] = []
        for (const sid of sources) {
            const k = this.key(sid, targetId)
            const entry = this.entries.get(k)
            if (entry) {
                entry.targetCollection = newCollection
                affected.push(sid)
            }
        }
        this.dirty = true
        this.schedulePersist()
        return affected
    }

    // when a note is deleted, return all documents that reference it
    getOrphanedLinks(targetId: string): LinkEntry[] {
        return this.getBacklinks(targetId)
    }

    // remove all references to a deleted target
    purgeReferences(targetId: string): string[] {
        const sources = this.inbound.get(targetId)
        if (!sources) return []

        const affected: string[] = []
        for (const sid of [...sources]) {
            this.unregister(sid, targetId)
            affected.push(sid)
        }
        return affected
    }

    // total link count
    size(): number {
        return this.entries.size
    }

    // clear the entire registry
    clear(): void {
        this.outbound.clear()
        this.inbound.clear()
        this.entries.clear()
        this.dirty = true
        this.persist()
    }


    // persistence
    private persistTimer: ReturnType<typeof setTimeout> | null = null

    private schedulePersist(): void {
        if (this.persistTimer) return
        this.persistTimer = setTimeout(() => {
            this.persist()
            this.persistTimer = null
        }, 1000)
    }

    persist(): void {
        if (!this.dirty) return
        try {
            const data = [...this.entries.values()]
            storageManager.setItem(STORAGE_KEY, JSON.stringify(data))
            this.dirty = false
        } catch (e) {
            secureLogger.error('link-Registry: persist failed', e)
        }
    }

    hydrate(): void {
        try {
            const raw = storageManager.getItem(STORAGE_KEY)
            if (!raw) return
            const data: LinkEntry[] = JSON.parse(raw)
            this.outbound.clear()
            this.inbound.clear()
            this.entries.clear()
            for (const e of data) this.register(e)
            this.dirty = false
        } catch (e) {
            secureLogger.error('link-Registry: hydrate failed', e)
        }
    }

    // extract links from tiptap html content
    // scans for <a href="/databases/collection/id"> patterns
    scanLinks(
        sourceId: string,
        sourceCollection: string,
        htmlContent: string
    ): LinkEntry[] {
        const found: LinkEntry[] = []
        const regex = /href="\/databases\/([^/]+)\/([^"]+)"/g
        let match

        while ((match = regex.exec(htmlContent)) !== null) {
            const targetCollection = match[1]
            const targetId = match[2]

            // try to extract label from surrounding <a> tag
            const afterHref = htmlContent.slice(match.index)
            const labelRegex = />([^<]*)</
            const labelMatch = labelRegex.exec(afterHref)
            const label = labelMatch?.[1] || 'untitled'

            found.push({
                sourceId,
                sourceCollection,
                targetId,
                targetCollection,
                label,
            })
        }

        return found
    }

    // re-scan a document's content and update the registry
    rescan(sourceId: string, sourceCollection: string, htmlContent: string): void {
        this.clearOutbound(sourceId)
        const links = this.scanLinks(sourceId, sourceCollection, htmlContent)
        for (const link of links) {
            this.register(link)
        }
    }
}

export const registry = new LinkRegistry()

// hydrate on module load
registry.hydrate()
