// helper utilities for resolving the llm endpoint
// supports: nvidia api, ollama, gemini
// - prefer a runtime user setting stored in localstorage
// - storagemanager wrapper used for safer access

import { storageManager } from "./storage-manager";

// nvidia api configuration
export const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_MODEL = "moonshotai/kimi-k2.5";

// ollama defaults (for local inference)
export const DEFAULT_OLLAMA_MODEL = "gemma4:e4b";
export const DEFAULT_OLLAMA_URL = "http://192.168.4.250:11434";

export async function getStoredNvidiaApiKey(): Promise<string | null> {
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
