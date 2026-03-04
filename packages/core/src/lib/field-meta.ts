import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function getLucideIcon(name: string): LucideIcon | undefined {
  return (Icons as unknown as Record<string, unknown>)[name] as LucideIcon | undefined;
}

export interface FieldIconInfo {
  icon?: string;
  iconType?: 'lucide' | 'emoji' | 'image';
  iconColor?: string;
}

export interface CollectionMeta {
  fieldColors?: Record<string, string>;
  fieldIcons?: Record<string, FieldIconInfo>;
  [key: string]: any;
}

export function getFieldMeta(metadata: Record<string, any>, collectionName: string | undefined) {
  if (!collectionName) return {} as CollectionMeta;
  return metadata[collectionName] || {};
}
