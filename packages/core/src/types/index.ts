export type DocumentRecord = {
  id: string;
  title?: string;
  content?: string;
  accentColor?: string;
  [k: string]: unknown;
};

export type SearchHit = {
  id: string;
  score: number;
};

// re-export pocketbase compat types
export * from './pocketbase-compat';

// @deprecated backward compatibility - use pocketbase-compat.ts instead
export * as NocoBaseTypes from './pocketbase-compat';
