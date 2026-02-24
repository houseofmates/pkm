// link-migration.ts
// one-time migration to scan all existing documents and populate the link registry

import { registry } from './link-registry'
import { api } from '@/api/nocobase-client'
import { storageManager } from './storage-manager'

const MIGRATION_KEY = 'pkm_link_registry_migrated'

export async function backfillLinkRegistry(): Promise<{ documents: number, links: number }> {
    const systemCollections = new Set([
        'users', 'roles', 'attachments', 'collection_fields', 'collections',
        'ui_schemas', 'application_installations', 'cas_providers',
        'oidc_providers', 'saml_providers', 'pkm_settings', 'pkm_canvases'
    ])

    let totalDocs = 0
    let totalLinks = 0

    try {
        // 1. discover all user collections
        const colRes = await api.listCollections()
        const allCols = Array.isArray(colRes?.data) ? colRes.data : []
        const userCols = allCols
            .filter((c: { name?: string; hidden?: boolean }) =>
                c.name && !systemCollections.has(c.name) && !c.hidden
            )
            .map((c: { name: string }) => c.name)

        if (userCols.length === 0) return { documents: 0, links: 0 }

        // 2. iterate each collection and scan records
        for (const col of userCols) {
            try {
                // get all records for this collection
                // we'll fetch in batches if possible, but simplest is to just list
                const res = await api.listRecords(col, { pageSize: 1000 })
                const records = Array.isArray(res) ? res : ((res as any)?.data?.data || [])

                for (const record of records) {
                    if (record.id && typeof record.content === 'string') {
                        const linksBefore = registry.size()
                        registry.rescan(String(record.id), col, record.content)
                        const linksAfter = registry.size()

                        totalDocs++
                        totalLinks += (linksAfter - linksBefore)
                    }
                }
            } catch (e) {
                console.warn(`[link-migration] skipping collection ${col}:`, e)
            }
        }

        // 3. mark as migrated
        storageManager.setItem(MIGRATION_KEY, 'true')
        registry.persist() // ensure it's saved to storage immediately

        return { documents: totalDocs, links: totalLinks }
    } catch (e) {
        console.error('[link-migration] migration failed:', e)
        throw e
    }
}

export function isLinkRegistryMigrated(): boolean {
    return storageManager.getItem(MIGRATION_KEY) === 'true'
}
