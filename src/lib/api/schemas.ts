import { z } from 'zod';

export const CollectionSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  displayName: z.string().optional(),
  fields: z.array(z.any()).optional(),
  hidden: z.boolean().optional(),
}).passthrough();

// backward-compatible alias
export const collectionSchema = CollectionSchema;

export const ListCollectionsResponseSchema = z.object({
  data: z.union([
  z.array(CollectionSchema),
  z.object({
  data: z.array(CollectionSchema),
  meta: z.any().optional(),
  })
  ]),
}).passthrough();

export const ListRecordsResponseSchema = z.object({
  data: z.union([
  z.array(z.any()),
  z.object({
  data: z.array(z.any()),
  meta: z.any().optional(),
  })
  ]),
}).passthrough();

export const GetRecordResponseSchema = z.object({
  data: z.any(),
}).passthrough();

export const ActionResponseSchema = z.object({
  data: z.any(),
}).passthrough();