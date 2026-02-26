// refactored api client with in-memory tokens
// eliminates localstorage blocking and implements secure refresh

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { getToken, setToken, clearToken } from '@/features/edgeless/storage'
import { secureLogger } from './secure-logger'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100/api'

// token cache in memory (not localstorage)
interface TokenCache {
  nocobaseToken: string | null
  homApiKey: string | null
  guestKey: string | null
  lastRefresh: number
}

const tokenCache: TokenCache = {
  nocobaseToken: null,
  homApiKey: null,
  guestKey: null,
  lastRefresh: 0,
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

async function refreshTokensFromDB(): Promise<void> {
  const now = Date.now()
  if (now - tokenCache.lastRefresh < REFRESH_INTERVAL_MS) {
    return // too soon
  }

  const [nocobase, hom, guest] = await Promise.all([
    getToken('nocobase_token'),
    getToken('hom_api_key'),
    getToken('hom_guest_key'),
  ])

  tokenCache.nocobaseToken = nocobase || null
  tokenCache.homApiKey = hom || null
  tokenCache.guestKey = guest || null
  tokenCache.lastRefresh = now
}

function getActiveToken(): string | null {
  // priority: hom api key > nocobase token > guest key
  if (tokenCache.homApiKey && tokenCache.homApiKey !== 'null') {
    return tokenCache.homApiKey
  }
  if (tokenCache.nocobaseToken && tokenCache.nocobaseToken !== 'null') {
    return tokenCache.nocobaseToken
  }
  if (tokenCache.guestKey && tokenCache.guestKey !== 'null') {
    return tokenCache.guestKey
  }
  return null
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'content-type': 'application/json',
  },
})

// request interceptor with non-blocking token refresh
apiClient.interceptors.request.use(async (config) => {
  // refresh tokens if needed (async, non-blocking after first load)
  await refreshTokensFromDB()

  const token = getActiveToken()

  if (token) {
    const bearerToken = token.startsWith('bearer ') ? token : `bearer ${token}`
    config.headers['authorization'] = bearerToken
    config.headers['x-hostname'] = window.location.hostname

    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('authorization', bearerToken)
      config.headers.set('x-hostname', window.location.hostname)
    }
  } else {
    // anonymous auth fallback
    const publicToken = import.meta.env.VITE_PUBLIC_ACCESS_TOKEN || ''
    if (publicToken) {
      config.headers['authorization'] = `bearer ${publicToken}`
    }
  }

  return config
})

// response interceptor for 401 handling
apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      // clear tokens
      tokenCache.nocobaseToken = null
      tokenCache.homApiKey = null
      tokenCache.guestKey = null

      await Promise.all([
        clearToken('nocobase_token'),
        clearToken('hom_api_key'),
        clearToken('hom_guest_key'),
      ])

      // notify auth context
      window.dispatchEvent(new Event('auth-error'))

      // toast notification
      if (typeof window !== 'undefined' && (window as any).toast) {
        ;(window as any).toast.error('session expired - please log in as admin to edit')
      }
    }
    return Promise.reject(error)
  }
)

// token management api
export async function setAuthToken(
  type: 'nocobase' | 'hom' | 'guest',
  value: string,
  remember = false
): Promise<void> {
  const keyMap = {
    nocobase: 'nocobase_token',
    hom: 'hom_api_key',
    guest: 'hom_guest_key',
  }

  const cacheMap: Record<'nocobase' | 'hom' | 'guest', 'nocobaseToken' | 'homApiKey' | 'guestKey'> = {
    nocobase: 'nocobaseToken',
    hom: 'homApiKey',
    guest: 'guestKey',
  }

  const key = keyMap[type]
  const cacheKey = cacheMap[type]

  // update cache immediately (non-blocking)
  tokenCache[cacheKey] = value

  // persist to indexeddb if remember
  if (remember) {
    await setToken(key, value, 60 * 24 * 7) // 7 days
  }
}

export async function clearAuth(): Promise<void> {
  tokenCache.nocobaseToken = null
  tokenCache.homApiKey = null
  tokenCache.guestKey = null
  tokenCache.lastRefresh = 0

  await Promise.all([
    clearToken('nocobase_token'),
    clearToken('hom_api_key'),
    clearToken('hom_guest_key'),
  ])
}

export function isAuthenticated(): boolean {
  return !!getActiveToken()
}

export const apiRequest = async (
  resource: string,
  action: string,
  options: AxiosRequestConfig = {}
) => {
  const { method = 'get', data, ...rest } = options
  try {
    const res = await apiClient({
      url: `/${resource}:${action}`,
      method,
      data,
      ...rest,
    })
    return res.data
  } catch (e) {
    secureLogger.error('api error:', e)
    throw e
  }
}

export default apiClient