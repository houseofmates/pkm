import axios from 'axios';
import { secureLogger, sanitizeForLogging } from './secure-logger';
import { storageManager } from './storage-manager';
import { normalizeAuthToken, toAuthorizationHeaderValue } from './auth-token';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
 baseURL: API_URL,
 headers: {
  'Content-Type': 'application/json',
 },
});

type TokenKind = 'hom_api_key' | 'nocobase_token' | 'hom_guest_key' | 'public';

interface PKMAuthConfig {
  tokenKind: TokenKind;
}

apiClient.interceptors.request.use(async (config) => {
  // sanitize request data before logging
  if (config.data) {
    config.data = sanitizeForLogging(config.data);
  }

  // consistently fetch latest tokens using encrypted storage manager
  const nt = await storageManager.getEncryptedItem('nocobase_token');
  const ht = await storageManager.getEncryptedItem('hom_api_key');
  const gt = await storageManager.getEncryptedItem('hom_guest_key');

  // pick the best token we have: admin > nocobase jwt > guest (trim common placeholders)
  let token: string | null = null;
  let tokenKind: TokenKind | null = null;

  if (ht && ht.trim() !== '') {
    token = normalizeAuthToken(ht);
    tokenKind = 'hom_api_key';
  } else if (nt && nt.trim() !== '') {
    token = normalizeAuthToken(nt);
    tokenKind = 'nocobase_token';
  } else if (gt && gt.trim() !== '') {
    token = normalizeAuthToken(gt);
    tokenKind = 'hom_guest_key';
  }

  if (token) {
    const bearerToken = toAuthorizationHeaderValue(token);
    const hostname = window.location.hostname;

    config.headers['Authorization'] = bearerToken;
    config.headers['X-Hostname'] = hostname;

    // extra metadata for error handling in response interceptor
    (config as any)._pkmAuth = { tokenKind } as PKMAuthConfig;
  } else {
    // nocobase rejects anonymous requests; use a read-only public token if configured
    const PUBLIC_ACCESS_TOKEN = import.meta.env.VITE_PUBLIC_ACCESS_TOKEN || '';
    if (PUBLIC_ACCESS_TOKEN) {
      token = normalizeAuthToken(PUBLIC_ACCESS_TOKEN);
      const bearerToken = toAuthorizationHeaderValue(token);
      config.headers['Authorization'] = bearerToken;
      config.headers['X-Hostname'] = window.location.hostname;
      (config as any)._pkmAuth = { tokenKind: 'public' } as PKMAuthConfig;
    } else {
      secureLogger.warn('[auth] no public access token configured; anonymous requests may be rejected by nocobase');
    }
  }

  return config;
});

apiClient.interceptors.response.use(
 (response) => {
   if (response.data) {
     response.data = sanitizeForLogging(response.data);
   }
   return response;
 },
 (error) => {
  if (error.response?.status === 401) {
    const auth = (error.config as any)?._pkmAuth as PKMAuthConfig | undefined;
    const kind = auth?.tokenKind;

    secureLogger.warn('[auth] 401 unauthorized - clearing stored token', kind || 'unknown');

    if (kind === 'hom_api_key') {
      storageManager.removeItem('hom_api_key');
    } else if (kind === 'nocobase_token') {
      storageManager.removeItem('nocobase_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-error'));
      }
    } else if (kind === 'hom_guest_key') {
      storageManager.removeItem('hom_guest_key');
    }

    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.error('session expired - please log in again');
    }
  }
  return Promise.reject(error);
 }
);

export const apiRequest = async <T = unknown>(resource: string, action: string, options: Record<string, unknown> = {}): Promise<T> => {
 const { method = 'GET', data, ...rest } = options;
 try {
  const res = await apiClient({
    url: `/${resource}:${action}`,
    method: method as any,
    data,
    ...rest
  });
  return res.data as T;
 } catch (e) {
  secureLogger.error("API Error:", sanitizeForLogging(e));
  throw e;
 }
};

export default apiClient;
