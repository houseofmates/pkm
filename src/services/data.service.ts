import { api } from '@/api/nocobase-client';
import { localDbService } from './local-db.service';
import { usePkmStore } from '@/store/usePkmStore';
import './field-types'; // For side-effect: registers default field types.
import type { FieldInstance } from './schema.service';

/**
 * A service that orchestrates data flow between the UI, local cache, and NocoBase backend.
 * It implements a read-through cache for offline-first capabilities.
 */
class DataService {

  /**
   * Creates a new NocoBase collection and then triggers a fresh sync.
   * @param name The name of the collection.
   * @param fields The fields that define the collection's schema.
   */
  public async createTable(name: string, fields: FieldInstance[]): Promise<void> {
    const backendFields = fields.map(field => ({
      name: field.name,
      type: field.type,
    }));

    secureLogger.info(`Creating collection "${name}" in NocoBase...`);
    await api.createCollection({ name, fields: backendFields });

    // After creating, trigger a sync to refresh the UI and cache
    await this.syncTables();
  }

  /**
   * Syncs the list of tables/collections.
   * 1. Loads and displays data from the local cache immediately.
   * 2. Fetches fresh data from the NocoBase backend.
   * 3. Updates the local cache and the UI with the fresh data.
   */
  public async syncTables(): Promise<void> {
    // 1. Load from cache and update UI immediately for instant load
    try {
      const cachedCollections = await localDbService.getAllCollections();
      if (cachedCollections && cachedCollections.length > 0) {
        secureLogger.info(`Loaded ${cachedCollections.length} collections from cache.`);
        usePkmStore.getState().setCollections(cachedCollections);
      }
    } catch (error) {
      secureLogger.error('Failed to load collections from cache:', error);
    }

    // 2. Fetch fresh data from the network
    try {
      const response = await api.listCollections();
      // Handle both array and object-with-data-array responses
      const freshCollections = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      secureLogger.info(`Fetched ${freshCollections.length} collections from NocoBase.`);

      // 3. Update the local cache with fresh data
      await localDbService.saveCollections(freshCollections);

      // 4. Update the UI (Zustand store) with fresh data
      usePkmStore.getState().setCollections(freshCollections);
    } catch (error) {
      secureLogger.error('Failed to sync collections from NocoBase. App may be offline.', error);
      // If the network fails, the app will continue to run with the cached data.
    }
  }
}

export const dataService = new DataService();