import type { NocoBaseResponse, RequestOptions, Collection } from "@/types/nocobase";
import { apiRequest } from '@/lib/api-client';

export class NocoBaseClient {


    private getToken: () => string | null;

    constructor(getToken: () => string | null) {
        this.getToken = getToken;
    }

    async request<T = any>(resource: string, action: string, options?: RequestOptions): Promise<NocoBaseResponse<T>> {
        const endpoint = `${resource}:${action}`;
        const token = this.getToken();

        const headers: Record<string, string> = {
            'X-Authenticator': 'basic',
            'X-Role': 'root',
            'X-With-ACL-Meta': 'true',
            'X-Locale': 'en-US',
            'X-Hostname': 'db.houseofmates.space',
            'X-Timezone': '-08:00',
            ...options?.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const data = await apiRequest('nocobase', endpoint, {
                method: options?.method,
                headers,
                params: options?.params,
                data: options?.data
            });

            return data as NocoBaseResponse<T>;
        } catch (error: any) {
            console.error("NocoBase Client Error:", error);
            throw error;
        }
    }

    // Collection operations
    async listCollections(options?: RequestOptions): Promise<NocoBaseResponse<Collection[]>> {
        const response = await this.request<Collection[]>('collections', 'list', {
            params: {
                paginate: false,
                ...options?.params,
            },
            ...options,
        });

        // Global filter to hide pkm_settings from the entire app
        if (response.data && Array.isArray(response.data)) {
            response.data = response.data.filter(c => {
                const name = (c.name || '').toLowerCase();
                const title = (c.title || '').toLowerCase();
                if (name.includes('pkm_settings') || name === 'pkm_settings') return false;
                if (title.includes('pkm settings') || title === 'pkm settings') return false;
                return true;
            });
        }
        return response;
    }

    async getCollection(name: string) {
        return this.request('collections', 'get', {
            params: { filterByTk: name }
        });
    }

    async createCollection(data: Partial<Collection>) {
        return this.request('collections', 'create', {
            method: 'POST',
            data
        });
    }



    async deleteCollection(name: string) {
        return this.request('collections', 'destroy', {
            method: 'POST',
            params: { filterByTk: name }
        });
    }

    async updateCollection(name: string, data: any) {
        return this.request('collections', 'update', {
            method: 'POST',
            params: { filterByTk: name },
            data
        });
    }

    // Specialized upload for handling FormData
    async upload(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        // Use standard REST endpoint for persistence reliability
        return apiRequest('nocobase', '/attachments', {
            method: 'POST',
            headers: this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {},
            data: formData
        });
    }

    async createField(collectionName: string, data: any) {
        return this.request('fields', 'create', {
            method: 'POST',
            data: {
                collectionName,
                ...data
            }
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
