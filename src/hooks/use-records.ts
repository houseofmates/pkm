
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useRecords(collectionName: string, initialParams: any = {}) {
  const { client } = useAuth();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;
  const queryClient = useQueryClient();

  // State for dynamic query parameters (pagination, filtering)
  const [queryParams, setQueryParams] = useState<any>({
  page: 1,
  pageSize: 20,
  sort: ['-createdAt', 'id'],
  ...initialParams
  });

  // Update queryParams if initialParams change (deep check or just key check? usually simplistic is fine for now)
  // Actually, we shouldn't overwrite user interaction (pagination) if parent re-renders,
  // unless we want parent to control it fully.
  // Let's rely on initialization for now.

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

  // Handle both array response and { data: [...], meta: ... } response
  const records: any[] = Array.isArray(data) ? data : ((data as { data?: any[] })?.data || []);
  const meta = (data as { meta?: any })?.meta;

  // Refresh wrapper to support updating params
  const refresh = (newParams?: Record<string, unknown>) => {
  if (newParams) {
  setQueryParams((prev: Record<string, unknown>) => ({ ...prev, ...newParams }));
  } else {
  refetch();
  }
  };

  // --- Mutations ---

  // Create
  const createMutation = useMutation({
  mutationFn: async (data: Record<string, unknown>) => {
  const payload = { ...data };
  if (activeFronterId) {
 payload.fronter = activeFronterId;
  }
  return client.createRecord(collectionName, payload);
  },
  onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['records', collectionName] });
  },
  });

  // Update (Optimistic)
  const updateMutation = useMutation({
  mutationFn: async ({ id, data }: { id: string | number; data: Record<string, unknown> }) => {
  const payload = { ...data };
  if (activeFronterId) {
 payload.lastEditedByFronter = activeFronterId;
  }
  return client.updateRecord(collectionName, id, payload);
  },
  onMutate: async ({ id, data }: { id: string | number; data: Record<string, unknown> }) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: ['records', collectionName] });

  // Snapshot previous value
  const previousData = queryClient.getQueryData(['records', collectionName, queryParams]);

  // Optimistically update
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
  // Rollback
  if (context?.previousData) {
 queryClient.setQueryData(['records', collectionName, queryParams], context.previousData);
  }
  },
  onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['records', collectionName] });
  },
  });

  // Delete
  const deleteMutation = useMutation({
  mutationFn: async (id: string | number) => {
  return client.deleteRecord(collectionName, id);
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
