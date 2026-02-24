import { ListRecordsResponseSchema, GetRecordResponseSchema, ActionResponseSchema, ListCollectionsResponseSchema } from "@/lib/api/schemas";
import { apiClient } from '@/lib/api-client';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';
import type { AxiosInstance } from 'axios';
import { normalizeListResponse } from '@/lib/nocobase-utils';

// Type definitions for NocoBase API
interface Collection {
  name: string;
  title?: string;
  fields?: Field[];
  hidden?: boolean;
}

interface Field {
  name: string;
  type: string;
  unique?: boolean;
  interface?: string;
  hidden?: boolean;
  uiSchema?: any;
}

interface CollectionResponse {
  data: Collection;
}

interface ApiError {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

interface RequestParams {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  [key: string]: unknown;
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
  async listCollections(params = {}) {
    // actions are usually resource:action
    const res = await this._axios.get('/collections:list', { params });
    return ListCollectionsResponseSchema.parse(res.data);
  }
  async getCollection(name: string): Promise<CollectionResponse> {
    try {
      const res = await this._axios.get(`/collections/${name}:get`);
      return GetRecordResponseSchema.parse(res.data);
    } catch (error: unknown) {
      const err = error as ApiError;
      // fallback: if 404/400 (likely due to name mismatch with id), try filtered list
      if (err.response?.status === 404 || err.response?.status === 400 || err.response?.status === 500) {
        secureLogger.warn(`getCollection(${name}) failed, attempting fallback search...`);

        // attempt 1: exact name match
        const res = await this._axios.get('/collections:list', {
          params: {
            'filter[name]': name,
            'appends': ['fields'] // Ensure fields are returned
          }
        });

        let list: Collection[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        if (list.length > 0) {
          return { data: list[0] as Collection };
        }

        // attempt 2: case-insensitive match (postgres/general)
        // trying both $ilike and $like to be safe across db types
        secureLogger.warn(`getCollection(${name}) exact match failed, attempting case-insensitive...`);
        try {
          const res2 = await this._axios.get('/collections:list', {
            params: {
              'filter[name.$ilike]': name, // Postgres
              'appends': ['fields']
            }
          });
          list = Array.isArray(res2.data) ? res2.data : (res2.data?.data || []);
          if (list.length > 0) return { data: list[0] };

          // try $like?
          const res3 = await this._axios.get('/collections:list', {
            params: {
              'filter[name.$like]': name,
              'appends': ['fields']
            }
          });
          list = Array.isArray(res3.data) ? res3.data : (res3.data?.data || []);
          if (list.length > 0) return { data: list[0] };

        } catch (_e) {
          secureLogger.warn("Case insensitive search failed", _e);
        }
      }

      // attempt 3: brute force (fetch all and find)
      secureLogger.warn(`getCollection(${name}) still failing, attempting brute - force list search...`);
      try {
        // try with fields first (removed paginate: false in case it's problematic)
        let res = await this._axios.get('/collections:list', {
          params: {
            'appends': ['fields']
          }
        });
        const list: Collection[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const found = list.find((c: Collection) => (c.name || '').toLowerCase() === (name || '').toLowerCase());

        if (found) {
          secureLogger.info(`FOUND collection ${name} via brute force(with fields) !`);
          return { data: found };
        }

        // try without fields (exact same as usecollections/sidebar)
        secureLogger.warn(`getCollection(${name}) not found with fields, trying bare list...`);
        res = await this._axios.get('/collections:list'); // No params
        const list2: Collection[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const found2 = list2.find((c: Collection) => (c.name || '').toLowerCase() === (name || '').toLowerCase());

        if (found2) {
          secureLogger.info(`FOUND collection ${name} via bare list!`);
          // if we found it without fields, we return it.
          // the ui might lack field definitions but it won't 404.
          return { data: found2 as Collection };
        }

      } catch (_e) {
        secureLogger.warn("Brute force search failed", _e);
      }


      throw error;
    }
  }

  async createCollection(data: Collection): Promise<CollectionResponse> {
    const res = await this._axios.post('/collections:create', data);
    return GetRecordResponseSchema.parse(res.data);
  }
  async updateCollection(name: string, data: Partial<Collection>): Promise<unknown> {
    try {
      // use filterbytk for better compatibility
      const res = await this._axios.post(`/collections:update?filterByTk=${name}`, data);
      return ActionResponseSchema.parse(res.data);
    } catch (error: unknown) {
      const err = error as ApiError;
      // if 404, it might be a case-sensitivity mismatch. try to resolve the real name.
      if (err.response?.status === 404) {
        secureLogger.warn(`updateCollection(${name}) 404, attempting to resolve real name...`);
        try {
          const col = await this.getCollection(name);
          // handle both { data: collection } and collection structure
          const realName = col?.data?.name || (col as unknown as Collection)?.name;

          if (realName && realName !== name) {
            secureLogger.info(`Resolved collection name mismatch: ${name} -> ${realName}. Retrying update.`);
            const res = await this._axios.post(`/collections/${realName}:update`, data);
            return ListRecordsResponseSchema.parse(res.data);
          }
        } catch (findError) {
          secureLogger.warn("Failed to resolve collection for retry", findError);
        }
      }
      throw error;
    }
  }
  async deleteCollection(name: string): Promise<unknown> {
    const res = await this._axios.delete(`/collections/${name}`);
    return ActionResponseSchema.parse(res.data);
  }
  async ensureBackendCollection() {
    try {
      // check if exists
      try {
        await this.getCollection('pkm_settings');
        return true;
      } catch (e) {
        // likely 404, proceed to create
      }

      await this.createCollection({
        name: 'pkm_settings',
        title: 'PKM Settings',
        fields: [
          { name: 'key', type: 'string', unique: true },
          { name: 'value', type: 'json' }
        ],
        hidden: true
      });
      return true;
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err?.response?.status === 400) return true; // Already exists race condition
      secureLogger.warn('Backend collection check failed', error);
      return false;
    }
  }

  // ensure pkm_canvases collection exists with correct schema (for syncing drawings)
  async ensureCanvasesCollection() {
    const COL_NAME = 'pkm_canvases';
    const SCHEMA_VERSION = 'v2'; // Increment this when schema changes

    // check if we need to recreate (stored in localstorage)
    const schemaKey = `nocobase_schema_${COL_NAME}`;
    const currentSchema = typeof localStorage !== 'undefined' ? storageManager.getItem(schemaKey) : null;

    if (currentSchema === SCHEMA_VERSION) {
      // schema is up to date, just verify collection exists
      try {
        await this._axios.get(`/${COL_NAME}:list`, { params: { pageSize: 1 } });
        return true;
      } catch (e: unknown) {
        const err = e as ApiError;
        if (err?.response?.status !== 404) {
          return true; // Collection exists but some other error
        }

        // fall through to create
      }
    }

    // delete existing collection if it exists (to fix schema)
    secureLogger.info(`[NocoBase] Resetting ${COL_NAME} collection to fix schema...`);
    try {
      await this._axios.post(`/collections:destroy?filterByTk=${COL_NAME}`);
      secureLogger.info(`[NocoBase] Deleted old ${COL_NAME} collection`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      // ignore delete errors - collection might not exist
    }

    // create with correct schema
    secureLogger.info(`[NocoBase] Creating ${COL_NAME} collection with correct schema...`);
    try {
      await this.createCollection({
        name: COL_NAME,
        title: 'PKM Canvases',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'content', type: 'text' },  // Compressed base64 string
          { name: 'thumbnail', type: 'text' }  // Base64 image string
        ]
      });
      await new Promise(r => setTimeout(r, 2000));

      // mark schema as current
      if (typeof localStorage !== 'undefined') {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }

      console.log(`[NocoBase] ${COL_NAME} collection created successfully`);
      return true;
    } catch (createError: unknown) {
      const errMsg = createError instanceof Error ? createError.message : String(createError);
      secureLogger.error(`[NocoBase] Failed to create ${COL_NAME}:`, errMsg);
      return false;
    }
  }

  async createDrawingRecord(title = 'untitled drawing') {
    const COL_NAME = 'pkm_canvases';

    // internal helper to ensure collection
    const ensure = async () => {
      try {
        await this.getCollection(COL_NAME);
        return true;
      } catch (e) {
        // not found
      }

      secureLogger.info(`Creating ${COL_NAME} collection...`);

      await this.createCollection({
        name: COL_NAME,
        title: 'PKM Canvases',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'content', type: 'json' },
          { name: 'thumbnail', type: 'json' }
        ]
      });
      // verification wait
      await new Promise(r => setTimeout(r, 1000));
      return true;
    };

    // 1. ensure collection exists
    await ensure();

    // 2. try create record
    try {
      const createRes = await this.createRecord(COL_NAME, {
        title,
        content: ''
      });
      return ListRecordsResponseSchema.parse((createRes as { data?: unknown }).data);
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err?.response?.status === 404) {

        secureLogger.warn("First create attempt failed 404, retrying ensure...", error);
        await ensure(); // Force check/create again
        await new Promise(r => setTimeout(r, 1000)); // Wait more
        // retry create
        const retryRes = await this.createRecord(COL_NAME, {
          title,
          content: ''
        });
        return ListRecordsResponseSchema.parse((retryRes as { data?: unknown }).data);
      }
      throw error;
    }
  }

  // --- field/record methods ---
  async createField(collection: string, data: Field): Promise<unknown> {
    const res = await this._axios.post(`/collections/${collection}/fields:create`, data);
    return GetRecordResponseSchema.parse(res.data);
  }
  async updateField(collection: string, name: string, data: Partial<Field>): Promise<unknown> {
    const res = await this._axios.post(`/collections/${collection}/fields:update?filterByTk=${name}`, data);
    return ActionResponseSchema.parse(res.data);
  }
  async listRecords(collection: string, params: Record<string, unknown> = {}): Promise<unknown> {
    // remove /obj/ prefix, use <collection>:list
    const res = await this._axios.get(`/${collection}:list`, { params });

    // diagnostic logging so we can see what NocoBase actually returned
    secureLogger.info(`[NocoBase] listRecords(${collection}) raw response:`, res.data);

    // normalize response to a consistent { data: Array, meta?: any } shape
    const normalized = normalizeListResponse(res.data);

    // parse with our schema; if it fails log a warning and return the
    // normalized object directly so callers can still access the array.
    try {
      return ListRecordsResponseSchema.parse(normalized);
    } catch (parseError) {
      secureLogger.warn(`[NocoBase] listRecords parse failed after normalization for ${collection}:`, parseError);
      // return normalized result as a best-effort fallback
      return normalized;
    }
  }
  async getRecord(collection: string, id: string | number): Promise<unknown> {
    const res = await this._axios.get(`/${collection}:get?filterByTk=${id}`);
    return GetRecordResponseSchema.parse(res.data);
  }
  async createRecord(collection: string, data: Record<string, unknown>): Promise<unknown> {
    // normalize: ensure notes created via ui/backend include entity_type: 'note'
    // this enforces metadata consistency for note templates and downstream plugins
    if (collection === 'notes' && data && typeof data === 'object' && !('entity_type' in data)) {
      data = { ...data, entity_type: 'note' }
    }

    // remove /obj/ prefix, use <collection>:create
    const res = await this._axios.post(`/${collection}:create`, data);
    return GetRecordResponseSchema.parse(res.data);
  }
  async updateRecord(collection: string, id: string | number, data: Record<string, unknown>): Promise<unknown> {
    // use filterbytk query param for reliable update, matching deleterecord
    const res = await this._axios.post(`/${collection}:update?filterByTk=${id}`, data);
    return ActionResponseSchema.parse(res.data);
  }
  async deleteRecord(collection: string, id: string | number): Promise<unknown> {
    // use filterbytk query param for reliable deletion
    const res = await this._axios.post(`/${collection}:destroy?filterByTk=${id}`);
    return ActionResponseSchema.parse(res.data);
  }

  // --- file/storage methods ---
  async upload(file: File): Promise<unknown> {
    const formData = new FormData();
    formData.append('file', file);

    // try pkm backend upload first (for background images)
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4100';
      const res = await fetch(`${backendUrl}/Api/upload-background`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        secureLogger.info('[Upload] Using PKM backend upload:', data);
        return data;
      }
    } catch (err) {
      secureLogger.warn('[Upload] PKM backend upload failed, falling back to NocoBase:', err);
    }

    // fallback to nocobase attachments endpoint
    const res = await this._axios.post('/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return GetRecordResponseSchema.parse(res.data);
  }

  // --- generic request ---
  async request(resource: string, action: string, params: RequestParams = {}): Promise<unknown> {
    const { method = 'GET', ...rest } = params;
    return this._axios.request({
      url: `/${resource}:${action}`,
      method,
      ...rest
    });
  }
}

export const api = new NocoBaseClient();
export default api;
