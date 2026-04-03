// helper utilities for resolving the LLM endpoint (Google Gemini)
// - prefer a runtime user setting stored in localstorage ('gemini_api_url', fallback to 'wilson_api_url')
// - storageManager wrapper used for safer access

import { storageManager } from './storage-manager';

/**
 * the default gemini model wilson should use
 */
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5-coder:7b-instruct-q4_K_S';
export const DEFAULT_OLLAMA_URL = 'http://192.168.4.250:11434';

export function getStoredGeminiApiKey(): string | null {
  const stored = storageManager.getEncryptedItem?.('gemini_api_key') ?? storageManager.getItem('gemini_api_key');
  return stored ? String(stored).trim() : null;
}

export async function ensureGeminiApiKey(): Promise<string | null> {
  let key = getStoredGeminiApiKey();
  if (!key && typeof window !== 'undefined') {
    const entered = window.prompt('please enter your google gemini api key (will be stored locally)');
    if (entered) {
      key = entered.trim();
      try {
        storageManager.setEncryptedItem('gemini_api_key', key);
      } catch {
        storageManager.setItem('gemini_api_key', key);
      }
    }
  }
  return key;
}

export function appendGeminiApiKeyToUrl(url: string, apiKey: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.get('key')) {
      u.searchParams.set('key', apiKey);
    }
    return u.toString();
  } catch {
    return url.includes('?') ? `${url}&key=${encodeURIComponent(apiKey)}` : `${url}?key=${encodeURIComponent(apiKey)}`;
  }
}

// - fall back to vite_gemini_url / vite_ollama_url if provided at build time
// - default to the google gemini public api endpoint when nothing else is configured
// all helpers return normalized urls (no trailing slashes) or full endpoint URLs

export function normalizeBaseUrl(urlOrEndpoint?: string): string {
  if (!urlOrEndpoint) return '';
  let u = String(urlOrEndpoint).trim();
  // strip trailing slashes
  u = u.replace(/\/+$/, '');
  // remove common api suffixes if present
  u = u.replace(/(\/api\/generate|\/api\/chat|\/api)$/i, '');
  return u;
}

export function getStoredApiConfig(): { url: string | null; model: string | null } {
  const url = storageManager.getItem('ollama_url') ?? storageManager.getItem('wilson_api_url') ?? storageManager.getItem('gemini_api_url');
  const model = storageManager.getItem('ollama_model') ?? storageManager.getItem('wilson_model') ?? storageManager.getItem('gemini_api_key');
  return { url: url ? String(url).trim() : null, model: model ? String(model).trim() : null };
}

export function storeApiConfig(url?: string, model?: string): void {
  if (url) storageManager.setItem('ollama_url', url);
  if (model) storageManager.setItem('ollama_model', model);
}

export function getOllamaBase(): string {
  const { url } = getStoredApiConfig();
  if (url) return url.replace(/\/+$/, '');

  const env = import.meta.env.VITE_OLLAMA_URL || import.meta.env.VITE_GEMINI_URL;
  if (env) return String(env).replace(/\/$/, '');

  // default to local Ollama at the user's IP
  return DEFAULT_OLLAMA_URL;
}

export function getOllamaModel(): string {
  const { model } = getStoredApiConfig();
  if (model) return model;

  const env = import.meta.env.VITE_OLLAMA_MODEL;
  if (env) return String(env);

  return DEFAULT_OLLAMA_MODEL;
}

export function getOllamaChatUrl(): string {
  return `${getOllamaBase()}/api/chat`;
}

export function getOllamaGenerateUrl(): string {
  return `${getOllamaBase()}/api/generate`;
}