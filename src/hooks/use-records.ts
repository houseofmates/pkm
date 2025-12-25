
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context'; // Import useFronter
import type { NocoBaseResponse } from '@/types/nocobase';

export function useRecords(collectionName: string) {
    const { client } = useAuth();
    const { activeFronterId } = useFronter(); // Get active fronter
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<NocoBaseResponse['meta']>(undefined);

    const fetchRecords = useCallback(async (params?: { page?: number; pageSize?: number; filter?: any }) => {
        setLoading(true);
        try {
            const apiParams: any = {
                page: params?.page || 1,
                pageSize: params?.pageSize || 20,
                sort: ['-createdAt', 'id'],
            };

            if (params?.filter) {
                apiParams.filter = params.filter;
            }

            const response = await client.listRecords(collectionName, apiParams);

            setRecords(response.data || []);
            setMeta(response.meta);
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to fetch records');
        } finally {
            setLoading(false);
        }
    }, [client, collectionName]);

    useEffect(() => {
        if (collectionName) {
            fetchRecords();
        }
    }, [fetchRecords, collectionName]);

    const createRecord = useCallback(async (data: any) => {
        setLoading(true);
        try {
            // Auto-Metadata: Inject Fronter ID if active
            const payload = { ...data };
            if (activeFronterId) {
                payload.fronter = activeFronterId;
                // We could also add a readable name if standardizing on a schema, e.g. payload.fronterName
            }

            await client.createRecord(collectionName, payload);
            await fetchRecords();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [client, collectionName, fetchRecords, activeFronterId]);

    const updateRecord = useCallback(async (id: string | number, data: any) => {
        setLoading(true);
        try {
            // Auto-Metadata: Inject Fronter ID on edit too?
            // "auto metadata when a headmate is fronting and adds or edits an entry" -> Yes.
            const payload = { ...data };
            if (activeFronterId) {
                payload.lastEditedByFronter = activeFronterId; // Different field for visual audit?
                // Or just 'fronter' again if it implies ownership?
                // Use 'fronter' for creation usually. For edits, maybe 'updatedByFronter'?
                // Let's stick to injecting 'fronter' if missing, or 'lastEditedBy'
                // User said "auto metadata... edits an entry".
                // I'll add 'lastEditedByFronter' to be safe and distinct.
                payload.lastEditedByFronter = activeFronterId;
            }

            await client.updateRecord(collectionName, id, payload);
            await fetchRecords();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [client, collectionName, fetchRecords, activeFronterId]);

    const deleteRecord = useCallback(async (id: string | number) => {
        if (!confirm('Are you sure?')) return;
        setLoading(true);
        try {
            await client.deleteRecord(collectionName, id);
            await fetchRecords();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [client, collectionName, fetchRecords]);

    return { records, meta, loading, error, refresh: fetchRecords, createRecord, updateRecord, deleteRecord };
}
