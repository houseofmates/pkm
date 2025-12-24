export interface NocoBaseResponse<T = any> {
    data: T;
    meta?: {
        count: number;
        page: number;
        pageSize: number;
        totalPage: number;
    };
}

export interface RequestOptions {
    params?: Record<string, any>;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data?: any;
    headers?: Record<string, string>;
}

export interface Collection {
    name: string;
    title?: string;
    displayName?: string;
    key?: string;
    fields?: any[];
    hidden?: boolean;
}

export type ApiResponse<T> = NocoBaseResponse<T>;
