import { CapacitorHttp } from '@capacitor/core';
import type { NocoBaseResponse, RequestOptions, Collection } from "@/types/nocobase";

export class NocoBaseClient {
    private baseURL = 'https://db.houseofmates.space/api';

    private getToken: () => string | null;

    constructor(getToken: () => string | null) {
        this.getToken = getToken;
    }

    async request<T = any>(resource: string, action: string, options?: RequestOptions): Promise<NocoBaseResponse<T>> {
        const url = `${this.baseURL}/${resource}:${action}`;
        const token = this.getToken();

        const headers: Record<string, string> = {
            'X-Authenticator': 'basic',
            'X-Role': 'root',
            'X-With-ACL-Meta': 'true',
            'X-Locale': 'en-US',
            'Content-Type': 'application/json',
            'X-Hostname': 'db.houseofmates.space',
            'X-Timezone': '-08:00',
            ...options?.headers, // Merge any additional headers from options
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const params: any = {};
        if (options?.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (typeof value === 'object') {
                    params[key] = JSON.stringify(value);
                } else {
                    params[key] = String(value);
                }
            });
        }

        try {
            const response = await CapacitorHttp.request({
                method: (options?.method || 'GET').toUpperCase(),
                url: url,
                headers: headers,
                params: params,
                data: options?.data,
            });

            if (response.status >= 400) {
                if (response.status === 401) {
                    // Handle unauthorized
                }
                console.error("API Error Response:", response);
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(response.data)}`);
            }

            // CapacitorHttp's data property already contains the parsed JSON response
            return response.data as NocoBaseResponse<T>;
        } catch (error: any) {
            console.error("NocoBase Client Error:", error);
            throw error;
        }
    }

    // Collection operations
    async listCollections(options?: RequestOptions): Promise<NocoBaseResponse<Collection[]>> {
        return this.request<Collection[]>('collections', 'list', {
            params: {
                paginate: false,
                // 'appends': ['fields'], // REMOVED: Causing 500 error on some instances
                // sort: ['sort'], // REMOVED: Causing 500 error if sort field doesn't exist
                ...options?.params,
            },
            ...options,
        });
    }

    async getCollection(name: string) {
        return this.request('collections', 'get', {
            params: { filterByTk: name }
        });
    }

    // Record operations
    async listRecords(collection: string, params?: {
        pageSize?: number;
        page?: number;
        filter?: any;
        sort?: string[];
    }) {
        return this.request(collection, 'list', { params });
    }

    async createRecord(collection: string, data: any) {
        return this.request(collection, 'create', {
            method: 'POST',
            data
        });
    }

    async updateRecord(collection: string, id: string | number, data: any) {
        return this.request(collection, 'update', {
            method: 'POST',
            params: { filterByTk: id },
            data
        });
    }

    async deleteRecord(collection: string, id: string | number) {
        return this.request(collection, 'destroy', {
            method: 'POST', // NocoBase uses POST for destroy with filterByTk often, or delete method
            params: { filterByTk: id }
        });
    }
}
