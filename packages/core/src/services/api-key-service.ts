// api-key-service.ts — singleton service for managing api keys
// used by llm-store to get the current key with 429 fallback

import { secureLogger } from '@/lib/secure-logger';

let keys: ApiKeyEntry[] = [];
let currentIndex = 0;

interface ApiKeyEntry {
  id: number;
  provider: string;
  name: string;
  key: string;
  model: string;
  priority: number;
  enabled: boolean;
  last429At?: number;
}

// nocobase client - injected from llm-store
let ncClient: any = null;

export function setNcClient(client: any) {
  ncClient = client;
}

export function setApiKeyList(newKeys: ApiKeyEntry[]) {
  keys = newKeys.filter(k => k.enabled).sort((a, b) => a.priority - b.priority);
  currentIndex = 0;
}

export function getCurrentApiKey(): { key: string; model: string; provider: string } | null {
  const now = Date.now();
  
  // find first available key (not recently rate limited)
  for (let i = 0; i < keys.length; i++) {
    const idx = (currentIndex + i) % keys.length;
    const k = keys[idx];
    
    // skip if rate limited within last 60 seconds
    if (k.last429At && now - k.last429At < 60000) continue;
    
    return { key: k.key, model: k.model, provider: k.provider };
  }
  
  secureLogger.warn('[api-key-service] no available api keys');
  return null;
}

export async function handleRateLimit(): Promise<{ key: string; model: string; provider: string } | null> {
  if (keys.length === 0) return null;
  
  const currentKey = keys[currentIndex];
  if (!currentKey) return null;
  
  // mark as rate limited in database
  if (ncClient && currentKey.id) {
    try {
      await ncClient.request('pkm_api_keys:update', {
        params: { filterByTk: currentKey.id },
        values: { last429At: Date.now() },
        silent: true,
      });
    } catch (e) {
      secureLogger.error('[api-key-service] failed to update 429 timestamp:', e);
    }
  }
  
  // advance to next key
  currentIndex = (currentIndex + 1) % keys.length;
  const nextKey = keys[currentIndex];
  
  if (nextKey) {
    secureLogger.info('[api-key-service] 429 detected, switching to:', nextKey.name);
    return { key: nextKey.key, model: nextKey.model, provider: nextKey.provider };
  }
  
  return null;
}

export function needsKeySetup(): boolean {
  return keys.length === 0;
}

// fetch keys from nocobase
export async function fetchApiKeys(): Promise<void> {
  if (!ncClient) return;
  
  try {
    const response = await ncClient.request('pkm_api_keys:list', {
      params: {
        filter: { enabled: { $eq: true } },
        sort: ['priority'],
        pageSize: '50',
      },
      silent: true,
    });
    
    const data = (response as { data?: ApiKeyEntry[] }).data || [];
    setApiKeyList(data);
    secureLogger.info('[api-key-service] loaded', data.length, 'api keys');
  } catch (e) {
    secureLogger.error('[api-key-service] failed to fetch keys:', e);
  }
}

// add a new key
export async function addApiKey(config: Omit<ApiKeyEntry, 'id'>): Promise<ApiKeyEntry | null> {
  if (!ncClient) return null;
  
  try {
    const response = await ncClient.request('pkm_api_keys:create', {
      values: config,
    });
    
    const newKey = (response as { data?: ApiKeyEntry }).data;
    if (newKey) {
      await fetchApiKeys(); // refresh list
    }
    return newKey || null;
  } catch (e) {
    secureLogger.error('[api-key-service] failed to add key:', e);
    return null;
  }
}
