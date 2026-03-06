// use-sidebar-colors.ts
// hook for syncing sidebar item colors across all devices via nocobase

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SidebarColorRecord,
  SidebarItemMetadata,
  SidebarItemType,
  fetchAllSidebarColors,
  saveSidebarColor,
  updateSidebarItemColor,
  deleteSidebarColor,
  getItemTypeFromId,
  subscribeToColorChanges,
  ensureSidebarColorsCollection
} from '@/services/sidebar-color-service';
import { secureLogger } from '@/lib/secure-logger';

// local cache key prefix
const CACHE_KEY_PREFIX = 'pkm_sidebar_color:';

interface SidebarColorMap {
  [itemId: string]: SidebarItemMetadata;
}

/**
 * hook for managing sidebar colors with cross-device sync
 * 
 * usage:
 * const { colors, updateColor, isLoading } = useSidebarColors();
 * 
 * // get color for an item
 * const color = colors['my_collection']?.color;
 * 
 * // update color (syncs to all devices)
 * await updateColor('my_collection', '#ff0000');
 */
export function useSidebarColors(options?: { pollIntervalMs?: number }) {
  const { isAuthenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [localColors, setLocalColors] = useState<SidebarColorMap>({});
  const pollIntervalMs = options?.pollIntervalMs ?? 30000; // default 30s
  
  // ensure collection exists on mount
  useEffect(() => {
    if (isAuthenticated) {
      ensureSidebarColorsCollection().catch(e => {
        secureLogger.warn('[use-sidebar-colors] failed to ensure collection:', e);
      });
    }
  }, [isAuthenticated]);

  // fetch colors from server
  const fetchColors = useCallback(async (): Promise<SidebarColorMap> => {
    if (!isAuthenticated || !token) {
      return {};
    }
    
    const records = await fetchAllSidebarColors();
    const colorMap: SidebarColorMap = {};
    
    for (const record of records) {
      colorMap[record.item_id] = {
        color: record.color,
        icon: record.icon,
        iconType: record.icon_type
      };
      
      // update local cache
      try {
        localStorage.setItem(
          `${CACHE_KEY_PREFIX}${record.item_id}`,
          JSON.stringify(colorMap[record.item_id])
        );
      } catch (e) {
        // ignore quota errors
      }
    }
    
    return colorMap;
  }, [isAuthenticated, token]);

  // use react-query for server state
  const { data: serverColors = {}, isLoading, error } = useQuery({
    queryKey: ['sidebar-colors'],
    queryFn: fetchColors,
    enabled: isAuthenticated,
    refetchInterval: pollIntervalMs,
    staleTime: 5000
  });

  // merge server colors with local colors (server wins)
  useEffect(() => {
    setLocalColors(prev => ({
      ...prev,
      ...serverColors
    }));
  }, [serverColors]);

  // subscribe to changes from other tabs
  useEffect(() => {
    const unsubscribe = subscribeToColorChanges((itemId, color) => {
      setLocalColors(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], color }
      }));
      
      // invalidate query to refetch from server
      queryClient.invalidateQueries({ queryKey: ['sidebar-colors'] });
    });
    
    return unsubscribe;
  }, [queryClient]);

  // mutation for updating a color
  const updateColorMutation = useMutation({
    mutationFn: async ({
      itemId,
      itemType,
      color
    }: {
      itemId: string;
      itemType: SidebarItemType;
      color: string;
    }) => {
      // optimistic update
      setLocalColors(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], color }
      }));
      
      // update local cache
      try {
        const existing = localColors[itemId] || {};
        localStorage.setItem(
          `${CACHE_KEY_PREFIX}${itemId}`,
          JSON.stringify({ ...existing, color })
        );
      } catch (e) {
        // ignore quota errors
      }
      
      // sync to server
      const success = await updateSidebarItemColor(itemId, itemType, color);
      
      if (!success) {
        throw new Error('failed to update color on server');
      }
      
      return { itemId, color };
    },
    onSuccess: () => {
      // refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['sidebar-colors'] });
    },
    onError: (error, variables) => {
      secureLogger.error('[use-sidebar-colors] update failed:', error);
      // revert optimistic update on error
      setLocalColors(prev => {
        const { [variables.itemId]: _, ...rest } = prev;
        return rest;
      });
    }
  });

  // mutation for updating full metadata (color + icon)
  const updateMetadataMutation = useMutation({
    mutationFn: async ({
      itemId,
      itemType,
      metadata
    }: {
      itemId: string;
      itemType: SidebarItemType;
      metadata: SidebarItemMetadata;
    }) => {
      // optimistic update
      setLocalColors(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], ...metadata }
      }));
      
      // update local cache
      try {
        localStorage.setItem(
          `${CACHE_KEY_PREFIX}${itemId}`,
          JSON.stringify(metadata)
        );
      } catch (e) {
        // ignore quota errors
      }
      
      // sync to server
      const success = await saveSidebarColor(itemId, itemType, metadata);
      
      if (!success) {
        throw new Error('failed to save metadata on server');
      }
      
      return { itemId, metadata };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-colors'] });
    },
    onError: (error, variables) => {
      secureLogger.error('[use-sidebar-colors] metadata update failed:', error);
      // revert on error
      setLocalColors(prev => {
        const { [variables.itemId]: _, ...rest } = prev;
        return rest;
      });
    }
  });

  // mutation for deleting a color
  const deleteColorMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const success = await deleteSidebarColor(itemId);
      
      if (!success) {
        throw new Error('failed to delete color from server');
      }
      
      return itemId;
    },
    onSuccess: (itemId) => {
      // remove from local state
      setLocalColors(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      
      // remove from cache
      try {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${itemId}`);
      } catch (e) {
        // ignore
      }
      
      queryClient.invalidateQueries({ queryKey: ['sidebar-colors'] });
    }
  });

  // helper to update just color (auto-detects item type)
  const updateColor = useCallback(
    async (itemId: string, color: string) => {
      const itemType = getItemTypeFromId(itemId);
      await updateColorMutation.mutateAsync({ itemId, itemType, color });
    },
    [updateColorMutation]
  );

  // helper to update full metadata
  const updateMetadata = useCallback(
    async (itemId: string, metadata: SidebarItemMetadata) => {
      const itemType = getItemTypeFromId(itemId);
      await updateMetadataMutation.mutateAsync({ itemId, itemType, metadata });
    },
    [updateMetadataMutation]
  );

  // helper to get color for an item (with fallback)
  const getColor = useCallback(
    (itemId: string, fallbackColor?: string): string | undefined => {
      return localColors[itemId]?.color || fallbackColor;
    },
    [localColors]
  );

  // helper to get full metadata for an item
  const getMetadata = useCallback(
    (itemId: string): SidebarItemMetadata | undefined => {
      return localColors[itemId];
    },
    [localColors]
  );

  // refetch function
  const refetch = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['sidebar-colors'] });
  }, [queryClient]);

  return {
    // state
    colors: localColors,
    isLoading,
    error,
    
    // getters
    getColor,
    getMetadata,
    
    // actions
    updateColor,
    updateMetadata,
    deleteColor: deleteColorMutation.mutateAsync,
    refetch,
    
    // mutation states
    isUpdating: updateColorMutation.isPending || updateMetadataMutation.isPending,
    isDeleting: deleteColorMutation.isPending
  };
}

/**
 * hook for getting a single sidebar item's color
 * more efficient when you only need one item's color
 */
export function useSidebarItemColor(itemId: string, fallbackColor?: string) {
  const { colors, updateColor, getColor, isLoading } = useSidebarColors();
  
  return {
    color: getColor(itemId, fallbackColor),
    metadata: colors[itemId],
    updateColor: (color: string) => updateColor(itemId, color),
    isLoading
  };
}
