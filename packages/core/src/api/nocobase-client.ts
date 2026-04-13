import {
  ListRecordsResponseSchema,
  GetRecordResponseSchema,
  ActionResponseSchema,
  ListCollectionsResponseSchema
} from "@/lib/api/schemas";
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';
import { pocketBaseClient, pb } from '@/lib/pocketbase';
import { normalizeListResponse } from '@/lib/nocobase-utils';

// deprecated: these types are kept for backward compatibility during migration to pocketbase
// nocobase-specific collection/field types - use pocketbase equivalents where possible
export interface Collection {
  name: string;
  title?: string;
  displayName?: string;
  fields?: Field[];
  hidden?: boolean;
}

export interface Field {
  name: string;
  type: string;
  title?: string;
  unique?: boolean;
  interface?: string;
  hidden?: boolean;
  uiSchema?: Record<string, string | number | boolean | null | undefined>;
  optionColors?: string[];
}

interface CollectionResponse {
  data: Collection;
}

interface ApiError {
  response?: {
    status?: number;
    data?: Record<string, unknown>;
  };
  message?: string;
}

/**
 * @deprecated use pocketBaseClient from @/lib/pocketbase instead
 * this class now delegates to pocketbase for data operations
 */
export class NocoBaseClient {
  private _pb = pocketBaseClient;

  get client() {
    return this._pb.client;
  }

  // --- collection methods ---
  // @deprecated pocketbase collections are managed differently - use pb.client.collection()
  async listCollections(params: Record<string, unknown> = {}) {
    secureLogger.warn('[NocoBase] listCollections is deprecated, use pocketbase directly');
    // pocketbase doesn't have a list collections endpoint like nocobase
    // return empty list for compatibility during migration
    return { data: [] };
  }

  async getCollection(name: string): Promise<CollectionResponse> {
    secureLogger.warn(`[NocoBase] getCollection(${name}) is deprecated, use pocketbase directly`);
    // return a stub for backward compatibility
    return { data: { name, title: name, fields: [] } };
  }

  async createCollection(data: Collection) {
    secureLogger.warn('[NocoBase] createCollection is deprecated, create collections in pocketbase admin ui');
    return { data };
  }

  async updateCollection(name: string, data: Partial<Collection>) {
    secureLogger.warn('[NocoBase] updateCollection is deprecated');
    return { data: { ...data, name } };
  }

  async deleteCollection(name: string) {
    secureLogger.warn('[NocoBase] deleteCollection is deprecated');
    return { success: true };
  }

  async ensureBackendCollection() {
    const COL_NAME = 'pkm_settings';
    const SCHEMA_VERSION = '1.0.1';
    const schemaKey = `schema_version_${COL_NAME}`;

    if (typeof localStorage !== 'undefined' && storageManager.getItem(schemaKey) === SCHEMA_VERSION) {
      return true;
    }

    secureLogger.info(`[NocoBase -> PocketBase] Checking ${COL_NAME} collection...`);
    try {
      // check if collection exists in pocketbase
      await this._pb.getRecord(COL_NAME, '1').catch(() => null);
      if (typeof localStorage !== 'undefined') {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch {
      // collection may not exist - pocketbase requires admin setup
      secureLogger.warn(`[NocoBase -> PocketBase] ${COL_NAME} collection check completed`);
      return true; // assume migration handled separately
    }
  }

  async ensureCanvasCollection() {
    const COL_NAME = 'pkm_canvases';
    const SCHEMA_VERSION = '1.0.0';
    const schemaKey = `schema_version_${COL_NAME}`;

    if (typeof localStorage !== 'undefined' && storageManager.getItem(schemaKey) === SCHEMA_VERSION) {
      return true;
    }

    secureLogger.info(`[NocoBase -> PocketBase] Checking ${COL_NAME} collection...`);
    try {
      await this._pb.getRecord(COL_NAME, '1').catch(() => null);
      if (typeof localStorage !== 'undefined') {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch {
      secureLogger.warn(`[NocoBase -> PocketBase] ${COL_NAME} collection check completed`);
      return true;
    }
  }

  // --- field methods ---
  // @deprecated pocketbase fields are managed through admin ui or migrations
  async listFields(collectionName: string): Promise<Field[]> {
    secureLogger.warn('[NocoBase] listFields is deprecated');
    return [];
  }

  async createField(collection: string, data: Field) {
    secureLogger.warn('[NocoBase] createField is deprecated');
    return { data };
  }

  async updateField(collection: string, name: string, data: Partial<Field>) {
    secureLogger.warn('[NocoBase] updateField is deprecated');
    return { data: { ...data, name } };
  }

  async deleteField(collection: string, name: string) {
    secureLogger.warn('[NocoBase] deleteField is deprecated');
    return { success: true };
  }

  // --- record methods ---
  // these methods now delegate to pocketbase
  async listRecords(collection: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    try {
      const result = await this._pb.listRecords(collection, params);
      return { data: result.data, meta: result.meta };
    } catch (error) {
      secureLogger.error(`[NocoBase->PocketBase] listRecords failed for ${collection}:`, error);
      throw error;
    }
  }

  async getRecord(collection: string, id: string | number): Promise<Record<string, unknown>> {
    try {
      const result = await this._pb.getRecord(collection, String(id));
      return result;
    } catch (error) {
      secureLogger.error(`[NocoBase->PocketBase] getRecord failed for ${collection}/${id}:`, error);
      throw error;
    }
  }

  async createRecord(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    // inject entity_type: "note" when creating notes if missing
    const finalData = collection === 'notes' && !('entity_type' in data)
      ? { ...data, entity_type: 'note' }
      : data;

    try {
      const result = await this._pb.createRecord(collection, finalData);
      return result;
    } catch (error) {
      secureLogger.error(`[NocoBase->PocketBase] createRecord failed for ${collection}:`, error);
      throw error;
    }
  }

  async updateRecord(collection: string, id: string | number, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const result = await this._pb.updateRecord(collection, String(id), data);
      return result;
    } catch (error) {
      secureLogger.error(`[NocoBase->PocketBase] updateRecord failed for ${collection}/${id}:`, error);
      throw error;
    }
  }

  async deleteRecord(collection: string, id: string | number): Promise<Record<string, unknown>> {
    try {
      const result = await this._pb.deleteRecord(collection, String(id));
      return result;
    } catch (error) {
      secureLogger.error(`[NocoBase->PocketBase] deleteRecord failed for ${collection}/${id}:`, error);
      throw error;
    }
  }

  async deleteRecordByFilter(collection: string, filter: Record<string, unknown>) {
    secureLogger.warn('[NocoBase] deleteRecordByFilter not fully supported in pocketbase, using filter logic');
    // pocketbase requires fetching records first, then deleting by id
    try {
      const filterString = Object.entries(filter)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' && ');
      const records = await this._pb.getFullList(collection, { filter: filterString });
      for (const record of records) {
        if (record.id) {
          await this._pb.deleteRecord(collection, record.id);
        }
      }
      return { success: true, deleted: records.length };
    } catch (error) {
      secureLogger.error(`[NocoBase->PocketBase] deleteRecordByFilter failed for ${collection}:`, error);
      throw error;
    }
  }

  // --- storage methods ---
  async upload(file: File) {
    // pocketbase file uploads go to specific collections
    secureLogger.warn('[NocoBase] upload to generic endpoint is deprecated, use pocketbase file fields');
    return { data: { id: 'stub', filename: file.name, size: file.size } };
  }

  // --- generic request ---
  async request(resource: string, action: string, params: Record<string, unknown> = {}) {
    secureLogger.warn(`[NocoBase] generic request deprecated, use pocketbase directly for ${resource}:${action}`);
    // map common actions to pocketbase equivalents
    const { method = 'GET', data, ...rest } = params;
    try {
      const path = `/${resource}`;
      return await this._pb.request(path, { method: method as string, body: data, ...rest });
    } catch (error) {
      secureLogger.error(`[NocoBase->PocketBase] request failed for ${resource}:${action}:`, error);
      throw error;
    }
  }
}

export const api = new NocoBaseClient();
export default api;
