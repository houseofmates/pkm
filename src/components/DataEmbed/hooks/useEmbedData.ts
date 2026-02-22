import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/use-socket';
import api from '@/api/nocobase-client';
import { useEffect, useMemo } from 'react';

interface UseEmbedDataOptions {
  collection: string;
  view?: string;
  limit?: number;
  filters?: Record<string, any>;
  enabled?: boolean;
}

export function useEmbedData({ collection, view, limit = 20, filters, enabled = true }: UseEmbedDataOptions) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Unique key for caching
  const queryKey = useMemo(() => ['embed', collection, view, JSON.stringify(filters)], [collection, view, filters]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        page: pageParam,
        pageSize: limit,
        view,
        ...filters
      };

      const res: any = await api.listRecords(collection, params);
      return res;
    },
    getNextPageParam: (lastPage: any) => {
        const meta = lastPage?.meta;
        if (meta && meta.page < meta.totalPage) {
            return meta.page + 1;
        }
        return undefined;
    },
    enabled,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 min stale time, rely on socket for updates
  });

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload: any) => {
        const type = payload?.type?.toLowerCase();
        const col = collection.toLowerCase();

        // Broad matching to ensure updates are caught
        // 'headmate' update -> 'headmates' collection
        if (type && (col.includes(type) || type.includes(col.replace(/s$/, '')) || type === 'generic')) {
             queryClient.invalidateQueries({ queryKey });
        }
    };

    socket.on('minecraft_update', handleUpdate);

    return () => {
      socket.off('minecraft_update', handleUpdate);
    };
  }, [socket, collection, queryClient, queryKey]);

  // Flatten pages into a single list
  const records = data?.pages.flatMap((page: any) => page.data || []) || [];
  const meta = data?.pages?.[0]?.meta;

  return {
    records,
    meta,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  };
}
