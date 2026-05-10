/* eslint-disable */
export interface ApiListResponse<T = any> {
  data: T;
  meta?: {
    count: number;
    page: number;
    pageSize: number;
    totalPage: number;
    total?: number;
  };
}

// @deprecated use ApiListResponse instead
export type NocoBaseResponse<T = any> = ApiListResponse<T>;

export interface RequestOptions {
  params?: Record<string, any>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  silent?: boolean;
}

export interface Field {
  name: string;
  type: string;
  title?: string;
  unique?: boolean;
  interface?: string;
  hidden?: boolean;
  uiSchema?: any;
  enum?: Array<{ label: string; value: any }>;
  target?: string;
  primary?: boolean;
  [key: string]: any;
}

export interface Collection {
  name: string;
  title?: string;
  displayName?: string;
  description?: string; // added for cover image hack
  key?: string;
  fields?: any[];
  hidden?: boolean;
}

export type ApiResponse<T> = ApiListResponse<T>;

// pocketbase-specific types
export interface NocoBaseRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: any;
}

export interface PocketBaseAuthModel {
  id: string;
  email: string;
  verified: boolean;
  [key: string]: any;
}
