import {
  ListRecordsResponseSchema,
  GetRecordResponseSchema,
  ActionResponseSchema,
  ListCollectionsResponseSchema
} from "@/lib/api/schemas";
import axios, { AxiosInstance, AxiosError } from 'axios';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';
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
 * NocoBase API client for interacting with NocoBase backend
 * Provides methods for collections, fields, and records management
 */
export class NocoBaseClient {
  private axios: AxiosInstance;
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.NOCOBASE_URL || 'http://localhost:13000/api';
    this.apiKey = process.env.NOCOBASE_API_KEY || '';

    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          secureLogger.error('[NocoBase] Authentication failed - check API key');
        }
        return Promise.reject(error);
      }
    );
  }

  get client() {
    return this.axios;
  }

  // --- collection methods ---
  async listCollections(params: Record<string, unknown> = {}) {
    const response = await this.axios.get('/collections:list', { params });
    return normalizeListResponse(response.data);
  }

  async getCollection(name: string): Promise<CollectionResponse> {
    const response = await this.axios.get(`/collections:get?filter[name]=${name}`);
    return { data: response.data?.data?.[0] || response.data?.data };
  }

  async createCollection(data: Collection) {
    const response = await this.axios.post('/collections:create', data);
    return response.data;
  }

  async updateCollection(name: string, data: Partial<Collection>) {
    const response = await this.axios.post(`/collections:update?filter[name]=${name}`, data);
    return response.data;
  }

  async deleteCollection(name: string) {
    const response = await this.axios.post(`/collections:destroy?filter[name]=${name}`);
    return response.data;
  }

  async ensureBackendCollection() {
    const COL_NAME = 'pkm_settings';
    const SCHEMA_VERSION = '1.0.1';
    const schemaKey = `schema_version_${COL_NAME}`;

    if (typeof localStorage !== 'undefined' && storageManager.getItem(schemaKey) === SCHEMA_VERSION) {
      return true;
    }

    secureLogger.info(`[NocoBase] Checking ${COL_NAME} collection...`);
    try {
      // check if collection exists
      await this.getCollection(COL_NAME);
      if (typeof localStorage !== 'undefined') {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch {
      // create the collection
      secureLogger.info(`[NocoBase] Creating ${COL_NAME} collection...`);
      await this.createCollection({
        name: COL_NAME,
        title: 'PKM Settings',
      });
      return true;
    }
  }

  async ensureCanvasCollection() {
    const COL_NAME = 'pkm_canvases';
    const SCHEMA_VERSION = '1.0.0';
    const schemaKey = `schema_version_${COL_NAME}`;

    if (typeof localStorage !== 'undefined' && storageManager.getItem(schemaKey) === SCHEMA_VERSION) {
      return true;
    }

    secureLogger.info(`[NocoBase] Checking ${COL_NAME} collection...`);
    try {
      await this.getCollection(COL_NAME);
      if (typeof localStorage !== 'undefined') {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch {
      secureLogger.info(`[NocoBase] Creating ${COL_NAME} collection...`);
      await this.createCollection({
        name: COL_NAME,
        title: 'PKM Canvases',
      });
      return true;
    }
  }

  // --- field methods ---
  async listFields(collectionName: string): Promise<Field[]> {
    const response = await this.axios.get(`/collections/${collectionName}/fields:list`);
    return normalizeListResponse(response.data).data || [];
  }

  async createField(collection: string, data: Field) {
    const response = await this.axios.post(`/collections/${collection}/fields:create`, data);
    return response.data;
  }

  async updateField(collection: string, name: string, data: Partial<Field>) {
    const response = await this.axios.post(`/collections/${collection}/fields:update?filter[name]=${name}`, data);
    return response.data;
  }

  async deleteField(collection: string, name: string) {
    const response = await this.axios.post(`/collections/${collection}/fields:destroy?filter[name]=${name}`);
    return response.data;
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
