import {
  ListRecordsResponseSchema,
  GetRecordResponseSchema,
  ActionResponseSchema,
  ListCollectionsResponseSchema,
} from "@/lib/api/schemas";
import axios, { AxiosInstance, AxiosError } from "axios";
import { secureLogger } from "@/lib/secure-logger";
import { storageManager } from "@/lib/storage-manager";
import { normalizeListResponse } from "@/lib/nocobase-utils";

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
 * nocobase api client for interacting with nocobase backend
 * provides methods for collections, fields, and records management
 */
export class NocoBaseClient {
  private axios: AxiosInstance;
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.NOCOBASE_URL || "http://localhost:13000/api";
    this.apiKey = process.env.NOCOBASE_API_KEY || "";

    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // add request interceptor to always use latest token from storage
    // this ensures newly entered api keys are used immediately
    this.axios.interceptors.request.use(async (config) => {
      const latestToken =
        await storageManager.getEncryptedItem("nocobase_token");
      if (latestToken && latestToken.trim() !== "") {
        config.headers["Authorization"] = `Bearer ${latestToken}`;
      } else if (this.apiKey) {
        // fallback to build-time env var if no user token
        config.headers["Authorization"] = `Bearer ${this.apiKey}`;
      }
      return config;
    });

    // add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          secureLogger.error(
            "[NocoBase] Authentication failed - check API key",
          );
        }
        return Promise.reject(error);
      },
    );
  }

  get client() {
    return this.axios;
  }

  // --- collection methods ---
  async listCollections(params: Record<string, unknown> = {}) {
    const response = await this.axios.get("/collections:list", { params });
    return normalizeListResponse(response.data);
  }

  async getCollection(name: string): Promise<CollectionResponse> {
    const response = await this.axios.get(
      `/collections:get?filter[name]=${name}`,
    );
    return { data: response.data?.data?.[0] || response.data?.data };
  }

  async createCollection(data: Collection) {
    const response = await this.axios.post("/collections:create", data);
    return response.data;
  }

  async updateCollection(name: string, data: Partial<Collection>) {
    const response = await this.axios.post(
      `/collections:update?filter[name]=${name}`,
      data,
    );
    return response.data;
  }

  async deleteCollection(name: string) {
    const response = await this.axios.post(
      `/collections:destroy?filter[name]=${name}`,
    );
    return response.data;
  }

  async ensureBackendCollection() {
    const COL_NAME = "pkm_settings";
    const SCHEMA_VERSION = "1.0.1";
    const schemaKey = `schema_version_${COL_NAME}`;

    if (
      typeof localStorage !== "undefined" &&
      storageManager.getItem(schemaKey) === SCHEMA_VERSION
    ) {
      return true;
    }

    secureLogger.info(`[NocoBase] Checking ${COL_NAME} collection...`);
    try {
      // check if collection exists
      await this.getCollection(COL_NAME);
      if (typeof localStorage !== "undefined") {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch {
      // create the collection
      secureLogger.info(`[NocoBase] Creating ${COL_NAME} collection...`);
      await this.createCollection({
        name: COL_NAME,
        title: "PKM Settings",
      });
      return true;
    }
  }

  async ensureCanvasCollection() {
    const COL_NAME = "pkm_canvases";
    const SCHEMA_VERSION = "1.0.0";
    const schemaKey = `schema_version_${COL_NAME}`;

    if (
      typeof localStorage !== "undefined" &&
      storageManager.getItem(schemaKey) === SCHEMA_VERSION
    ) {
      return true;
    }

    secureLogger.info(`[NocoBase] Checking ${COL_NAME} collection...`);
    try {
      await this.getCollection(COL_NAME);
      if (typeof localStorage !== "undefined") {
        storageManager.setItem(schemaKey, SCHEMA_VERSION);
      }
      return true;
    } catch {
      secureLogger.info(`[NocoBase] Creating ${COL_NAME} collection...`);
      await this.createCollection({
        name: COL_NAME,
        title: "PKM Canvases",
      });
      return true;
    }
  }

  // --- field methods ---
  async listFields(collectionName: string): Promise<Field[]> {
    const response = await this.axios.get(
      `/collections/${collectionName}/fields:list`,
    );
    return normalizeListResponse(response.data).data || [];
  }

  async createField(collection: string, data: Field) {
    const response = await this.axios.post(
      `/collections/${collection}/fields:create`,
      data,
    );
    return response.data;
  }

  async updateField(collection: string, name: string, data: Partial<Field>) {
    const response = await this.axios.post(
      `/collections/${collection}/fields:update?filter[name]=${name}`,
      data,
    );
    return response.data;
  }

  async deleteField(collection: string, name: string) {
    const response = await this.axios.post(
      `/collections/${collection}/fields:destroy?filter[name]=${name}`,
    );
    return response.data;
  }

  // --- record methods ---
  async listRecords(
    collection: string,
    params: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const response = await this.axios.get(`/${collection}:list`, { params });
    return normalizeListResponse(response.data);
  }

  async getRecord(
    collection: string,
    id: string | number,
  ): Promise<Record<string, unknown>> {
    const response = await this.axios.get(
      `/${collection}:get?filter[id]=${id}`,
    );
    return response.data?.data?.[0] || response.data;
  }

  async createRecord(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.axios.post(`/${collection}:create`, data);
    return response.data;
  }

  async updateRecord(
    collection: string,
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.axios.post(
      `/${collection}:update?filter[id]=${id}`,
      data,
    );
    return response.data;
  }

  async deleteRecord(
    collection: string,
    id: string | number,
  ): Promise<Record<string, unknown>> {
    const response = await this.axios.post(
      `/${collection}:destroy?filter[id]=${id}`,
    );
    return response.data;
  }

  async deleteRecordByFilter(
    collection: string,
    filter: Record<string, unknown>,
  ) {
    const filterQuery = Object.entries(filter)
      .map(([key, value]) => `filter[${key}]=${value}`)
      .join("&");
    const response = await this.axios.post(
      `/${collection}:destroy?${filterQuery}`,
    );
    return response.data;
  }

  // --- storage methods ---
  async upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await this.axios.post("/uploads:create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  // --- generic request ---
  async request(
    resource: string,
    action: string,
    params: Record<string, unknown> = {},
  ) {
    const { method = "GET", data, ...rest } = params;
    const config = {
      method: method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      url: `/${resource}:${action}`,
      data,
      ...rest,
    };
    const response = await this.axios.request(config);
    return response.data;
  }
}

export const api = new NocoBaseClient();
export default api;
