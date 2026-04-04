import {
  ListRecordsResponseSchema,
  GetRecordResponseSchema,
  ActionResponseSchema,
  ListCollectionsResponseSchema
} from "@/lib/api/schemas";
import { apiClient } from '@/lib/api-client';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';
import type { AxiosInstance } from 'axios';
import { normalizeListResponse } from '@/lib/nocobase-utils';

// Type definitions for NocoBase API
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

export class NocoBaseClient {
  private _axios: AxiosInstance;

  constructor() {
    this._axios = apiClient;
  }

  get client(): AxiosInstance {
    return this._axios;
  }

  // --- collection methods ---
  async listCollections(params: Record<string, unknown> = {}) {
    const res = await this._axios.get('/collections:list', { params });
    return ListCollectionsResponseSchema.parse(res.data);
  }

  async getCollection(name: string): Promise<CollectionResponse> {
    try {
      const res = await this._axios.get(`/collections/${name}:get`);
      return GetRecordResponseSchema.parse(res.data);
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err.response?.status === 404 || err.response?.status === 400 || err.response?.status === 500) {
        secureLogger.warn(`getCollection(${name}) failed, attempting fallback search...`);

        const res = await this._axios.get('/collections:list', {
          params: {
            'filter[name]': name,
            'appends': ['fields']
          }
        });

        const list: Collection[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        if (list.length > 0) {
          return { data: list[0] };
        }
      }
      throw error;
    }
  }

  async createCollection(data: Collection) {
    const res = await this._axios.post('/collections:create', data);
    return GetRecordResponseSchema.parse(res.data);
  }

  async updateCollection(name: string, data: Partial<Collection>) {
    const res = await this._axios.post(`/collections/${name}:update`, data);
    return GetRecordResponseSchema.parse(res.data);
  }

  async deleteCollection(name: string) {
    const res = await this._axios.post(`/collections/${name}:destroy`);
    return ActionResponseSchema.parse(res.data);
  }

  async ensureBackendCollection() {
    const COL_NAME = 'pkm_settings';
    const SCHEMA_VERSION = '1.0.1';
    const schemaKey = `schema_version_${COL_NAME}`;

    if (typeof localStorage !== 'undefined' && storageManager.getItem(schemaKey) === SCHEMA_VERSION) {
      return true;
    }

    try {
      await this.getCollection(COL_NAME);
      if (typeof localStorage !== 'undefined') {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch {
      // not found
    }

    secureLogger.info(`[NocoBase] Creating ${COL_NAME} collection...`);
    try {
      await this.createCollection({
        name: COL_NAME,
        title: 'PKM Settings',
        fields: [
          { name: 'key', type: 'string', unique: true },
          { name: 'value', type: 'json' }
        ]
      });
      if (typeof localStorage !== 'undefined') {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch (err) {
      secureLogger.error(`[NocoBase] Failed to create ${COL_NAME}:`, err);
      return false;
    }
  }

  // --- field methods ---
  async listFields(collectionName: string): Promise<Field[]> {
    const res = await this._axios.get(`/collections/${collectionName}/fields:list`);
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  }

  async createField(collection: string, data: Field) {
    const res = await this._axios.post(`/collections/${collection}/fields:create`, data);
    return GetRecordResponseSchema.parse(res.data);
  }

  async updateField(collection: string, name: string, data: Partial<Field>) {
    const res = await this._axios.post(`/collections/${collection}/fields:update?filterByTk=${name}`, data);
    return ActionResponseSchema.parse(res.data);
  }

  async deleteField(collection: string, name: string) {
    const res = await this._axios.post(`/collections/${collection}/fields:destroy?filterByTk=${name}`);
    return ActionResponseSchema.parse(res.data);
  }

  // --- record methods ---
  async listRecords(collection: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const res = await this._axios.get(`/${collection}:list`, { params });
    const normalized = normalizeListResponse(res.data);
    try {
      return ListRecordsResponseSchema.parse(normalized);
    } catch (parseError) {
      secureLogger.warn(`[NocoBase] listRecords parse failed for ${collection}:`, parseError);
      return normalized;
    }
  }

  async getRecord(collection: string, id: string | number): Promise<Record<string, unknown>> {
    const res = await this._axios.get(`/${collection}:get?filterByTk=${id}`);
    return GetRecordResponseSchema.parse(res.data);
  }

  async createRecord(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await this._axios.post(`/${collection}:create`, data);
    return GetRecordResponseSchema.parse(res.data);
  }

  async updateRecord(collection: string, id: string | number, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await this._axios.post(`/${collection}:update?filterByTk=${id}`, data);
    return ActionResponseSchema.parse(res.data);
  }

  async deleteRecord(collection: string, id: string | number): Promise<Record<string, unknown>> {
    const res = await this._axios.post(`/${collection}:destroy?filterByTk=${id}`);
    return ActionResponseSchema.parse(res.data);
  }

  async deleteRecordByFilter(collection: string, filter: Record<string, unknown>) {
    const filterStr = JSON.stringify(filter);
    const res = await this._axios.post(`/${collection}:destroy?filter=${encodeURIComponent(filterStr)}`);
    return ActionResponseSchema.parse(res.data);
  }

  // --- storage methods ---
  async upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this._axios.post('/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return GetRecordResponseSchema.parse(res.data);
  }

  // --- generic request ---
  async request(resource: string, action: string, params: Record<string, unknown> = {}) {
    const { method = 'GET', ...rest } = params;
    const res = await this._axios.request({
      url: `/${resource}:${action}`,
      method: method as any,
      ...rest
    });
    return res.data;
  }
}

export const api = new NocoBaseClient();
export default api;
