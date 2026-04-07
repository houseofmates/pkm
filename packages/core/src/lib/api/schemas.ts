import { z } from 'zod';

export interface NocoBaseRecord {
  id: string | number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ListRecordsResponse<T = NocoBaseRecord> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface GetRecordResponse<T = NocoBaseRecord> {
  data: T;
}

export interface CreateRecordResponse<T = NocoBaseRecord> {
  data: T;
}

export interface UpdateRecordResponse<T = NocoBaseRecord> {
  data: T;
}

export interface DeleteRecordResponse {
  data?: null;
}

export const CollectionSchema = z.object({
  name: z.string(),
  title: z.string().nullable().optional(),
  displayName: z.string().optional(),
  fields: z.array(z.unknown()).optional(),
  hidden: z.boolean().optional(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export const ListCollectionsResponseSchema = z.object({
  data: z.union([
    z.array(CollectionSchema),
    z.object({
      data: z.array(CollectionSchema),
      meta: z.unknown().optional(),
    })
  ]),
});

export const ListRecordsResponseSchema = z.object({
  data: z.union([
    z.array(z.unknown()),
    z.object({
      data: z.array(z.unknown()),
      meta: z.unknown().optional(),
    })
  ]),
}).passthrough();

export const GetRecordResponseSchema = z.object({
  data: z.unknown(),
}).passthrough();

export const ActionResponseSchema = z.object({
  data: z.unknown(),
}).passthrough();

export const collectionSchema = CollectionSchema;
