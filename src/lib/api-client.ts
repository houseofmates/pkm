// @ts-nocheck
import axios from 'axios';

// use the production url directly or env if available
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

 // robust check for truthy token
 let token = null;
 if (ht && ht !== 'null' && ht !== 'undefined' && ht.trim() !== '') {
  token = ht.trim();
  // console.debug('[auth] using hom_api_key');
 } else if (nt && nt !== 'null' && nt !== 'undefined' && nt.trim() !== '') {
  token = nt.trim();
  // console.debug('[auth] using nocobase_token');
 } else if (gt && gt !== 'null' && gt !== 'undefined' && gt.trim() !== '') {
  token = gt.trim(); // Use guest token as fallback
  // console.debug('[auth] using hom_guest_key');
 }

 // debug log for troubleshooting 401s
 if (!token) {
  console.warn('[Auth] No token found in localStorage (nocobase_token, hom_api_key, or hom_guest_key). Request will be anonymous.');
 } else {
  // console.debug('[auth] token present:', token.substring(0, 10) + '...');
 }

 if (token) {
  const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  // direct assignment to ensure compatibility
  config.headers['Authorization'] = bearerToken;
  config.headers['X-Hostname'] = window.location.hostname;

  // also try set() if it's an axiosheaders object
  if (config.headers && typeof config.headers.set === 'function') {
 config.headers.set('Authorization', bearerToken);
 config.headers.set('X-Hostname', window.location.hostname);
  }
 } else {
  // anonymous auth is broken in nocobase - use a hardcoded public access token (member role with view-only perms)
  const PUBLIC_ACCESS_TOKEN = process.env.PUBLIC_ACCESS_TOKEN || '';
  token = PUBLIC_ACCESS_TOKEN;
  const bearerToken = `Bearer ${token}`;
  config.headers['Authorization'] = bearerToken;
  config.headers['X-Hostname'] = window.location.hostname;
  if (config.headers && typeof config.headers.set === 'function') {
 config.headers.set('Authorization', bearerToken);
 config.headers.set('X-Hostname', window.location.hostname);
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
