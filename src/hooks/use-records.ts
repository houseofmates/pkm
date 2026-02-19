
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walwrite, walcommit, walfail } from '@/lib/write-ahead-log';
import { registry } from '@/lib/link-registry';

export function useRecords(collectionName: string, initialParams: any = {}) {
  const { client } = useAuth();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;
  const queryClient = useQueryClient();

  // state for dynamic query parameters (pagination, filtering)
  const [queryParams, setQueryParams] = useState<any>({
    page: 1,
    pageSize: 20,
    sort: ['-createdAt', 'id'],
    ...initialParams
  });

  // update queryparams if initialparams change (deep check or just key check? usually simplistic is fine for now)
  // actually, we shouldn't overwrite user interaction (pagination) if parent re-renders,
  // unless we want parent to control it fully.
  // let's rely on initialization for now.

  const fetchRecords = async () => {
    const response = await client.listRecords(collectionName, queryParams);
    return response; // { data: [...], meta: ... }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['records', collectionName, queryParams],
    queryFn: fetchRecords,
    enabled: !!collectionName,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new (better UX)
  });

  // handle both array response and { data: [...], meta: ... } response
  const records: any[] = Array.isArray(data) ? data : ((data as { data?: any[] })?.data || []);
  const meta = (data as { meta?: any })?.meta;

  // refresh wrapper to support updating params
  const refresh = (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setQueryParams((prev: Record<string, unknown>) => ({ ...prev, ...newParams }));
    } else {
      refetch();
    }
  };

  // --- mutations ---

  // create
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const payload = { ...data };
      if (activeFronterId) {
        payload.fronter = activeFronterId;
      }
      // write-ahead log: journal the create before executing
      const walid = await walwrite(collectionName, 'new', 'create', payload);
      try {
        const result = await client.createRecord(collectionName, payload);
        await walcommit(walid);
        return result;
      } catch (err) {
        await walfail(walid);
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
      // write-ahead log: journal the update before executing
      const walid = await walwrite(collectionName, String(id), 'update', payload);
      try {
        const result = await client.updateRecord(collectionName, id, payload);
        await walcommit(walid);
        // scan content for link references and update the registry
        if (typeof payload.content === 'string') {
          registry.rescan(String(id), collectionName, payload.content);
        }
        return result;
      } catch (err) {
        await walfail(walid);
        throw err;
      }
    },
    onMutate: async ({ id, data }: { id: string | number; data: Record<string, unknown> }) => {
      // cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['records', collectionName] });

      // snapshot previous value
      const previousData = queryClient.getQueryData(['records', collectionName, queryParams]);

      // optimistically update
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
      // rollback
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
      // write-ahead log: journal the delete before executing
      const walid = await walwrite(collectionName, String(id), 'delete', null);
      try {
        const result = await client.deleteRecord(collectionName, id);
        await walcommit(walid);
        // clean up any links pointing to this deleted record
        registry.purgeReferences(String(id));
        return result;
      } catch (err) {
        await walfail(walid);
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

  return {
    data: data?.data || data, // Handle structure variations
    loading: isLoading,
    error: error ? (error as Error).message : null,
    updateRecord: (data: Record<string, unknown>) => updateMutation.mutateAsync(data),
    refresh: refetch
  };
}
