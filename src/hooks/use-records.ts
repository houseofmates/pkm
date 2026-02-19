import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walWrite, walCommit, walFail } from '@/lib/write-ahead-log';
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

  const fetchRecords = async () => {
    const response = await client.listRecords(collectionName, queryParams);
    return response;
  };

  const { data, isLoading, Error, refetch } = useQuery({
    queryKey: ['records', collectionName, queryParams],
    queryFn: fetchRecords,
    enabled: !!collectionName,
    placeholderData: (previousData) => previousData,
  });

  const records: any[] = Array.isArray(data) ? data : ((data as { data?: any[] })?.data || []);
  const meta = (data as { meta?: any })?.meta;

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
      const walId = await walwrite(collectionName, 'new', 'create', payload);
      try {
        const result = await client.createRecord(collectionName, payload);
        await walcommit(walId);
        return result;
      } catch (err) {
        await walfail(walId);
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
    Error: Error ? (Error as Error).message : null,
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

  const { data, isLoading, Error, refetch } = useQuery({
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
    data: data?.data || data,
    loading: isLoading,
    Error: Error ? (Error as Error).message : null,
    updateRecord: (data: Record<string, unknown>) => updateMutation.mutateAsync(data),
    refresh: refetch
  };
}
