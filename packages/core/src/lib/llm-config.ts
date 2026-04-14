// helper utilities for resolving the llm endpoint
// supports: nvidia api, openai, ollama
// - api keys are stored in nocobase for cross-device sync
// - multiple keys per provider with automatic 429 fallback

import { storageManager } from "./storage-manager";
import { nocobaseClient } from "./nocobase-client";

// nvidia api configuration
export const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_MODEL = "moonshotai/kimi-k2.5";

// ollama defaults (for local inference)
export const DEFAULT_OLLAMA_MODEL = "gemma4:e4b";
export const DEFAULT_OLLAMA_URL = "http://192.168.4.250:11434";

// cached api keys from nocobase
let cachedApiKeys: ApiKeyEntry[] = [];
let currentKeyIndex = 0;
let lastFetchTime = 0;

interface ApiKeyEntry {
  id: number;
  provider: 'nvidia' | 'openai' | 'anthropic' | 'google' | 'custom';
  name: string;
  key: string;
  model: string;
  priority: number;
  enabled: boolean;
  last429At?: number;
}

// fetch api keys from nocobase (called once on app start, then cached)
export async function fetchApiKeysFromServer(): Promise<void> {
 try {
 const client = nocobaseClient;
 if (!client) return;
 
 const response = await client.request('pkm_api_keys', 'list', {
      params: {
        filter: { enabled: { $eq: true } },
        sort: ['priority'],
        pageSize: '50',
      },
      silent: true,
    });
    
    const data = (response as { data?: ApiKeyEntry[] }).data || [];
    cachedApiKeys = data.filter(k => k.enabled).sort((a, b) => a.priority - b.priority);
    currentKeyIndex = 0;
    lastFetchTime = Date.now();
    
    console.log('[llm-config] loaded', cachedApiKeys.length, 'api keys from server');
  } catch (e) {
    console.error('[llm-config] failed to fetch api keys:', e);
  }
}

// get current active api key (with 429 fallback)
export function getCurrentApiKey(): { key: string; model: string; provider: string } | null {
  const now = Date.now();
  
  // refresh if stale (5 minutes)
  if (now - lastFetchTime > 300000) {
    fetchApiKeysFromServer(); // async, will use cached for now
  }
  
  // find first available key (not recently rate limited)
  for (let i = 0; i < cachedApiKeys.length; i++) {
    const idx = (currentKeyIndex + i) % cachedApiKeys.length;
    const k = cachedApiKeys[idx];
    
    // skip if rate limited within last 60 seconds
    if (k.last429At && now - k.last429At < 60000) continue;
    
    return { key: k.key, model: k.model, provider: k.provider };
  }
  
  return null;
}

// mark current key as rate limited, advance to next
export async function markKeyRateLimited(): Promise<{ key: string; model: string; provider: string } | null> {
  if (cachedApiKeys.length === 0) return null;
  
  const currentKey = cachedApiKeys[currentKeyIndex];
  if (!currentKey?.id) return null;
  
  // update in database
  try {
    const client = getNocobaseClient();
    if (client) {
      await client.request('pkm_api_keys', 'update', {
        params: { filterByTk: currentKey.id },
        values: { last429At: Date.now() },
        silent: true,
      });
    }
  } catch (e) {
    console.error('[llm-config] failed to update 429 timestamp:', e);
  }
  
  // advance to next key
  currentKeyIndex = (currentKeyIndex + 1) % cachedApiKeys.length;
  const nextKey = cachedApiKeys[currentKeyIndex];
  
  if (nextKey) {
    console.log('[llm-config] 429 detected, switching to:', nextKey.name);
    return { key: nextKey.key, model: nextKey.model, provider: nextKey.provider };
  }
  
  return null;
}

export async function getStoredNvidiaApiKey(): Promise<string | null> {
  // first check server-stored keys
  const currentKey = getCurrentApiKey();
  if (currentKey && currentKey.provider === 'nvidia') {
    return currentKey.key;
  }
  
  // fallback to local storage (legacy)
  try {
    const stored = await storageManager.getEncryptedItem?.("nvidia_api_key");
    if (stored) return String(stored).trim();
  } catch {
    // fallback to plain storage
  }
  const plain = storageManager.getItem("nvidia_api_key");
  if (plain) return String(plain).trim();

  // also check env variable
  const envKey = import.meta.env.NVIDIA_API_KEY;
  if (envKey) return String(envKey).trim();

  return null;
}

export async function ensureNvidiaApiKey(): Promise<string | null> {
  let key = await getStoredNvidiaApiKey();
  if (!key && typeof window !== "undefined") {
    const entered = window.prompt(
      "please enter your nvidia api key (will be stored locally)",
    );
    if (entered) {
      key = entered.trim();
      try {
        await storageManager.setEncryptedItem("nvidia_api_key", key);
      } catch {
        storageManager.setItem("nvidia_api_key", key);
      }
    }
  }
  return key;
}

export async function getStoredGeminiApiKey(): Promise<string | null> {
  try {
    const stored = await storageManager.getEncryptedItem?.("gemini_api_key");
    if (stored) return String(stored).trim();
  } catch {
    // fallback to plain storage
  }
  const plain = storageManager.getItem("gemini_api_key");
  return plain ? String(plain).trim() : null;
}

export async function ensureGeminiApiKey(): Promise<string | null> {
  let key = await getStoredGeminiApiKey();
  if (!key && typeof window !== "undefined") {
    const entered = window.prompt(
      "please enter your google gemini api key (will be stored locally)",
    );
    if (entered) {
      key = entered.trim();
      try {
        await storageManager.setEncryptedItem("gemini_api_key", key);
      } catch {
        storageManager.setItem("gemini_api_key", key);
      }
    }
  }
  return key;
}

export function geminiAuthHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

// check if nvidia api is configured
export async function isNvidiaApiConfigured(): Promise<boolean> {
  const key = await getStoredNvidiaApiKey();
  return !!key;
}

// - fall back to vite env variables if provided at build time
// - default to the appropriate endpoint based on configuration
// all helpers return normalized urls (no trailing slashes) or full endpoint urls

export function normalizeBaseUrl(urlOrEndpoint?: string): string {
  if (!urlOrEndpoint) return "";
  let u = String(urlOrEndpoint).trim();
  // strip trailing slashes
  u = u.replace(/\/+$/, "");
  // remove common api suffixes if present
  u = u.replace(/(\/api\/generate|\/api\/chat|\/api)$/i, "");
  return u;
}

export function getStoredApiConfig(): {
  url: string | null;
  model: string | null;
} {
  const url =
    storageManager.getItem("ollama_url") ??
    storageManager.getItem("wilson_api_url") ??
    storageManager.getItem("gemini_api_url");
  const model =
    storageManager.getItem("ollama_model") ??
    storageManager.getItem("wilson_model") ??
    storageManager.getItem("gemini_api_key");
  return {
    url: url ? String(url).trim() : null,
    model: model ? String(model).trim() : null,
  };
}

export function storeApiConfig(url?: string, model?: string): void {
  if (url) storageManager.setItem("ollama_url", url);
  if (model) storageManager.setItem("ollama_model", model);
}

// get the base url for the llm api
// priority: nvidia api (if key configured) > stored config > env > default ollama
export function getOllamaBase(): string {
  // check for nvidia api key first
  const nvidiaKey =
    storageManager.getItem("nvidia_api_key") || import.meta.env.NVIDIA_API_KEY;
  if (nvidiaKey) {
    return NVIDIA_API_URL;
  }

  const { url } = getStoredApiConfig();
  if (url) return url.replace(/\/+$/, "");

  const env =
    import.meta.env.VITE_OLLAMA_URL || import.meta.env.VITE_GEMINI_URL;
  if (env) return String(env).replace(/\/$/, "");

  // default to local ollama at the user's ip
  return DEFAULT_OLLAMA_URL;
}

// get the model to use for the llm
// priority: nvidia api (if key configured) > stored config > env > default
export function getOllamaModel(): string {
  // check for nvidia api key first
  const nvidiaKey =
    storageManager.getItem("nvidia_api_key") || import.meta.env.NVIDIA_API_KEY;
  if (nvidiaKey) {
    return NVIDIA_MODEL;
  }

  const { model } = getStoredApiConfig();
  if (model) return model;

  const env = import.meta.env.VITE_OLLAMA_MODEL;
  if (env) return String(env);

  return DEFAULT_OLLAMA_MODEL;
}

export function getOllamaChatUrl(): string {
  const base = getOllamaBase();
  // nvidia api uses /chat/completions
  if (base === NVIDIA_API_URL) {
    return `${base}/chat/completions`;
  }
  return `${base}/api/chat`;
}

export function getOllamaGenerateUrl(): string {
  const base = getOllamaBase();
  // nvidia api uses /chat/completions for everything
  if (base === NVIDIA_API_URL) {
    return `${base}/chat/completions`;
  }
  return `${base}/api/generate`;
}
