import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walWrite, walCommit, walFail } from '@/lib/write-ahead-log';
import { registry } from '@/lib/link-registry';
import { extractRecords } from '@/lib/nocobase-utils';
import { secureLogger } from '@/lib/secure-logger';

interface QueryParams {
  page?: number;
  pageSize?: number;
  [key: string]: string | number | boolean | undefined;
}

interface Meta {
  total?: number;
  [key: string]: unknown;
}

export function useRecords(collectionName: string, initialParams: QueryParams = {}) {
  const { client } = useAuth();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;
  const queryClient = useQueryClient();

  // state for dynamic query parameters (pagination, filtering)
  const [queryParams, setQueryParams] = useState<QueryParams>({
    page: 1,
    pageSize: 20,
    ...initialParams
  });

  const fetchRecords = async () => {
    const response = await client.listRecords(collectionName, queryParams);
    secureLogger.debug('[useRecords] fetched', collectionName, queryParams, response);
    return response;
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['records', collectionName, queryParams],
    queryFn: fetchRecords,
    enabled: !!collectionName,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30000, // consider data fresh for 30 seconds
  });

  const records = useMemo(() => extractRecords(data), [data]);
  const meta: Meta | undefined = (data as { meta?: Meta })?.meta;

  // handle pagination fallback without imperative settimeout
  const [pageFallbackTried, setPageFallbackTried] = useState(false);

  useEffect(() => {
    // reset fallback flag when collection or filters change significantly
    setPageFallbackTried(false);
  }, [collectionName, queryParams.pageSize]);

  useEffect(() => {
    if (
      !isFetching &&
      records.length === 0 &&
      !pageFallbackTried &&
      typeof queryParams.page === 'number' &&
      queryParams.page !== 0
    ) {
      const newPage = queryParams.page === 1 ? 0 : 1;
      setPageFallbackTried(true);
    }
  }, [isFetching, records.length, pageFallbackTried, queryParams.page]);

  const refresh = async (newParams?: Partial<QueryParams>) => {
    if (newParams) {
      setQueryParams((prev) => ({ ...prev, ...newParams }));
    }
    return refetch();
  };

  // create record mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...data };
      if (activeFronterId) {
        (payload as any).fronter = activeFronterId;
      }
      const walId = await walWrite(collectionName, 'new', 'create', payload);
      try {
        const result = await client.createRecord(collectionName, payload as any);
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

  // update record mutation (with optimistic updates)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Record<string, unknown> }) => {
      const payload: Record<string, unknown> = { ...data };
      if (activeFronterId) {
        (payload as any).lastEditedByFronter = activeFronterId;
      }
      const walId = await walWrite(collectionName, String(id), 'update', payload);
      try {
        const result = await client.updateRecord(collectionName, id, payload as any);
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

      queryClient.setQueryData(['records', collectionName, queryParams], (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((record: any) =>
            String(record.id) === String(id) ? { ...record, ...data } : record
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

  // delete record mutation
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
      const payload: Record<string, unknown> = { ...data };
      if (activeFronterId) {
        (payload as any).lastEditedByFronter = activeFronterId;
      }
      return client.updateRecord(collectionName, recordId, payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['record', collectionName, recordId] });
      queryClient.invalidateQueries({ queryKey: ['records', collectionName] });
    },
  });

  // extract data from various response formats safely
  const extractRecordData = (responseData: unknown): unknown => {
    if (!responseData) return null;
    if (typeof responseData !== 'object') return responseData;
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
