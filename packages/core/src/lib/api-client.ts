import axios from 'axios';
import { secureLogger, sanitizeForLogging } from './secure-logger';
import { storageManager } from './storage-manager';
import { normalizeAuthToken, toAuthorizationHeaderValue } from './auth-token';

// api base: prefer the vite environment override, fall back to local backend for dev
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100/api';

export const apiClient = axios.create({
 baseURL: API_URL,
 headers: {
  'Content-Type': 'application/json',
 },
});

apiClient.interceptors.request.use((config) => {
  // sanitize request data before logging
  if (config.data) {
    config.data = sanitizeForLogging(config.data);
  }
 const nt = storageManager.getItem('nocobase_token');
 const ht = storageManager.getItem('hom_api_key');
 const gt = storageManager.getItem('hom_guest_key'); // guest token support

 // pick the best token we have: admin > nocobase jwt > guest (trim common placeholders)
 let token: string | null = null;
 let tokenKind: 'hom_api_key' | 'nocobase_token' | 'hom_guest_key' | null = null;
 if (ht && ht !== 'null' && ht !== 'undefined' && ht.trim() !== '') {
  token = normalizeAuthToken(ht);
  tokenKind = 'hom_api_key';
  // hom_api_key (admin-level token)
 } else if (nt && nt !== 'null' && nt !== 'undefined' && nt.trim() !== '') {
  token = normalizeAuthToken(nt);
  tokenKind = 'nocobase_token';
  // nocobase jwt (standard user/session token)
 } else if (gt && gt !== 'null' && gt !== 'undefined' && gt.trim() !== '') {
  token = normalizeAuthToken(gt);
  tokenKind = 'hom_guest_key';
  // guest token (read-only fallback)
 }

 // friendly warning when no token is present (helps debug unexpected 401s)
 if (!token) {
  secureLogger.warn('[auth] no token found in localStorage. request will be anonymous');
 }

 if (token) {
  const bearerToken = toAuthorizationHeaderValue(token);
  const hostname = window.location.hostname;

  // attach headers consistently for axios and fetch-like header objects
  config.headers['Authorization'] = bearerToken;
  config.headers['X-Hostname'] = hostname;
  if (config.headers && typeof (config.headers as any).set === 'function') {
   (config.headers as any).set('Authorization', bearerToken);
   (config.headers as any).set('X-Hostname', hostname);
  }
  (config as any)._pkmAuth = { tokenKind };
 } else {
  // nocobase rejects anonymous requests; use a read-only public token if configured (vite env)
  const PUBLIC_ACCESS_TOKEN = import.meta.env.VITE_PUBLIC_ACCESS_TOKEN || '';
  if (PUBLIC_ACCESS_TOKEN) {
   token = normalizeAuthToken(PUBLIC_ACCESS_TOKEN);
   const bearerToken = toAuthorizationHeaderValue(token);
   const hostname = window.location.hostname;
   config.headers['Authorization'] = bearerToken;
   config.headers['X-Hostname'] = hostname;
   if (config.headers && typeof (config.headers as any).set === 'function') {
    (config.headers as any).set('Authorization', bearerToken);
    (config.headers as any).set('X-Hostname', hostname);
   }
   ;(config as any)._pkmAuth = { tokenKind: 'public' };
  } else {
   // no public access token configured — calls may 401 until user logs in
   secureLogger.warn('[auth] no public access token configured; anonymous requests may be rejected by nocobase');
  }
 }

 return config;
});

apiClient.interceptors.response.use(
 (response) => {
   // sanitize response data before logging
   if (response.data) {
     response.data = sanitizeForLogging(response.data);
   }
   return response;
 },
 (error) => {
  if (error.response?.status === 401) {
   const kind = (error.config as any)?._pkmAuth?.tokenKind as
     | 'hom_api_key'
     | 'nocobase_token'
     | 'hom_guest_key'
     | 'public'
     | null
     | undefined;

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

export const apiRequest = async (resource: string, action: string, options: Record<string, any> = {}) => {
 const { method = 'GET', data, ...rest } = options;
 try {
  const res = await apiClient({
 url: `/${resource}:${action}`,
 method,
 data,
 ...rest
  });
  return res.data;
 } catch (e) {
  // sanitize error before logging
  secureLogger.error("API Error:", sanitizeForLogging(e));
  throw e;
 }
};

export default apiClient;