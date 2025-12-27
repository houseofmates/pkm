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
                data: options?.data,
                silent: options?.silent
            });

            return data as NocoBaseResponse<T>;
        } catch (error: any) {
            if (options?.silent !== true) {
                console.error("NocoBase Client Error:", error);
            }
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
            headers: (this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}) as Record<string, string>,
            data: formData
        });
    }

    // Download attachment as a Blob using the server proxy to avoid CORS issues
    async downloadAttachmentBlob(attachmentId: string) {
        const headers = (this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}) as Record<string, string>;

        const attempts = [
            `/attachments/${attachmentId}/download`,
            `/attachments/${attachmentId}`,
            `/attachments/${attachmentId}?download=true`,
        ];

        for (const endpoint of attempts) {
            try {
                const resp = await apiRequest('nocobase', endpoint, {
                    method: 'GET',
                    headers,
                    responseType: 'blob'
                });

                // apiRequest returns a Blob for 'blob' responseType
                if (resp instanceof Blob) return resp as Blob;

                // Some proxies might wrap blob inside data
                if (resp && (resp as any).data instanceof Blob) return (resp as any).data as Blob;

            } catch (error) {
                console.warn(`[NocoBase] download attempt failed (${endpoint}) for id ${attachmentId}:`, error);
                // try next
            }
        }

        throw new Error(`All download attempts failed for attachment ${attachmentId}`);
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

    // Ensure pkm_backend collection exists for avatar storage
    async ensureBackendCollection() {
        try {
            // Check if pkm_backend collection exists
            await this.getCollection('pkm_backend');
        } catch (error) {
            // Collection doesn't exist, create it
            try {
                await this.createCollection({
                    name: 'pkm_backend',
                    title: 'PKM Backend Storage',
                    hidden: true, // Hide from UI
                    description: 'Backend storage for PKM app data like avatars'
                });

                // Add required fields
                await this.createField('pkm_backend', {
                    name: 'type',
                    type: 'string',
                    title: 'Type',
                    description: 'Type of stored data (avatar, etc.)'
                });

                await this.createField('pkm_backend', {
                    name: 'member_id',
                    type: 'string',
                    title: 'Member ID',
                    description: 'Associated headmate member ID'
                });

                await this.createField('pkm_backend', {
                    name: 'attachment_id',
                    type: 'bigInt',
                    title: 'Attachment ID',
                    description: 'Reference to attachment record'
                });

                await this.createField('pkm_backend', {
                    name: 'filename',
                    type: 'string',
                    title: 'Filename',
                    description: 'Original filename'
                });

                await this.createField('pkm_backend', {
                    name: 'mime_type',
                    type: 'string',
                    title: 'MIME Type',
                    description: 'File MIME type'
                });

                await this.createField('pkm_backend', {
                    name: 'url',
                    type: 'string',
                    title: 'URL',
                    description: 'File URL'
                });

            } catch (createError) {
                console.warn('Failed to create pkm_backend collection:', createError);
            }
        }
    }
}
