
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { NocoBaseClient } from '@/api/nocobase-client';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  client: NocoBaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('nocobase_token'));

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
  localStorage.setItem('nocobase_token', newToken);
  setToken(newToken);

  // sync to electron
  const electron = (window as any).electron;
  if (electron?.syncState) {
  electron.syncState({ token: newToken });
  }

  // ensure backend collection exists after login
  setTimeout(async () => {
  try {
 await client.ensureBackendCollection();
  } catch (error) {
 console.warn('Failed to ensure backend collection:', error);
  }
  }, 1000); // Delay to allow login to complete
  };

  const logout = () => {
  localStorage.removeItem('nocobase_token');
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
  throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
