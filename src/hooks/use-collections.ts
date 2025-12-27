
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Collection } from '@/types/nocobase';
export type { Collection };

export function useCollections() {
    const { client, isAuthenticated } = useAuth();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCollections = useCallback(async () => {
        setLoading(true);
        try {
            const response = await client.listCollections();
            // NocoBase sometimes wraps the list in data.data or just data
            const rawCollections = Array.isArray(response.data) ? response.data : (response?.data as any)?.data || [];

            const systemCollections = ['users', 'roles', 'attachments', 'collection_fields', 'collections', 'ui_schemas', 'application_installations', 'cas_providers', 'oidc_providers', 'saml_providers'];

            // Defensive: if the pkm_settings collection exists but isn't hidden, attempt to mark it hidden on the server
            rawCollections.forEach(async (col: Collection) => {
                const nameNorm = (col.name || '').toLowerCase().trim();
                if (nameNorm === 'pkm_settings' && !col.hidden) {
                    try {
                        if (client?.updateCollection) {
                            // Attempt to mark it hidden so it won't show in the UI or list
                            await client.updateCollection(col.name, { hidden: true, title: col.title || 'PKM Settings' });
                        }
                    } catch (e) {
                        console.error('Failed to hide pkm_settings collection on server:', e);
                    }
                }
            });

            const filteredCollections = rawCollections.filter((col: Collection) => {
                const name = (col.name || '').toLowerCase().trim();
                const title = (col.title || '').toLowerCase().trim();

                // Exclude known system names
                if (systemCollections.includes(name)) return false;

                // Explicitly exclude pkm_settings by name/title or hidden flag
                if (name === 'pkm_settings' || name.includes('pkm_settings') || name.includes('pkm-settings') || title === 'pkm settings' || title.includes('pkm settings')) return false;

                // Exclude hidden collections
                if (col.hidden) return false;

                return true;
            });

            setCollections(filteredCollections);
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to fetch collections');
        } finally {
            setLoading(false);
        }
    }, [client, isAuthenticated]);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    return { collections, loading, error, refresh: fetchCollections };
}
