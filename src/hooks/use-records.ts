import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walWrite, walCommit, walFail } from '@/lib/write-ahead-log';
import { registry } from '@/lib/link-registry';
import { extractRecords } from '@/lib/nocobase-utils';

export function useRecords(collectionName: string, initialParams: any = {}) {
  const { client } = useAuth();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;
  const queryClient = useQueryClient();

  // state for dynamic query parameters (pagination, filtering)
  const [queryParams, setQueryParams] = useState<any>({
    page: 1,
    pageSize: 20,
    ...initialParams
  });

  const fetchRecords = async () => {
    const response = await client.listRecords(collectionName, queryParams);
    console.debug('[useRecords] fetched', collectionName, queryParams, response);
    return response;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['records', collectionName, queryParams],
    queryFn: fetchRecords,
    enabled: !!collectionName,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (data !== undefined) {
      console.debug('[useRecords] data updated for', collectionName, data);
    }
  }, [data, collectionName]);


  const records: any[] = extractRecords(data);
  const meta = (data as { meta?: any })?.meta;

  // If a non-zero page returns no records, try swapping between 0/1 once.
  const [pageFallbackTried, setPageFallbackTried] = useState(false);
  useEffect(() => {
    if (
      !isLoading &&
      records.length === 0 &&
      !pageFallbackTried &&
      typeof queryParams.page === 'number'
    ) {
      const current = queryParams.page as number;
      const newPage = current === 0 ? 1 : 0;
      setQueryParams((prev: Record<string, unknown>) => ({ ...prev, page: newPage }));
      setPageFallbackTried(true);
    }
  }, [isLoading, records.length, pageFallbackTried, queryParams.page]);

  const refresh = (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setQueryParams((prev: Record<string, unknown>) => ({ ...prev, ...newParams }));
    } else {
      refetch();
    }
  };

  // create
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const payload = { ...data };
      if (activeFronterId) {
        payload.fronter = activeFronterId;
      }
      const walId = await walWrite(collectionName, 'new', 'create', payload);
      try {
        const result = await client.createRecord(collectionName, payload);
        await walCommit(walId);
        return result;
      } catch (err) {
        await walFail(walId);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', collectionName] });
    },
  });

  // update (optimistic)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Record<string, unknown> }) => {
      const payload = { ...data };
      if (activeFronterId) {
        payload.lastEditedByFronter = activeFronterId;
      }
      const walId = await walWrite(collectionName, String(id), 'update', payload);
      try {
        const result = await client.updateRecord(collectionName, id, payload);
        await walCommit(walId);
        if (typeof payload.content === 'string') {
          registry.rescan(String(id), collectionName, payload.content);
        }
        return result;
      } catch (err) {
        await walFail(walId);
        throw err;
      }
    },
    onMutate: async ({ id, data }: { id: string | number; data: Record<string, unknown> }) => {
      await queryClient.cancelQueries({ queryKey: ['records', collectionName] });
      const previousData = queryClient.getQueryData(['records', collectionName, queryParams]);

      queryClient.setQueryData(['records', collectionName, queryParams], (old: { data?: Array<{ id: string | number } & Record<string, unknown>> } | undefined) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((record) =>
            record.id === id ? { ...record, ...data } : record
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _newRecord, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['records', collectionName, queryParams], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['records', collectionName] });
    },
  });

  // delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const walId = await walWrite(collectionName, String(id), 'delete', null);
      try {
        const result = await client.deleteRecord(collectionName, id);
        await walCommit(walId);
        registry.purgeReferences(String(id));
        return result;
      } catch (err) {
        await walFail(walId);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', collectionName] });
    },
  });

  return {
    records,
    meta,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refresh,
    createRecord: (data: Record<string, unknown>) => createMutation.mutateAsync(data),
    updateRecord: (id: string | number, data: Record<string, unknown>) => updateMutation.mutateAsync({ id, data }),
    deleteRecord: (id: string | number) => deleteMutation.mutateAsync(id),
  };
}

export function useRecord(collectionName: string, recordId: string | number) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;

  const fetchRecord = async () => {
    return client.getRecord(collectionName, recordId);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['record', collectionName, recordId],
    queryFn: fetchRecord,
    enabled: !!collectionName && !!recordId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const payload = { ...data };
      if (activeFronterId) {
        payload.lastEditedByFronter = activeFronterId;
      }
      return client.updateRecord(collectionName, recordId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['record', collectionName, recordId] });
      queryClient.invalidateQueries({ queryKey: ['records', collectionName] });
    },
  });

  // Safely extract data from various response formats
  const extractRecordData = (responseData: unknown): unknown => {
    if (!responseData) return null;
    if (typeof responseData !== 'object') return responseData;

    // Try to extract from common wrapper formats
    const obj = responseData as Record<string, unknown>;
    return obj.data ?? responseData;
  };

  return {
    data: extractRecordData(data),
    loading: isLoading,
    error: error ? (error as Error).message : null,
    updateRecord: (data: Record<string, unknown>) => updateMutation.mutateAsync(data),
    refresh: refetch
  };
}
