import axios, { AxiosInstance } from "axios";
import { secureLogger } from "./secure-logger";
import { storageManager } from "./storage-manager";

const NOCOBASE_URL =
  import.meta.env.VITE_NOCOBASE_URL || "https://db.houseofmates.space/api";

// mock pb object for compatibility (deprecated but kept for imports)
export const pb = {
  authStore: {
    onChange: () => { },
    isValid: false,
    model: null,
    clear: () => { },
  },
  collection: () => ({
    getList: async () => ({ items: [], totalItems: 0 }),
    getFullList: async () => [],
    getOne: async () => ({}),
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => { },
    subscribe: () => () => { },
    unsubscribe: () => { },
  }),
  getFileUrl: () => "",
  send: async () => ({}),
};

export interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export class PocketBaseClient {
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

    // load token from storage
    this._loadAuth();
  }

  private async _loadAuth() {
    const token = await storageManager.getEncryptedItem("nocobase_token");
    const user = await storageManager.getEncryptedItem("nocobase_user");
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

  get client(): AxiosInstance {
    return this._axios;
  }

  get authStore() {
    return {
      isValid: !!this._token,
      model: this._user,
      token: this._token,
      onChange: () => { },
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
        await storageManager.setEncryptedItem("nocobase_user", JSON.stringify(user));
        this._axios.defaults.headers["Authorization"] = `Bearer ${token}`;
      }
      secureLogger.info("[NocoBase] login successful");
      return { token, user };
    } catch (error) {
      secureLogger.error("[NocoBase] login failed:", error);
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

  async listRecords<T = PocketBaseRecord>(
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

  async getFullList<T = PocketBaseRecord>(
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

  async getRecord<T = PocketBaseRecord>(
    collection: string,
    id: string | number,
  ): Promise<{ data: T }> {
    const response = await this._axios.get(`/${collection}:get?filter[id]=${id}`);
    const data = response.data?.data?.[0] || response.data?.data || response.data;
    return { data };
  }

  async createRecord<T = PocketBaseRecord>(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<{ data: T }> {
    const response = await this._axios.post(`/${collection}:create`, data);
    return { data: response.data?.data || response.data };
  }

  async updateRecord<T = PocketBaseRecord>(
    collection: string,
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<{ data: T }> {
    const response = await this._axios.post(`/${collection}:update?filter[id]=${id}`, data);
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
  ): Promise<{ data: PocketBaseRecord }> {
    const formData = new FormData();
    formData.append(field, file);
    const response = await this._axios.post(`/${collection}:create`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: response.data?.data || response.data };
  }

  getFileUrl(record: PocketBaseRecord, filename: string): string {
    // nocobase file urls are constructed differently
    return `${NOCOBASE_URL}/${record.id}/${filename}`;
  }

  subscribe<T = PocketBaseRecord>(
    collection: string,
    callback: (e: { action: string; record: T }) => void,
  ): () => void {
    // nocobase doesn't have realtime subscriptions like pocketbase
    // return a no-op unsubscribe function
    secureLogger.warn(`[NocoBase] subscriptions not supported, polling recommended for ${collection}`);
    return () => { };
  }

  unsubscribe(collection: string) {
    // no-op for nocobase
  }

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
}

export const pocketBaseClient = new PocketBaseClient();
export const nocobaseClient = pocketBaseClient;
export default pocketBaseClient;
