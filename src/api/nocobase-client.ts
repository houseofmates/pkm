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
            'X-Timezone': '-08:00'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Build query string for GET requests
        let queryString = '';
        if (options?.params) {
            const params = new URLSearchParams();
            Object.entries(options.params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
                }
            });
            queryString = '?' + params.toString();
        }

        try {
            const response = await fetch(url + queryString, {
                method: options?.method || 'GET',
                headers,
                body: options?.data ? JSON.stringify(options.data) : undefined,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Handle unauthorized 
                }

                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
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
