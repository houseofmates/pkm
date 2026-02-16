import { ListRecordsResponseSchema, GetRecordResponseSchema, ActionResponseSchema, ListCollectionsResponseSchema } from "@/lib/api/schemas";
// @ts-nocheck
import { apiClient } from '@/lib/api-client';

export class NocoBaseClient {
 constructor() {
  // RENAME internal variable to avoid conflict
  this._axios = apiClient;
 }

 // Getter to allow 'this.client' access without writing to it
 get client() {
  return this._axios;
 }

 // --- Collection Methods ---
 async listCollections(params = {}) {
  // Actions are usually resource:action
  const res = await this._axios.get('/collections:list', { params });
  return ListCollectionsResponseSchema.parse(res.data);
 }
 async getCollection(name) {
  try {
 const res = await this._axios.get(`/collections/${name}:get`);
 return GetRecordResponseSchema.parse(res.data);
  } catch (error) {
 // Fallback: If 404/400 (likely due to name mismatch with ID), try filtered list
 if (error.response?.status === 404 || error.response?.status === 400 || error.response?.status === 500) {
  console.warn(`getCollection(${name}) failed, attempting fallback search...`);

  // Attempt 1: Exact Name Match
  let res = await this._axios.get('/collections:list', {
   params: {
  'filter[name]': name,
  'appends': ['fields'] // Ensure fields are returned
   }
  });

  let list = Array.isArray(res.data) ? res.data : (res.data?.data || []);

  if (list.length > 0) {
   return { data: list[0] };
  }

  // Attempt 2: Case-Insensitive Match (Postgres/General)
  // Trying both $ilike and $like to be safe across DB types
  console.warn(`getCollection(${name}) exact match failed, attempting case-insensitive...`);
  try {
   res = await this._axios.get('/collections:list', {
  params: {
   'filter[name.$ilike]': name, // Postgres
   'appends': ['fields']
  }
   });
   list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
   if (list.length > 0) return { data: list[0] };

   // Try $like?
   res = await this._axios.get('/collections:list', {
  params: {
   'filter[name.$like]': name,
   'appends': ['fields']
  }
   });
   list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
   if (list.length > 0) return { data: list[0] };

  } catch (e) {
   console.warn("Case insensitive search failed", e);
  }
 }

 // Attempt 3: Brute Force (Fetch all and find)
 console.warn(`getCollection(${name}) still failing, attempting brute - force list search...`);
 try {
  // Try WITH fields first (removed paginate: false in case it's problematic)
  let res = await this._axios.get('/collections:list', {
   params: {
  'appends': ['fields']
   }
  });
  let list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  let found = list.find(c => (c.name || '').toLowerCase() === (name || '').toLowerCase());

  if (found) {
   console.log(`FOUND collection ${name} via brute force(with fields) !`);
   return { data: found };
  }

  // Try WITHOUT fields (Exact same as useCollections/sidebar)
  console.warn(`getCollection(${name}) not found with fields, trying bare list...`);
  res = await this._axios.get('/collections:list'); // No params
  list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  found = list.find(c => (c.name || '').toLowerCase() === (name || '').toLowerCase());

  if (found) {
   console.log(`FOUND collection ${name} via bare list!`);
   // If we found it without fields, we return it.
   // The UI might lack field definitions but it won't 404.
   return { data: found };
  }

 } catch (e) {
  console.warn("Brute force search failed", e);
 }

 throw error;
  }
 }

 async createCollection(data) {
  const res = await this._axios.post('/collections:create', data);
  return GetRecordResponseSchema.parse(res.data);
 }
 async updateCollection(name, data) {
  try {
 // Use filterByTk for better compatibility
 const res = await this._axios.post(`/collections:update?filterByTk=${name}`, data);
 return ActionResponseSchema.parse(res.data);
  } catch (error) {
 // If 404, it might be a case-sensitivity mismatch. Try to resolve the real name.
 if (error.response?.status === 404) {
  console.warn(`updateCollection(${name}) 404, attempting to resolve real name...`);
  try {
   const col = await this.getCollection(name);
   // Handle both { data: Collection } and Collection structure
   const realName = col?.data?.name || col?.name;

   if (realName && realName !== name) {
  console.log(`Resolved collection name mismatch: ${name} -> ${realName}. Retrying update.`);
  const res = await this._axios.post(`/collections/${realName}:update`, data);
  return ListRecordsResponseSchema.parse(res.data);
   }
  } catch (findError) {
   console.warn("Failed to resolve collection for retry", findError);
  }
 }
 throw error;
  }
 }
 async deleteCollection(name) {
  const res = await this._axios.delete(`/collections/${name}`);
  return ActionResponseSchema.parse(res.data);
 }
 async ensureBackendCollection() {
  try {
 // Check if exists
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
  } catch (error) {
 if (error?.response?.status === 400) return true; // Already exists race condition
 console.warn('Backend collection check failed', error);
 return false;
  }
 }

 // Ensure pkm_canvases collection exists with correct schema (for syncing drawings)
 async ensureCanvasesCollection() {
  const COL_NAME = 'pkm_canvases';
  const SCHEMA_VERSION = 'v2'; // Increment this when schema changes

  // Check if we need to recreate (stored in localStorage)
  const schemaKey = `nocobase_schema_${COL_NAME}`;
  const currentSchema = typeof localStorage !== 'undefined' ? localStorage.getItem(schemaKey) : null;

  if (currentSchema === SCHEMA_VERSION) {
 // Schema is up to date, just verify collection exists
 try {
  await this._axios.get(`/${COL_NAME}:list`, { params: { pageSize: 1 } });
  return true;
 } catch (e: any) {
  if (e?.response?.status !== 404) {
   return true; // Collection exists but some other error
  }
  // Fall through to create
 }
  }

  // Delete existing collection if it exists (to fix schema)
  console.log(`[NocoBase] Resetting ${COL_NAME} collection to fix schema...`);
  try {
 await this._axios.post(`/collections:destroy?filterByTk=${COL_NAME}`);
 console.log(`[NocoBase] Deleted old ${COL_NAME} collection`);
 await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
 // Ignore delete errors - collection might not exist
  }

  // Create with correct schema
  console.log(`[NocoBase] Creating ${COL_NAME} collection with correct schema...`);
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

 // Mark schema as current
 if (typeof localStorage !== 'undefined') {
  localStorage.setItem(schemaKey, SCHEMA_VERSION);
 }

 console.log(`[NocoBase] ${COL_NAME} collection created successfully`);
 return true;
  } catch (createError: any) {
 console.error(`[NocoBase] Failed to create ${COL_NAME}:`, createError?.message || createError);
 return false;
  }
 }

 async createDrawingRecord(title = 'untitled drawing') {
  const COL_NAME = 'pkm_canvases';

  // Internal helper to ensure collection
  const ensure = async () => {
 try {
  await this.getCollection(COL_NAME);
  return true;
 } catch (e) {
  // Not found
 }

 console.log(`Creating ${COL_NAME} collection...`);
 await this.createCollection({
  name: COL_NAME,
  title: 'PKM Canvases',
  fields: [
   { name: 'title', type: 'string' },
   { name: 'content', type: 'json' },
   { name: 'thumbnail', type: 'json' }
  ]
 });
 // Verification wait
 await new Promise(r => setTimeout(r, 1000));
 return true;
  };

  // 1. Ensure collection exists
  await ensure();

  // 2. Try create record
  try {
 const res = await this.createRecord(COL_NAME, {
  title,
  content: ''
 });
 return ListRecordsResponseSchema.parse(res.data);
  } catch (error) {
 // @ts-ignore
 if (error?.response?.status === 404) {
  console.warn("First create attempt failed 404, retrying ensure...", error);
  await ensure(); // Force check/create again
  await new Promise(r => setTimeout(r, 1000)); // Wait more
  // Retry create
  const res = await this.createRecord(COL_NAME, {
   title,
   content: ''
  });
  return ListRecordsResponseSchema.parse(res.data);
 }
 throw error;
  }
 }

 // --- Field/Record Methods ---
 async createField(collection, data) {
  const res = await this._axios.post(`/collections/${collection}/fields:create`, data);
  return GetRecordResponseSchema.parse(res.data);
 }
 async updateField(collection, name, data) {
  const res = await this._axios.post(`/collections/${collection}/fields:update?filterByTk=${name}`, data);
  return ActionResponseSchema.parse(res.data);
 }
 async listRecords(collection, params = {}) {
  // Remove /obj/ prefix, use <collection>:list
  const res = await this._axios.get(`/${collection}:list`, { params });
  return ListRecordsResponseSchema.parse(res.data);
 }
 async getRecord(collection, id) {
  const res = await this._axios.get(`/${collection}:get?filterByTk=${id}`);
  return GetRecordResponseSchema.parse(res.data);
 }
 async createRecord(collection, data) {
  // Remove /obj/ prefix, use <collection>:create
  const res = await this._axios.post(`/${collection}:create`, data);
  return GetRecordResponseSchema.parse(res.data);
 }
 async updateRecord(collection, id, data) {
  // Use filterByTk query param for reliable update, matching deleteRecord
  const res = await this._axios.post(`/${collection}:update?filterByTk=${id}`, data);
  return ActionResponseSchema.parse(res.data);
 }
 async deleteRecord(collection, id) {
  // Use filterByTk query param for reliable deletion
  const res = await this._axios.post(`/${collection}:destroy?filterByTk=${id}`);
  return ActionResponseSchema.parse(res.data);
 }

 // --- File/Storage Methods ---
 async upload(file) {
  const formData = new FormData();
  formData.append('file', file);

  // Try PKM backend upload first (for background images)
  try {
 const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4100';
 const res = await fetch(`${backendUrl}/api/upload-background`, {
  method: 'POST',
  body: formData,
 });

 if (res.ok) {
  const data = await res.json();
  console.log('[Upload] Using PKM backend upload:', data);
  return data;
 }
  } catch (err) {
 console.warn('[Upload] PKM backend upload failed, falling back to NocoBase:', err);
  }

  // Fallback to NocoBase attachments endpoint
  const res = await this._axios.post('/attachments', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
  });
  return GetRecordResponseSchema.parse(res.data);
 }

 // --- Generic Request ---
 async request(resource, action, params = {}) {
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
