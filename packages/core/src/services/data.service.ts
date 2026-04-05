import { api } from '@/api/nocobase-client';
import { localDbService } from './local-db.service';
import { useCollectionsStore } from '@/store/useCollectionsStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';
import './field-types'; // for side-effect: registers default field types.
import type { FieldInstance } from './schema.service';
import { io, Socket } from 'socket.io-client';

// theme color for sync toasts
const SYNC_THEME_COLOR = '#f6b012';

// single source of truth for all 15 user collections
const HARDCODED_COLLECTIONS = [
  'activities', 'activity_logs', 'bookmarks', 'captures', 'drawings',
  'events', 'exercise', 'finances', 'habits', 'headmates',
  'hygiene-log', 'journal', 'media', 'products', 'sleep'
];

/**
 * a service that orchestrates data flow between the ui, local cache, and nocobase backend.
 * it implements a read-through cache for offline-first capabilities.
 * adds real-time sync via websocket for multi-device continuity.
 */
class DataService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeSocket();
  }

  /**
   * initialize socket.io connection for real-time data sync.
   * listens for data_update events from server and refreshes local stores.
   */
  private initializeSocket(): void {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://db.houseofmates.space';
    
    try {
      this.socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        secureLogger.info('[DataSync] websocket connected');
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        secureLogger.info('[DataSync] websocket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        secureLogger.warn('[DataSync] websocket connection error:', error.message);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          secureLogger.error('[DataSync] max reconnection attempts reached');
          this.socket?.disconnect();
        }
      });

      // listen for data updates from server (triggered by other devices)
      this.socket.on('data_update', (payload) => {
        secureLogger.info('[DataSync] received data update:', payload.type);
        this.handleDataUpdate(payload);
      });

    } catch (error) {
      secureLogger.error('[DataSync] failed to initialize socket:', error);
    }
  }

  /**
   * handle incoming data_update events from other devices.
   * refreshes relevant stores and shows sync confirmation.
   */
  private handleDataUpdate(payload: any): void {
    const { type, source } = payload;

    switch (type) {
      case 'activity_logged':
        // refresh gamification state from server
        this.refreshGamificationState();
        break;
      case 'gamification_updated':
        // refresh gamification state
        this.refreshGamificationState();
        break;
      case 'collections_updated':
        // refresh collections
        this.syncTables();
        break;
      default:
        secureLogger.info('[DataSync] unknown update type:', type);
    }

    // show subtle sync confirmation toast (only if from another device)
    if (source !== 'self') {
      toast.success(
        'system synced',
        {
          style: {
            background: '#1a1a1a',
            border: `1px solid ${SYNC_THEME_COLOR}40`,
            color: '#fff'
          },
          description: 'data updated from another device',
          duration: 2000,
          position: 'bottom-right'
        }
      );
    }
  }

  /**
   * refresh gamification state from server (nocobase as source of truth).
   * falls back to localstorage if server unavailable.
   */
  private async refreshGamificationState(): Promise<void> {
    try {
      const gamificationStore = useGamificationStore.getState();
      await gamificationStore.loadFromServer();
      secureLogger.info('[DataSync] gamification state refreshed from server');
    } catch (error) {
      secureLogger.warn('[DataSync] failed to refresh from server, using cache:', error);
    }
  }

  /**
   * emit data update event to server (for other devices to receive).
   * use this when local data changes to broadcast to other devices.
   */
  public emitDataUpdate(dataType: string, payload: any): void {
    if (this.socket?.connected) {
      this.socket.emit('client_data_update', {
        type: dataType,
        timestamp: new Date().toISOString(),
        source: 'self',
        ...payload
      });
      secureLogger.info('[DataSync] emitted data update:', dataType);
    }
  }

  /**
   * check if socket is connected.
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * creates a new nocobase collection and then triggers a fresh sync.
   * @param name the name of the collection.
   * @param fields the fields that define the collection's schema.
   */
  public async createTable(name: string, fields: FieldInstance[]): Promise<void> {
    const backendFields = fields.map(field => ({
      name: field.name,
      type: field.type,
    }));

    secureLogger.info(`Creating collection "${name}" in NocoBase...`);
    await api.createCollection({ name, fields: backendFields });

    // after creating, trigger a sync to refresh the ui and cache
    await this.syncTables();
    
    // broadcast update to other devices
    this.emitDataUpdate('collections_updated', { collection_name: name });
  }

  /**
   * syncs the list of tables/collections.
   * 1. loads and displays data from the local cache immediately.
   * 2. fetches fresh data from the nocobase backend.
   * 3. updates the local cache and the ui with the fresh data.
   */
  public async syncTables(): Promise<void> {
    // 1. load from cache and update ui immediately for instant load
    try {
      const cachedCollections = await localDbService.getAllCollections();
      if (cachedCollections && cachedCollections.length > 0) {
        secureLogger.info(`Loaded ${cachedCollections.length} collections from cache.`);
        useCollectionsStore.getState().setCollections(cachedCollections);
      }
    } catch (error) {
      secureLogger.error('Failed to load collections from cache:', error);
    }

    // 2. fetch fresh data from the network
    try {
      const response = await api.listCollections({ appends: ['fields'] });
      // handle both array and object-with-data-array responses
      const freshCollections = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      secureLogger.info(`Fetched ${freshCollections.length} collections from NocoBase.`);

      // filter out system collections and i18n template entries
      const SYSTEM_NAMES = new Set([
        'server-stats', 'pkm_backend', 'pkm_canvases', 'pkm_settings',
        'form-submissions', 'public_blocks', 'public_pages', 'site-pages',
        'website', 'front_history', 'sidebar_item_colors',
        'dupemates-stats', 'dupemates-pages', 'dupe-forms', 'llms',
        'roles', 'users',
      ]);
      const userCollections = freshCollections.filter((c: any) => {
        const name = (c.name || '').toLowerCase();
        if (SYSTEM_NAMES.has(name)) return false;
        const title = (c.title || '').toLowerCase();
        if (title.startsWith('{{t(') || title.startsWith('{{ t(')) return false;
        return true;
      });

      // merge with hardcoded collections that may be missing from api response
      const existingNames = new Set(userCollections.map((c: any) => (c.name || '').toLowerCase()));
      const missingHardcoded = HARDCODED_COLLECTIONS
        .filter(name => !existingNames.has(name.toLowerCase()))
        .map(name => ({ name, title: name, fields: [] }));
      
      // deduplicate: if api returned a collection with a slightly different name (e.g. hygiene-log vs hygiene_log), skip the hardcoded one
      const normalizedNames = new Set(userCollections.map((c: any) => (c.name || '').toLowerCase().replace(/[-_]/g, '')));
      const dedupedHardcoded = missingHardcoded.filter(hc => !normalizedNames.has(hc.name.toLowerCase().replace(/[-_]/g, '')));
      
      const mergedCollections = [...userCollections, ...dedupedHardcoded];

      // 3. update the local cache with merged data
      await localDbService.saveCollections(mergedCollections);

      // 4. update the ui (zustand store) with merged data
      useCollectionsStore.getState().setCollections(mergedCollections as any);
    } catch (error) {
      secureLogger.error('Failed to sync collections from NocoBase. App may be offline.', error);
      // if the network fails, the app will continue to run with the cached data.
    }
  }
}

export const dataService = new DataService();