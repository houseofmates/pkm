
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

            const systemCollections = ['users', 'roles', 'attachments', 'collection_fields', 'collections', 'ui_schemas', 'application_installations', 'cas_providers', 'oidc_providers', 'saml_providers', 'pkm_settings'];

            const filteredCollections = rawCollections.filter((col: Collection) => {
                // Exclude known system names
                if (systemCollections.includes(col.name)) return false;
                // Exclude hidden collections
                if (col.hidden) return false;
                // Exclude pkm_settings variants
                if (col.name.includes('pkm_settings') || col.title?.toLowerCase() === 'pkm settings') return false;

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
