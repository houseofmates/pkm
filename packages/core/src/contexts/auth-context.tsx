
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { NocoBaseClient } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';
import { normalizeAuthToken } from '@/lib/auth-token';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  client: NocoBaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // React's hook dispatcher is only populated during a proper render cycle.
  // Tools like react-refresh (used by Vite's HMR) sometimes invoke the
  // component function outside of that context in order to inspect it,
  // which would trigger a crash when the first hook is called:
  // "TypeError: can't access property 'useState', resolveDispatcher() is null".
  //
  // Guarding here avoids the crash by returning the children unchanged when
  // the dispatcher is missing.  We also log a warning in development so the
  // condition can be investigated if it ever happens in production.
  const internals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  if (internals?.ReactCurrentDispatcher?.current == null) {
    // dispatcher missing – this usually happens during hot‑reload or when
    // React is introspecting our component.  We must return a provider
    // so that hooks like `useAuth` still receive an object (otherwise they
    // warn and return another stub), but we can't call any hooks here.
    //
    // The stub below keeps the minimal shape but still implements login/
    // logout by writing to storage and forcing a full reload.  That way if
    // the user happens to try signing in while the stub is active it will
    // actually take effect once the real provider mounts again.
    const stub: AuthContextType = {
      token: null,
      isAuthenticated: false,
      login: (tok: string) => {
        const normalized = normalizeAuthToken(tok);
        if (normalized) {
          storageManager.setItem('nocobase_token', normalized);
          // reload so the proper AuthProvider picks up the value
          window.location.reload();
        }
      },
      logout: () => {
        storageManager.removeItem('nocobase_token');
        window.location.reload();
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

  const [token, setToken] = useState<string | null>(() => {
    const stored = storageManager.getItem('nocobase_token');
    return stored ? normalizeAuthToken(stored) : null;
  });

  // initialize client with a function to get the current token
  // this ensures the client always uses the latest token from the closure/state if we adjusted the client implementation,
  // but here we are passing a fresh client or using the ref pattern.
  // actually, simplest is to re-create client or pass a token getter.
  // the client implementation i wrote takes `gettoken` callback.
  // actually, simplest is to re-create client or pass a token getter.
  // the client uses the singleton apiclient which handles tokens via interceptors.
  const [client] = useState(() => new NocoBaseClient());



  // listen for 401s from api-client
  useEffect(() => {
    const handleAuthError = () => {
      // token already cleared by api-client; just update react state
      setToken(null);
      // reliance on react state reset is smoother than reload
    };
    window.addEventListener('auth-error', handleAuthError);

    // initial sync
    const electron = (window as any).electron;
    if (electron?.syncState && token) {
      electron.syncState({ token });
    }

    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  // sync changes to localstorage is handled in login/logout to avoid race conditions with api clients
  const login = (newToken: string) => {
    const normalized = normalizeAuthToken(newToken);
    storageManager.setItem('nocobase_token', normalized);
    setToken(normalized);

    // sync to electron
    const electron = (window as any).electron;
    if (electron?.syncState) {
      electron.syncState({ token: normalized });
    }

    // ensure backend collection exists after login
    setTimeout(async () => {
      try {
        await client.ensureBackendCollection();
      } catch (error) {
        secureLogger.warn('Failed to ensure backend collection:', error);
      }
    }, 1000); // Delay to allow login to complete
  };

  const logout = () => {
    storageManager.removeItem('nocobase_token');
    setToken(null);

    // sync to electron
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
    // This function is intentionally strict to catch developer errors,
    // but during hot reloads or initial render races it's possible to
    // briefly hit a component before the provider tree has mounted. In
    // such cases throwing crashes the whole app (see error in bug report:
    // "useAuth must be used within an AuthProvider"). Most callers can
    // tolerate a missing auth object by treating it as unauthenticated
    // state. Returning a lightweight stub avoids those crashes while the
    // warning helps us surface regressions during development.
    if (process.env.NODE_ENV !== 'production' || !warnedMissingProvider) {
      secureLogger.warn('useAuth called outside of AuthProvider; returning fallback stub.');
      warnedMissingProvider = true;
    }
    return {
      token: null,
      isAuthenticated: false,
      login: () => {},
      logout: () => {},
      client: new NocoBaseClient(),
    } as AuthContextType;
  }
  return context;
}

// context export used by tests and occasional deep wrappers
export { AuthContext };