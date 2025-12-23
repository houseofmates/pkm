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
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, any>;
    data?: any;
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
