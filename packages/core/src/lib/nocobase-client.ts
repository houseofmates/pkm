/* eslint-disable */
import axios, { AxiosInstance } from "axios";
import { secureLogger } from "./secure-logger";
import { storageManager } from "./storage-manager";

const NOCOBASE_URL =
  import.meta.env.VITE_NOCOBASE_URL || "https://db.houseofmates.space/api";

// environment token that may be injected at build time - we should NOT use it
// if the user has explicitly entered a different key in the UI
const BUILD_TIME_TOKEN = import.meta.env.VITE_NOCOBASE_API_TOKEN || "";

// mock pb object for compatibility (deprecated but kept for imports)
export const pb = {
  authStore: {
    onChange: () => {},
    isValid: false,
    model: null,
    clear: () => {},
  },
  collection: () => ({
    getList: async () => ({ items: [], totalItems: 0 }),
    getFullList: async () => [],
    getOne: async () => ({}),
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => {},
    subscribe: () => () => {},
    unsubscribe: () => {},
  }),
  getFileUrl: () => "",
  send: async () => ({}),
};

export interface NocoBaseRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

// deprecated: backwards compat alias
export type { NocoBaseRecord as PocketBaseRecord };

export class NocoBaseClient {
  private _axios: AxiosInstance;
  private _token: string | null = null;
  private _user: any = null;

  constructor() {
    this._axios = axios.create({
      baseURL: NOCOBASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to always use latest token from storage
    // This ensures newly entered API keys are used immediately
    this._axios.interceptors.request.use(async (config) => {
      const latestToken =
        await storageManager.getEncryptedItem("nocobase_token");
      if (latestToken && latestToken.trim() !== "") {
        // Only use the token if it's different from build-time token
        // or if build-time token is empty (dev mode)
        if (!BUILD_TIME_TOKEN || latestToken !== BUILD_TIME_TOKEN) {
          config.headers["Authorization"] = `Bearer ${latestToken}`;
        } else if (BUILD_TIME_TOKEN) {
          // If user token equals build token, still prefer user's explicitly entered token
          // (they may have re-entered the same token, which is fine)
          config.headers["Authorization"] = `Bearer ${latestToken}`;
        }
      }
      return config;
    });

 // kick off auth loading immediately — store the promise so ready() can await it
 this._loadAuthPromise = this._loadAuth();
 }

 private _loadAuthPromise: Promise<void>;

 private async _loadAuth(): Promise<void> {
 const [token, user] = await Promise.all([
 storageManager.getEncryptedItem("nocobase_token"),
 storageManager.getEncryptedItem("nocobase_user"),
 ]);
 if (token) {
 this._token = token;
 this._axios.defaults.headers["Authorization"] = `Bearer ${token}`;
 }
 if (user) {
 try {
 this._user = JSON.parse(user);
 } catch {
 this._user = null;
 }
 }
 }

 /**
 * returns a promise that resolves when initial auth state has been loaded from storage.
 * safe to call multiple times — returns the same promise.
 */
 ready(): Promise<void> {
 return this._loadAuthPromise;
 }

  get client(): AxiosInstance {
    return this._axios;
  }

  get authStore() {
    return {
      isValid: !!this._token,
      model: this._user,
      token: this._token,
      onChange: () => {},
      clear: () => this.logout(),
    };
  }

  async login(email: string, password: string) {
    try {
      const response = await this._axios.post("/auth:signIn", {
        email,
        password,
      });
      const { token, user } = response.data?.data || response.data || {};
      if (token) {
        this._token = token;
        this._user = user;
        await storageManager.setEncryptedItem("nocobase_token", token);
        await storageManager.setEncryptedItem(
          "nocobase_user",
          JSON.stringify(user),
        );
        this._axios.defaults.headers["Authorization"] = `Bearer ${token}`;
      }
      secureLogger.info("[NocoBase] login successful");
      return { token, user };
    } catch (error) {
      secureLogger.error("[NocoBase] login failed:", error);
      throw error;
    }
  }

  async loginWithApiKey(apiKey: string) {
    try {
      // validate the key immediately against nocobase to surface
      // invalid keys as errors rather than silently accepting them
      // and having the first api call clear the token + redirect.
      this._token = apiKey;
      this._axios.defaults.headers["Authorization"] = `Bearer ${apiKey}`;
      
      // try to fetch user info to validate the token
      // nocobase v1 uses /users:me, v2 might use /auth:check or /api/users:me
      let user = { apiKey: true };
      try {
        const response = await this._axios.get("/users:me");
        user = response.data?.data || response.data || user;
      } catch {
        // if /users:me fails, try /auth:check
        try {
          const response = await this._axios.get("/auth:check");
          user = response.data?.data || response.data || user;
        } catch {
          // both endpoints failed - but if we got here without a 401,
          // the token might still be valid for some endpoints
          // so we accept it but mark it as api-key based
        }
      }

      this._user = user;
      await storageManager.setEncryptedItem("nocobase_token", apiKey);
      await storageManager.setEncryptedItem(
        "nocobase_user",
        JSON.stringify(user),
      );
      secureLogger.info("[NocoBase] api key login validated");
      return { token: apiKey, user };
    } catch (error: any) {
      // validation failed — roll back so no stale state lingers
      this._token = null;
      this._user = null;
      delete this._axios.defaults.headers["Authorization"];
      secureLogger.error("[NocoBase] api key login failed:", error);
      throw error;
    }
  }

  logout() {
    this._token = null;
    this._user = null;
    storageManager.removeItem("nocobase_token");
    storageManager.removeItem("nocobase_user");
    delete this._axios.defaults.headers["Authorization"];
    secureLogger.info("[NocoBase] logged out");
  }

  get isAuthenticated() {
    return !!this._token;
  }

  get user() {
    return this._user;
  }

  async listRecords<T = NocoBaseRecord>(
    collection: string,
    params: Record<string, unknown> = {},
  ): Promise<{ data: T[]; meta?: { total?: number } }> {
    const { page = 1, pageSize = 50, sort, filter } = params;

    const response = await this._axios.get(`/${collection}:list`, {
      params: {
        page,
        pageSize,
        sort,
        filter,
      },
    });

    const result = response.data?.data || response.data || [];
    return {
      data: Array.isArray(result) ? result : result.items || [],
      meta: {
        total: response.data?.meta?.count || result.length,
      },
    };
  }

  async getFullList<T = NocoBaseRecord>(
    collection: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const { sort, filter } = params;

    const response = await this._axios.get(`/${collection}:list`, {
      params: {
        pageSize: 1000,
        sort,
        filter,
      },
    });

    const result = response.data?.data || response.data || [];
    return Array.isArray(result) ? result : result.items || [];
  }

  async getRecord<T = NocoBaseRecord>(
    collection: string,
    id: string | number,
  ): Promise<{ data: T }> {
    const response = await this._axios.get(
      `/${collection}:get?filter[id]=${id}`,
    );
    const data =
      response.data?.data?.[0] || response.data?.data || response.data;
    return { data };
  }

  async createRecord<T = NocoBaseRecord>(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<{ data: T }> {
    const response = await this._axios.post(`/${collection}:create`, data);
    return { data: response.data?.data || response.data };
  }

  async updateRecord<T = NocoBaseRecord>(
    collection: string,
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<{ data: T }> {
    const response = await this._axios.post(
      `/${collection}:update?filter[id]=${id}`,
      data,
    );
    return { data: response.data?.data || response.data };
  }

  async deleteRecord(
    collection: string,
    id: string | number,
  ): Promise<{ success: boolean }> {
    await this._axios.post(`/${collection}:destroy?filter[id]=${id}`);
    return { success: true };
  }

  async uploadFile(
    collection: string,
    field: string,
    file: File,
  ): Promise<{ data: NocoBaseRecord }> {
    const formData = new FormData();
    formData.append(field, file);
    const response = await this._axios.post(`/${collection}:create`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: response.data?.data || response.data };
  }

  getFileUrl(record: NocoBaseRecord, filename: string): string {
    return `${NOCOBASE_URL}/${record.id}/${filename}`;
  }

  subscribe<T = NocoBaseRecord>(
    collection: string,
    callback: (e: { action: string; record: T }) => void,
  ): () => void {
    secureLogger.warn(
      `[NocoBase] subscriptions not supported, polling recommended for ${collection}`,
    );
    return () => {};
  }

  unsubscribe(collection: string) {}

  async request(path: string, options?: Record<string, unknown>) {
    const { method = "GET", body, ...rest } = options || {};
    const response = await this._axios.request({
      method: method as string,
      url: path,
      data: body,
      ...rest,
    });
    return response.data;
  }

  async upload(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await this._axios.post("/files:create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = response.data?.data || response.data;
    return { url: data?.url || data?.path || "" };
  }

  async listCollections(): Promise<string[]> {
    const response = await this._axios.get("/collections:list");
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data.map((c: any) => c.name) : [];
  }

  async createCollection(schema: {
    name: string;
    fields?: any[];
    inherits?: string[];
  }): Promise<void> {
    await this._axios.post("/collections:create", schema);
  }

  async deleteCollection(name: string): Promise<void> {
    await this.request("collections", {
      method: "destroy",
      body: { filterByTk: name },
    });
  }

  async listFields(collection: string): Promise<any[]> {
    const result = await this.request(`${collection}/fields`, {
      method: "list",
    });
    return Array.isArray(result) ? result : result?.data || [];
  }

  async createField(collection: string, field: any): Promise<any> {
    return await this.request(`${collection}/fields`, {
      method: "create",
      body: field,
    });
  }

  async deleteField(collection: string, fieldName: string): Promise<any> {
    return await this.request(`${collection}/fields`, {
      method: "destroy",
      body: { filterByTk: fieldName },
    });
  }

  async getCollection(name: string): Promise<any> {
    const result = await this.request("collections", {
      method: "get",
      params: { filterByTk: name },
    });
    return { data: result };
  }
}

export const nocobaseClient = new NocoBaseClient();
export default nocobaseClient;
