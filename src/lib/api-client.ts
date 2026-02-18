// @ts-nocheck
import axios from 'axios';

// api base: prefer the vite environment override, fall back to local backend for dev
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100/api';

export const apiClient = axios.create({
 baseURL: API_URL,
 headers: {
  'Content-Type': 'application/json',
 },
});

apiClient.interceptors.request.use((config) => {
 const nt = localStorage.getItem('nocobase_token');
 const ht = localStorage.getItem('hom_api_key');
 const gt = localStorage.getItem('hom_guest_key'); // Guest Token Support

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
  console.warn('[auth] no token found in localStorage (nocobase_token, hom_api_key, hom_guest_key). request will be anonymous');
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
   console.warn('[auth] no public access token configured; anonymous requests may be rejected by nocobase');
  }
 }

 return config;
});

apiClient.interceptors.response.use(
 (response) => response,
 (error) => {
  if (error.response?.status === 401) {
 // clear potentially expired/invalid tokens
 console.warn('[Auth] 401 Unauthorized - clearing stored tokens');
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

export const apiRequest = async (resource, action, options = {}) => {
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
  console.error("API Error:", e);
  throw e;
 }
};

export default apiClient;
