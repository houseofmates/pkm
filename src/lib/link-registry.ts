// link-registry.ts
// bidirectional adjacency list for document cross-references
// eliminates dangling pointers on rename, move, and delete
// persisted to localstorage with lazy hydration

export interface Linkentry {
    sourceid: string
    sourcecollection: string
    targetid: string
    targetcollection: string
    label: string
}

const storage_key = 'pkm_link_registry'

class linkregistry {
    private outbound = new Map<string, Set<string>>()
    private inbound = new Map<string, Set<string>>()
    private entries = new Map<string, Linkentry>()
    private dirty = false

    private key(source: string, target: string): string {
        return `${source}→${target}`
    }

    register(entry: Linkentry): void {
        const k = this.key(entry.sourceid, entry.targetid)
        this.entries.set(k, entry)

        if (!this.outbound.has(entry.sourceid)) this.outbound.set(entry.sourceid, new Set())
        this.outbound.get(entry.sourceid)!.add(entry.targetid)

        if (!this.inbound.has(entry.targetid)) this.inbound.set(entry.targetid, new Set())
        this.inbound.get(entry.targetid)!.add(entry.sourceid)

        this.dirty = true
        this.schedulepersist()
    }

    unregister(sourceid: string, targetid: string): void {
        const k = this.key(sourceid, targetid)
        this.entries.delete(k)
        this.outbound.get(sourceid)?.delete(targetid)
        this.inbound.get(targetid)?.delete(sourceid)
        this.dirty = true
        this.schedulepersist()
    }

    // remove all outbound links from a source (used when re-scanning document content)
    clearoutbound(sourceid: string): void {
        const targets = this.outbound.get(sourceid)
        if (!targets) return
        for (const tid of targets) {
            const k = this.key(sourceid, tid)
            this.entries.delete(k)
            this.inbound.get(tid)?.delete(sourceid)
        }
        this.outbound.delete(sourceid)
        this.dirty = true
        this.schedulepersist()
    }

    // all documents that link to this target
    getbacklinks(targetid: string): Linkentry[] {
        const sources = this.inbound.get(targetid)
        if (!sources) return []
        return [...sources]
            .map((sid) => this.entries.get(this.key(sid, targetid)))
            .filter(Boolean) as Linkentry[]
    }

    // all documents that this source links to
    getoutlinks(sourceid: string): Linkentry[] {
        const targets = this.outbound.get(sourceid)
        if (!targets) return []
        return [...targets]
            .map((tid) => this.entries.get(this.key(sourceid, tid)))
            .filter(Boolean) as Linkentry[]
    }

    // when a note is renamed, update all link labels pointing at it
    // returns ids of source documents that need their content updated
    propagaterename(targetid: string, newlabel: string): string[] {
        const sources = this.inbound.get(targetid)
        if (!sources) return []

        const affected: string[] = []
        for (const sid of sources) {
            const k = this.key(sid, targetid)
            const entry = this.entries.get(k)
            if (entry) {
                entry.label = newlabel
                affected.push(sid)
            }
        }
        this.dirty = true
        this.schedulepersist()
        return affected
    }

    // when a note is moved to a different collection
    // returns ids of source documents that need their hrefs updated
    propagatemove(targetid: string, newcollection: string): string[] {
        const sources = this.inbound.get(targetid)
        if (!sources) return []

        const affected: string[] = []
        for (const sid of sources) {
            const k = this.key(sid, targetid)
            const entry = this.entries.get(k)
            if (entry) {
                entry.targetcollection = newcollection
                affected.push(sid)
            }
        }
        this.dirty = true
        this.schedulepersist()
        return affected
    }

    // when a note is deleted, return all documents that reference it
    getorphanedlinks(targetid: string): Linkentry[] {
        return this.getbacklinks(targetid)
    }

    // remove all references to a deleted target
    purgereferences(targetid: string): string[] {
        const sources = this.inbound.get(targetid)
        if (!sources) return []

        const affected: string[] = []
        for (const sid of [...sources]) {
            this.unregister(sid, targetid)
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
    private persisttimer: ReturnType<typeof setTimeout> | null = null

    private schedulepersist(): void {
        if (this.persisttimer) return
        this.persisttimer = setTimeout(() => {
            this.persist()
            this.persisttimer = null
        }, 1000)
    }

    persist(): void {
        if (!this.dirty) return
        try {
            const data = [...this.entries.values()]
            localStorage.setItem(storage_key, JSON.stringify(data))
            this.dirty = false
        } catch (e) {
            console.error('link-Registry: persist failed', e)
        }
    }

    hydrate(): void {
        try {
            const raw = localStorage.getItem(storage_key)
            if (!raw) return
            const data: Linkentry[] = JSON.parse(raw)
            this.outbound.clear()
            this.inbound.clear()
            this.entries.clear()
            for (const e of data) this.register(e)
            this.dirty = false
        } catch (e) {
            console.error('link-Registry: hydrate failed', e)
        }
    }

    // extract links from tiptap html content
    // scans for <a href="/databases/collection/id"> patterns
    scanlinks(
        sourceid: string,
        sourcecollection: string,
        htmlcontent: string
    ): Linkentry[] {
        const found: Linkentry[] = []
        const regex = /href="\/databases\/([^/]+)\/([^"]+)"/g
        let match

        while ((match = regex.exec(htmlcontent)) !== null) {
            const targetcollection = match[1]
            const targetid = match[2]

            // try to extract label from surrounding <a> tag
            const afterhref = htmlcontent.slice(match.index)
            const labelregex = />([^<]*)</
            const labelmatch = labelregex.exec(afterhref)
            const label = labelmatch?.[1] || 'untitled'

            found.push({
                sourceid,
                sourcecollection,
                targetid,
                targetcollection,
                label,
            })
        }

        return found
    }

    // re-scan a document's content and update the registry
    rescan(sourceid: string, sourcecollection: string, htmlcontent: string): void {
        this.clearoutbound(sourceid)
        const links = this.scanlinks(sourceid, sourcecollection, htmlcontent)
        for (const link of links) {
            this.register(link)
        }
    }
}

export const registry = new linkregistry()

// hydrate on module load
registry.hydrate()