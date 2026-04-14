// use-api-keys.ts — manages llm api keys stored in nocobase for cross-device persistence
// supports multiple keys per provider with automatic 429 fallback

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { secureLogger } from '@/lib/secure-logger';

export interface ApiKeyConfig {
  id?: number;
  provider: 'nvidia' | 'openai' | 'anthropic' | 'google' | 'custom';
  name: string; // user-defined name like "nvidia-main", "nvidia-backup"
  key: string;
  model: string; // default model for this key
  priority: number; // lower = higher priority (used first)
  enabled: boolean;
  last429At?: number; // timestamp of last 429 error
}

interface ApiKeyState {
  keys: ApiKeyConfig[];
  loading: boolean;
  currentIndex: number; // which key we're currently using
}

const COLLECTION = 'pkm_api_keys';

export function useApiKeys() {
  const { isAuthenticated, token, client } = useAuth();
  const [state, setState] = useState<ApiKeyState>({
    keys: [],
    loading: true,
    currentIndex: 0,
  });
  
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ensure pkm_api_keys collection exists (auto-create on first use)
  const ensureCollection = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      await client.request(COLLECTION + ':list', { params: { pageSize: 1 }, silent: true });
    } catch (e) {
      secureLogger.info('[api-keys] collection missing, auto-creating...');
      try {
        await client.request('collections:create', {
          method: 'POST',
          body: { name: COLLECTION, title: 'PKM API Keys', hidden: true },
        });
        const fields = [
          { name: 'provider', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'key', type: 'text' },
          { name: 'model', type: 'string' },
          { name: 'priority', type: 'integer' },
          { name: 'enabled', type: 'boolean' },
          { name: 'last429At', type: 'integer' },
        ];
        for (const field of fields) {
          try {
            await client.request(COLLECTION + '/fields:create', { method: 'POST', body: field });
          } catch { /* skip existing */ }
        }
        secureLogger.info('[api-keys] collection created');
      } catch (createErr) {
        secureLogger.error('[api-keys] collection creation failed:', createErr);
      }
    }
  }, [isAuthenticated, token, client]);

  // fetch all keys from nocobase
  const fetchKeys = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    
    setState(s => ({ ...s, loading: true }));
    
    try {
      const response = await client.request(COLLECTION + ':list', {
        params: {
          filter: { enabled: { $eq: true } },
          sort: ['priority'],
          pageSize: '50',
        },
        silent: true,
      });
      
      const data = (response as { data?: ApiKeyConfig[] }).data || [];
      setState(s => ({ ...s, keys: data, loading: false, currentIndex: 0 }));
    } catch (e) {
      secureLogger.error('[api-keys] failed to fetch keys:', e);
      setState(s => ({ ...s, loading: false }));
    }
  }, [isAuthenticated, token, client]);

  // fetch on mount (ensure collection exists first)
  useEffect(() => {
    ensureCollection().then(() => fetchKeys());
  }, [ensureCollection, fetchKeys]);

  // get current active key config
  const getCurrentKey = useCallback((): ApiKeyConfig | null => {
    const { keys, currentIndex } = stateRef.current;
    // skip keys that recently got 429 (within 60 seconds)
    const now = Date.now();
    const availableKeys = keys.filter(k => 
      k.enabled && (!k.last429At || now - k.last429At > 60000)
    );
    return availableKeys[Math.min(currentIndex, availableKeys.length - 1)] || null;
  }, []);

  // mark current key as rate limited, advance to next
  const markRateLimited = useCallback(async () => {
    const { keys, currentIndex } = stateRef.current;
    if (keys.length === 0) return null;
    
    const currentKey = keys[currentIndex];
    if (!currentKey?.id) return null;
    
    // update in database
    try {
      await client.request(COLLECTION + ':update', {
        params: { filterByTk: currentKey.id },
        values: { last429At: Date.now() },
        silent: true,
      });
    } catch (e) {
      secureLogger.error('[api-keys] failed to update 429 timestamp:', e);
    }
    
    // advance to next key
    const nextIndex = (currentIndex + 1) % keys.length;
    setState(s => ({ ...s, currentIndex: nextIndex }));
    
    const nextKey = keys[nextIndex];
    secureLogger.info('[api-keys] 429 detected, switching to key:', nextKey?.name);
    
    return nextKey || null;
  }, [client]);

  // add a new key
  const addKey = useCallback(async (config: Omit<ApiKeyConfig, 'id'>) => {
    if (!isAuthenticated || !token) return null;
    
    try {
      const response = await client.request(COLLECTION + ':create', {
        values: config,
      });
      const newKey = (response as { data?: ApiKeyConfig }).data;
      
      if (newKey) {
        setState(s => ({
          ...s,
          keys: [...s.keys, newKey].sort((a, b) => a.priority - b.priority),
        }));
      }
      
      return newKey;
    } catch (e) {
      secureLogger.error('[api-keys] failed to add key:', e);
      return null;
    }
  }, [isAuthenticated, token, client]);

  // remove a key
  const removeKey = useCallback(async (id: number) => {
    if (!isAuthenticated || !token) return false;
    
    try {
      await client.request(COLLECTION + ':destroy', {
        params: { filterByTk: id },
      });
      
      setState(s => ({
        ...s,
        keys: s.keys.filter(k => k.id !== id),
      }));
      
      return true;
    } catch (e) {
      secureLogger.error('[api-keys] failed to remove key:', e);
      return false;
    }
  }, [isAuthenticated, token, client]);

  // update a key
  const updateKey = useCallback(async (id: number, updates: Partial<ApiKeyConfig>) => {
    if (!isAuthenticated || !token) return false;
    
    try {
      await client.request(COLLECTION + ':update', {
        params: { filterByTk: id },
        values: updates,
      });
      
      setState(s => ({
        ...s,
        keys: s.keys.map(k => k.id === id ? { ...k, ...updates } : k),
      }));
      
      return true;
    } catch (e) {
      secureLogger.error('[api-keys] failed to update key:', e);
      return false;
    }
  }, [isAuthenticated, token, client]);

  // prompt user to add keys if none exist
  const needsSetup = state.keys.length === 0 && !state.loading;

  return {
    ...state,
    getCurrentKey,
    markRateLimited,
    addKey,
    removeKey,
    updateKey,
    refresh: fetchKeys,
    needsSetup,
  };
}

export default useApiKeys;

async function ensureCollection() {
  try {
    await client.request('collections:get', { params: { name: 'pkm_api_keys' } });
  } catch (e) {
    await client.request('collections:create', {
      values: {
        name: 'pkm_api_keys',
        title: 'PKM API Keys',
        fields: [
          { name: 'service', type: 'string', interface: 'input' },
          { name: 'key', type: 'string', interface: 'password' }
        ]
      }
    });
  }
}
