// helper utilities for resolving the LLM endpoint (Google Gemini)
// - prefer a runtime user setting stored in localstorage ('gemini_api_url', fallback to 'wilson_api_url')
// - storageManager wrapper used for safer access

import { storageManager } from './storage-manager';

/**
 * the default gemini model wilson should use
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

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

export function getOllamaBase(): string {
  try {
    // prefer user-configured gemini base url (new name), but fall back to legacy wilson key
    const stored = storageManager.getItem('gemini_api_url') ?? storageManager.getItem('wilson_api_url');
    if (stored && stored.trim()) {
      const base = normalizeBaseUrl(stored);
      if (base) return base;
    }
  } catch (e) {
    // ignore (eg. ssr or restricted env)
  }

  const env = import.meta.env.VITE_GEMINI_URL || import.meta.env.VITE_OLLAMA_URL;
  if (env && String(env).trim()) return String(env).replace(/\/$/, '');

  // default to google gemini public api endpoint for the configured model
  return `https://generativeai.googleapis.com/v1beta2/models/${DEFAULT_GEMINI_MODEL}`;
}

export function getOllamaGenerateUrl(): string {
  // for Gemini the endpoint is the model path plus ':generate'
  const base = `${getOllamaBase().replace(/\/$/, '')}:generate`;
  const apiKey = getStoredGeminiApiKey();
  if (apiKey) {
    return appendGeminiApiKeyToUrl(base, apiKey);
  }
  return base;
}

export function getOllamaChatUrl(): string {
  // Gemini does not have a separate chat endpoint in this setup
  return getOllamaGenerateUrl();
}

export function normalizeGenerateEndpoint(urlOrBase?: string): string {
  if (!urlOrBase) return getOllamaGenerateUrl();
  const t = String(urlOrBase).trim().replace(/\/$/, '');
  // if already a full Gemini generate endpoint, return as-is
  if (/generativeai\.googleapis\.com\/v1beta2\/models\/.+:(generate|streaminggenerate)$/i.test(t)) {
    return t;
  }

  // if the user provided the gemini model base, append the generate suffix
  if (/generativeai\.googleapis\.com\/v1beta2\/models\/.+$/i.test(t)) {
    return `${t}:generate`;
  }

  if (/\/api\/generate$/.test(t)) return t;
  const stripped = t.replace(/(\/api\/chat|\/api)$/i, '').replace(/\/$/, '');
  return `${stripped}/api/generate`;
}