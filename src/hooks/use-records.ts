
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { NocoBaseResponse } from '@/types/nocobase';

export function useRecords(collectionName: string) {
    const { client } = useAuth();
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
            await client.createRecord(collectionName, data);
            await fetchRecords();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [client, collectionName, fetchRecords]);

    const updateRecord = useCallback(async (id: string | number, data: any) => {
        setLoading(true);
        try {
            await client.updateRecord(collectionName, id, data);
            await fetchRecords();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [client, collectionName, fetchRecords]);

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
