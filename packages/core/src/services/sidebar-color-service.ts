// sidebar-color-service.ts
// Service for syncing sidebar item colors with nocobase
// enables cross-platform color persistence (web, electron, apk, exe)

import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export type SidebarItemType = 'collection' | 'folder' | 'document' | 'drawing';

export interface SidebarColorRecord {
  id?: string | number;
  item_id: string;
  item_type: SidebarItemType;
  color: string;
  icon?: string;
  icon_type?: 'lucide' | 'emoji' | 'image';
  created_at?: string;
  updated_at?: string;
}

export interface SidebarItemMetadata {
  color?: string;
  icon?: string;
  iconType?: 'lucide' | 'emoji' | 'image';
}

const COLLECTION_NAME = 'sidebar_item_colors';

/**
 * ensure the sidebar_item_colors collection exists in nocobase
 * should be called on app initialization
 */
export async function ensureSidebarColorsCollection(): Promise<boolean> {
  try {
    // check if collection exists by attempting to list
    try {
      await api.listRecords(COLLECTION_NAME, { pageSize: 1 });
      return true;
    } catch (e: any) {
      if (e?.response?.status !== 404) {
        // exists but some other error
        return true;
      }
    }

    // collection doesn't exist, create it
    secureLogger.info('[sidebar-color-service] creating sidebar_item_colors collection...');
    
    await api.createCollection({
      name: COLLECTION_NAME,
      title: 'sidebar item colors',
      fields: [
        { name: 'item_id', type: 'string', unique: true },
        { name: 'item_type', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'icon_type', type: 'string' }
      ],
      hidden: true
    });

    // wait for collection to be ready
    await new Promise(r => setTimeout(r, 1000));
    secureLogger.info('[sidebar-color-service] collection created successfully');
    return true;
  } catch (error: any) {
    if (error?.response?.status === 400) {
      // already exists (race condition)
      return true;
    }
    secureLogger.error('[sidebar-color-service] failed to create collection:', error);
    return false;
  }
}

/**
 * fetch all sidebar color records
 */
export async function fetchAllSidebarColors(): Promise<SidebarColorRecord[]> {
  try {
    const response = await api.listRecords(COLLECTION_NAME, {
      pageSize: 1000 // get all records
    });
    
    const data = Array.isArray(response.data) ? response.data : [];
    return data.map((record: any) => ({
      id: record.id,
      item_id: record.item_id,
      item_type: record.item_type,
      color: record.color,
      icon: record.icon,
      icon_type: record.icon_type,
      created_at: record.created_at,
      updated_at: record.updated_at
    }));
  } catch (error) {
    secureLogger.error('[sidebar-color-service] failed to fetch colors:', error);
    return [];
  }
}

/**
 * get color for a specific sidebar item
 */
export async function getSidebarColor(itemId: string): Promise<SidebarColorRecord | null> {
  try {
    const response = await api.listRecords(COLLECTION_NAME, {
      filter: { item_id: { $eq: itemId } },
      pageSize: 1
    });
    
    const data = Array.isArray(response.data) ? response.data : [];
    if (data.length > 0) {
      const record = data[0];
      return {
        id: record.id,
        item_id: record.item_id,
        item_type: record.item_type,
        color: record.color,
        icon: record.icon,
        icon_type: record.icon_type,
        created_at: record.created_at,
        updated_at: record.updated_at
      };
    }
    return null;
  } catch (error) {
    secureLogger.error('[sidebar-color-service] failed to get color:', error);
    return null;
  }
}

/**
 * save or update a sidebar item's color and metadata
 */
export async function saveSidebarColor(
  itemId: string,
  itemType: SidebarItemType,
  metadata: SidebarItemMetadata
): Promise<boolean> {
  try {
    // check if record exists
    const existing = await getSidebarColor(itemId);
    
    const payload = {
      item_id: itemId,
      item_type: itemType,
      color: metadata.color,
      icon: metadata.icon,
      icon_type: metadata.iconType
    };

    if (existing?.id) {
      // update existing
      await api.updateRecord(COLLECTION_NAME, existing.id, payload);
    } else {
      // create new
      await api.createRecord(COLLECTION_NAME, payload);
    }
    
    return true;
  } catch (error) {
    secureLogger.error('[sidebar-color-service] failed to save color:', error);
    return false;
  }
}

/**
 * update just the color for an item
 */
export async function updateSidebarItemColor(
  itemId: string,
  itemType: SidebarItemType,
  color: string
): Promise<boolean> {
  try {
    const existing = await getSidebarColor(itemId);
    
    if (existing?.id) {
      await api.updateRecord(COLLECTION_NAME, existing.id, { color });
    } else {
      await api.createRecord(COLLECTION_NAME, {
        item_id: itemId,
        item_type: itemType,
        color
      });
    }
    
    // broadcast change to other tabs/windows
    broadcastColorChange(itemId, color);
    
    return true;
  } catch (error) {
    secureLogger.error('[sidebar-color-service] failed to update color:', error);
    return false;
  }
}

/**
 * delete a sidebar item's color record
 */
export async function deleteSidebarColor(itemId: string): Promise<boolean> {
  try {
    const existing = await getSidebarColor(itemId);
    if (existing?.id) {
      await api.deleteRecord(COLLECTION_NAME, existing.id);
    }
    return true;
  } catch (error) {
    secureLogger.error('[sidebar-color-service] failed to delete color:', error);
    return false;
  }
}

/**
 * batch save multiple sidebar item colors
 * useful for initial sync or bulk updates
 */
export async function batchSaveSidebarColors(
  items: Array<{ itemId: string; itemType: SidebarItemType; metadata: SidebarItemMetadata }>
): Promise<boolean> {
  try {
    // process sequentially to avoid overwhelming the server
    for (const item of items) {
      await saveSidebarColor(item.itemId, item.itemType, item.metadata);
    }
    return true;
  } catch (error) {
    secureLogger.error('[sidebar-color-service] failed to batch save colors:', error);
    return false;
  }
}

/**
 * convert nav item to item type
 */
export function getItemTypeFromId(itemId: string): SidebarItemType {
  if (itemId.startsWith('folder_')) return 'folder';
  if (itemId.startsWith('doc_')) return 'document';
  if (itemId.startsWith('drawing_')) return 'drawing';
  return 'collection';
}

/**
 * broadcast color change to other tabs/windows via storage event
 */
function broadcastColorChange(itemId: string, color: string) {
  if (typeof window !== 'undefined') {
    const eventData = {
      itemId,
      color,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('pkm_sidebar_color_broadcast', JSON.stringify(eventData));
      // remove immediately to allow future broadcasts
      setTimeout(() => {
        localStorage.removeItem('pkm_sidebar_color_broadcast');
      }, 100);
    } catch {
      // ignore storage errors
    }
  }
}

/**
 * subscribe to color changes from other tabs/windows
 */
export function subscribeToColorChanges(
  callback: (itemId: string, color: string) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const handler = (e: StorageEvent) => {
    if (e.key === 'pkm_sidebar_color_broadcast' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.itemId && data.color) {
          callback(data.itemId, data.color);
        }
      } catch {
        // ignore parse errors
      }
    }
  };
  
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
