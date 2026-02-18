// helper utilities for resolving the local llm endpoint (ollama/wilson)
// - prefer a runtime user setting stored in localstorage ('wilson_api_url')
// - fall back to vite_ollama_url if provided at build time
// - default to the legacy localhost:11434 when nothing else is set
// all helpers return normalized urls (no trailing slashes) or full '/api/*' endpoints

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
    const stored = localStorage.getItem('wilson_api_url');
    if (stored && stored.trim()) {
      const base = normalizeBaseUrl(stored);
      if (base) return base;
    }
  } catch (e) {
    // ignore (eg. ssr or restricted env)
  }

  const env = import.meta.env.VITE_OLLAMA_URL;
  if (env && String(env).trim()) return String(env).replace(/\/$/, '');

  return 'http://localhost:11434';
}

export function getOllamaGenerateUrl(): string {
  return `${getOllamaBase().replace(/\/$/, '')}/api/generate`;
}

export function getOllamaChatUrl(): string {
  return `${getOllamaBase().replace(/\/$/, '')}/api/chat`;
}

export function normalizeGenerateEndpoint(urlOrBase?: string): string {
  if (!urlOrBase) return getOllamaGenerateUrl();
  const t = String(urlOrBase).trim().replace(/\/$/, '');
  if (/\/api\/generate$/.test(t)) return t;
  const stripped = t.replace(/(\/api\/chat|\/api)$/i, '').replace(/\/$/, '');
  return `${stripped}/api/generate`;
}
