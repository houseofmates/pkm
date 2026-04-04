import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { NocoBaseClient } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';
import { normalizeAuthToken } from '@/lib/auth-token';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  client: NocoBaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const internals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  if (internals?.ReactCurrentDispatcher?.current == null) {
    // stub provider for SSR/HMR
    const initialToken = storageManager.getCachedSecret('nocobase_token');
    const stub: AuthContextType = {
      token: initialToken,
      isAuthenticated: !!initialToken,
      login: async (tok: string) => {
        const normalized = normalizeAuthToken(tok);
        if (normalized) {
          await storageManager.setEncryptedItem('nocobase_token', normalized);
          (globalThis as any).location?.reload?.();
        }
      },
      logout: async () => {
        storageManager.removeItem('nocobase_token');
        (globalThis as any).location?.reload?.();
      },
      client: new NocoBaseClient(),
    };

    if (process.env.NODE_ENV !== 'production') {
      secureLogger.warn(
        'AuthProvider rendered outside of React dispatcher; providing stub context'
      );
    }
    return <AuthContext.Provider value={stub}>{children}</AuthContext.Provider>;
  }

  const [token, setToken] = useState<string | null>(() => storageManager.getCachedSecret('nocobase_token'));

  useEffect(() => {
    if (!token) return;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload && payload.exp) {
          const expireMs = payload.exp * 1000;
          const now = Date.now();
          if (expireMs <= now) return;
          const delay = expireMs - now;
          const MAX_TIMEOUT_MS = 2_147_483_647;
          if (delay > MAX_TIMEOUT_MS) return;
          const timeout = setTimeout(() => {
            secureLogger.info('jwt token expired, clearing');
            storageManager.removeItem('nocobase_token');
            setToken(null);
            window.dispatchEvent(new Event('auth-error'));
          }, delay);
          return () => clearTimeout(timeout);
        }
      }
    } catch (e) {
      secureLogger.debug('token expiry parse ignored:', e);
    }
  }, [token]);

  const [client] = useState(() => new NocoBaseClient());

  useEffect(() => {
    const handleAuthError = () => {
      setToken(null);
    };
    window.addEventListener('auth-error', handleAuthError);

    const electron = (window as any).electron;
    if (electron?.syncState && token) {
      electron.syncState({ token });
    }

    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  const login = async (newToken: string) => {
    const normalized = normalizeAuthToken(newToken);
    if (!normalized) return;
    
    secureLogger.info('[auth] login called');
    await storageManager.setEncryptedItem('nocobase_token', normalized);
    setToken(normalized);

    const electron = (window as any).electron;
    if (electron?.syncState) {
      electron.syncState({ token: normalized });
    }

    try {
      await client.ensureBackendCollection();
      secureLogger.info('[auth] backend ready');
    } catch (error) {
      secureLogger.warn('backend setup failed:', error);
    }
  };

  const logout = async () => {
    storageManager.removeItem('nocobase_token');
    setToken(null);

    const electron = (window as any).electron;
    if (electron?.syncState) {
      electron.syncState({ token: null });
    }
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, client }}>
      {children}
    </AuthContext.Provider>
  );
}

let warnedMissingProvider = false;

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (process.env.NODE_ENV !== 'production' || !warnedMissingProvider) {
      secureLogger.warn('useAuth called outside of AuthProvider; returning fallback stub.');
      warnedMissingProvider = true;
    }
    return {
      token: null,
      isAuthenticated: false,
      login: async () => {},
      logout: async () => {},
      client: new NocoBaseClient(),
    } as AuthContextType;
  }
  return context;
}

export { AuthContext };
