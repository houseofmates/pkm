import PocketBase from "pocketbase";
import { secureLogger } from "./secure-logger";
import { storageManager } from "./storage-manager";

const POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL || "http://192.168.4.233:8090";

export const pb = new PocketBase(POCKETBASE_URL);

pb.authStore.onChange((token, model) => {
  if (token) {
    storageManager.setEncryptedItem("pocketbase_token", token);
    if (model) {
      storageManager.setEncryptedItem("pocketbase_user", JSON.stringify(model));
    }
  } else {
    storageManager.removeItem("pocketbase_token");
    storageManager.removeItem("pocketbase_user");
  }
  secureLogger.debug("[PocketBase] auth state changed", { hasToken: !!token });
});

export interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export class PocketBaseClient {
  private _pb: PocketBase;

  constructor() {
    this._pb = pb;
  }

  get client(): PocketBase {
    return this._pb;
  }

  get authStore() {
    return this._pb.authStore;
  }

  async login(email: string, password: string) {
    const result = await this._pb
      .collection("users")
      .authWithPassword(email, password);
    secureLogger.info("[PocketBase] login successful");
    return result;
  }

  logout() {
    this._pb.authStore.clear();
    secureLogger.info("[PocketBase] logged out");
  }

  get isAuthenticated() {
    return this._pb.authStore.isValid;
  }

  get user() {
    return this._pb.authStore.model;
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
