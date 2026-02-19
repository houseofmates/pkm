import axios from 'axios';
import { secureLogger } from './secure-logger';
import { safeUrl, sanitizeHeaders } from './sanitize-utils';

// api base: prefer the vite environment override, fall back to local backend for dev
export const aPI_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100/api';

export const apiClient = axios.create({
 baseURL: API_URL,
 headers: {
  'Content-Type': 'application/json',
 },
});

ApiClient.interceptors.request.use((config) => {
 const nt = localStorage.getItem('nocobase_token');
 const ht = localStorage.getItem('hom_api_key');
 const gt = localStorage.getItem('hom_guest_key'); // guest token support

 // pick the best token we have: admin > nocobase jwt > guest (trim common placeholders)
 let token = null;
 if (ht && ht !== 'null' && ht !== 'undefined' && ht.trim() !== '') {
  token = ht.trim();
  // hom_api_key (admin-level token)
 } else if (nt && nt !== 'null' && nt !== 'undefined' && nt.trim() !== '') {
  token = nt.trim();
  // nocobase jwt (standard user/session token)
 } else if (gt && gt !== 'null' && gt !== 'undefined' && gt.trim() !== '') {
  token = gt.trim();
  // guest token (read-only fallback)
 }

 // friendly warning when no token is present (helps debug unexpected 401s)
 if (!token) {
  secureLogger.warn('[auth] no token found in localStorage. request will be anonymous');
 }

 if (token) {
  const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  const hostname = window.location.hostname;

  // attach headers consistently for axios and fetch-like header objects
  config.headers['Authorization'] = bearerToken;
  config.headers['X-Hostname'] = hostname;
  if (config.headers && typeof (config.headers as any).set === 'function') {
   (config.headers as any).set('Authorization', bearerToken);
   (config.headers as any).set('X-Hostname', hostname);
  }
 } else {
  // nocobase rejects anonymous requests; use a read-only public token if configured (vite env)
  const PUBLIC_ACCESS_TOKEN = import.meta.env.VITE_PUBLIC_ACCESS_TOKEN || '';
  if (PUBLIC_ACCESS_TOKEN) {
   token = PUBLIC_ACCESS_TOKEN;
   const bearerToken = `Bearer ${token}`;
   const hostname = window.location.hostname;
   config.headers['Authorization'] = bearerToken;
   config.headers['X-Hostname'] = hostname;
   if (config.headers && typeof (config.headers as any).set === 'function') {
    (config.headers as any).set('Authorization', bearerToken);
    (config.headers as any).set('X-Hostname', hostname);
   }
  } else {
   // no public access token configured — calls may 401 until user logs in
   secureLogger.warn('[auth] no public access token configured; anonymous requests may be rejected by nocobase');
  }
 }

 return config;
});

ApiClient.interceptors.response.use(
 (response) => response,
 (error) => {
  if (error.response?.status === 401) {
 // clear potentially expired/invalid tokens
 secureLogger.warn('[Auth] 401 Unauthorized - clearing stored tokens');
 localStorage.removeItem('hom_api_key');
 localStorage.removeItem('nocobase_token');

 // dispatch event for auth context to handle
 window.dispatchEvent(new Event('auth-error'));

 // show toast notification
 if (typeof window !== 'undefined' && (window as any).toast) {
  (window as any).toast.error('session expired - please log in as admin to edit');
 }
  }
  return Promise.reject(error);
 }
);

export const apiRequest = async (resource: string, action: string, options: Record<string, any> = {}) => {
 const { method = 'GET', data, ...rest } = options;
 try {
  const res = await ApiClient({
 url: `/${resource}:${action}`,
 method,
 data,
 ...rest
  });
  return res.data;
 } catch (e) {
  secureLogger.error("API Error:", e);
  throw e;
 }
};

export default ApiClient;