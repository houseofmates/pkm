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
    const { page = 1, pageSize = 50, sort, filter, expand } = params;

    const resultList = await this._pb
      .collection(collection)
      .getList(
        typeof page === "number" ? page : 1,
        typeof pageSize === "number" ? pageSize : 50,
        {
          sort: sort as string | undefined,
          filter: filter as string | undefined,
          expand: expand as string | undefined,
        },
      );

    return {
      data: resultList.items as T[],
      meta: {
        total: resultList.totalItems,
      },
    };
  }

  async getFullList<T = PocketBaseRecord>(
    collection: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const { sort, filter, expand } = params;

    const records = await this._pb.collection(collection).getFullList({
      sort: sort as string | undefined,
      filter: filter as string | undefined,
      expand: expand as string | undefined,
    });

    return records as T[];
  }

  async getRecord<T = PocketBaseRecord>(
    collection: string,
    id: string,
  ): Promise<{ data: T }> {
    const record = await this._pb.collection(collection).getOne<T>(id);
    return { data: record };
  }

  async createRecord<T = PocketBaseRecord>(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<{ data: T }> {
    const record = await this._pb
      .collection(collection)
      .create<T>(data as Record<string, unknown>);
    return { data: record };
  }

  async updateRecord<T = PocketBaseRecord>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ data: T }> {
    const record = await this._pb
      .collection(collection)
      .update<T>(id, data as Record<string, unknown>);
    return { data: record };
  }

  async deleteRecord(
    collection: string,
    id: string,
  ): Promise<{ success: boolean }> {
    await this._pb.collection(collection).delete(id);
    return { success: true };
  }

  async uploadFile(
    collection: string,
    field: string,
    file: File,
  ): Promise<{ data: PocketBaseRecord }> {
    const formData = new FormData();
    formData.append(field, file);
    const record = await this._pb.collection(collection).create(formData);
    return { data: record };
  }

  getFileUrl(record: PocketBaseRecord, filename: string): string {
    return this._pb.getFileUrl(record, filename);
  }

  subscribe<T = PocketBaseRecord>(
    collection: string,
    callback: (e: { action: string; record: T }) => void,
  ) {
    return this._pb.collection(collection).subscribe<T>("*", (e) => {
      callback({ action: e.action, record: e.record });
    });
  }

  unsubscribe(collection: string) {
    this._pb.collection(collection).unsubscribe();
  }

  async request(path: string, options?: Record<string, unknown>) {
    return this._pb.send(path, options);
  }
}

export const pocketBaseClient = new PocketBaseClient();
export default pocketBaseClient;
