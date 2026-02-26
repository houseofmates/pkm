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
  description?: string; // Added for cover image hack
  key?: string;
  fields?: any[];
  hidden?: boolean;
}

export type ApiResponse<T> = NocoBaseResponse<T>;
