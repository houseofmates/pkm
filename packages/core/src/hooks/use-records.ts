import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFronter } from "@/contexts/fronter-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walWrite, walCommit, walFail } from "@/lib/write-ahead-log";
import { registry } from "@/lib/link-registry";
import { secureLogger } from "@/lib/secure-logger";
import type { NocoBaseRecord } from "@/lib/nocobase";

export interface RecordPayload {
  [key: string]: unknown;
}

interface QueryParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  filter?: string;
  expand?: string;
  [key: string]: string | number | boolean | undefined;
}

interface Meta {
  total?: number;
  [key: string]: unknown;
}

export function useRecords(
  collectionName: string,
  initialParams: QueryParams = {},
) {
  const { client } = useAuth();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;
  const queryClient = useQueryClient();

  const [queryParams, setQueryParams] = useState<QueryParams>({
    page: 1,
    pageSize: 20,
    ...initialParams,
  });

  const fetchRecords = async () => {
    const response = await client.listRecords<NocoBaseRecord>(
      collectionName,
      queryParams,
    );
    secureLogger.debug(
      "[useRecords] fetched",
      collectionName,
      queryParams,
      response,
    );
    return response;
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["records", collectionName, queryParams],
    queryFn: fetchRecords,
    enabled: !!collectionName,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30000,
  });

  const records = useMemo(() => data?.data || [], [data]);
  const meta: Meta | undefined = data?.meta;

  const [pageFallbackTried, setPageFallbackTried] = useState(false);

  useEffect(() => {
    setTimeout(() => setPageFallbackTried(false), 0);
  }, [collectionName, queryParams.pageSize]);

  useEffect(() => {
    if (
      !isFetching &&
      records.length === 0 &&
      !pageFallbackTried &&
      typeof queryParams.page === "number" &&
      queryParams.page !== 0
    ) {
      const newPage = 0;
      setTimeout(() => {
        setQueryParams((prev) => ({ ...prev, page: newPage }));
        setPageFallbackTried(true);
      }, 0);
    }
  }, [isFetching, records.length, pageFallbackTried, queryParams.page]);

  const refresh = async (newParams?: Partial<QueryParams>) => {
    if (newParams) {
      setQueryParams((prev) => ({ ...prev, ...newParams }));
    }
    return refetch();
  };

  const createMutation = useMutation({
    mutationFn: async (data: RecordPayload) => {
      const payload: RecordPayload = { ...data };
      if (activeFronterId) {
        payload.fronter = activeFronterId;
      }
      const walId = await walWrite(collectionName, "new", "create", payload);
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
      queryClient.invalidateQueries({ queryKey: ["records", collectionName] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string | number;
      data: RecordPayload;
    }) => {
      const payload: RecordPayload = { ...data };
      if (activeFronterId) {
        payload.lastEditedByFronter = activeFronterId;
      }
      const walId = await walWrite(
        collectionName,
        String(id),
        "update",
        payload,
      );
      try {
        const result = await client.updateRecord(
          collectionName,
          String(id),
          payload,
        );
        await walCommit(walId);
        if (typeof payload.content === "string") {
          registry.rescan(String(id), collectionName, payload.content);
        }
        return result;
      } catch (err) {
        await walFail(walId);
        throw err;
      }
    },
    onMutate: async ({
      id,
      data,
    }: {
      id: string | number;
      data: RecordPayload;
    }) => {
      await queryClient.cancelQueries({
        queryKey: ["records", collectionName],
      });
      const previousData = queryClient.getQueryData<{
        data: NocoBaseRecord[];
      }>(["records", collectionName, queryParams]);

      queryClient.setQueryData<{ data: NocoBaseRecord[] }>(
        ["records", collectionName, queryParams],
        (old) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: old.data.map((record) =>
              String(record.id) === String(id)
                ? { ...record, ...data }
                : record,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _newRecord, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["records", collectionName, queryParams],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["records", collectionName] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const walId = await walWrite(collectionName, String(id), "delete", null);
      try {
        const result = await client.deleteRecord(collectionName, String(id));
        await walCommit(walId);
        registry.purgeReferences(String(id));
        return result;
      } catch (err) {
        await walFail(walId);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", collectionName] });
    },
  });

  return {
    records,
    meta,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refresh,
    createRecord: (data: RecordPayload) => createMutation.mutateAsync(data),
    updateRecord: (id: string | number, data: RecordPayload) =>
      updateMutation.mutateAsync({ id, data }),
    deleteRecord: (id: string | number) => deleteMutation.mutateAsync(id),
  };
}

export function useRecord(collectionName: string, recordId: string | number) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;

  const fetchRecord = async () => {
    return client.getRecord<NocoBaseRecord>(collectionName, String(recordId));
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["record", collectionName, recordId],
    queryFn: fetchRecord,
    enabled: !!collectionName && !!recordId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RecordPayload) => {
      const payload: RecordPayload = { ...data };
      if (activeFronterId) {
        payload.lastEditedByFronter = activeFronterId;
      }
      return client.updateRecord(collectionName, String(recordId), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["record", collectionName, recordId],
      });
      queryClient.invalidateQueries({ queryKey: ["records", collectionName] });
    },
  });

  const extractRecordData = (responseData: unknown): unknown => {
    if (!responseData) return null;
    if (typeof responseData !== "object") return responseData;
    const obj = responseData as Record<string, unknown>;
    return obj.data ?? responseData;
  };

  return {
    data: extractRecordData(data),
    loading: isLoading,
    error: error ? (error as Error).message : null,
    updateRecord: (data: RecordPayload) => updateMutation.mutateAsync(data),
    refresh: refetch,
  };
}
