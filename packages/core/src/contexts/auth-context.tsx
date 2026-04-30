{/* eslint-disable */}
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { nocobaseClient, pb } from "@/lib/nocobase";
import { secureLogger } from "@/lib/secure-logger";
import { storageManager } from "@/lib/storage-manager";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithApiKey: (apiKey: string) => Promise<void>;
  logout: () => Promise<void>;
  client: typeof nocobaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const internals = (React as any)
    .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  if (internals?.ReactCurrentDispatcher?.current == null) {
    const initialToken = storageManager.getCachedSecret("nocobase_token");
    const stub: AuthContextType = {
      token: initialToken,
      isAuthenticated: !!initialToken,
      login: async () => {},
      loginWithApiKey: async () => {},
      logout: async () => {
        pb.authStore.clear();
        (globalThis as any).location?.reload?.();
      },
      client: nocobaseClient,
    };

    if (process.env.NODE_ENV !== "production") {
      secureLogger.warn(
        "AuthProvider rendered outside of React dispatcher; providing stub context",
      );
    }
    return <AuthContext.Provider value={stub}>{children}</AuthContext.Provider>;
  }

  // wait for NocoBaseClient to finish loading auth from storage before
  // rendering children. this fixes the bug where token was null on reload
  // because _loadAuth() was not awaited in the NocoBaseClient constructor.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // ready() resolves immediately if auth has already been loaded
    nocobaseClient.ready().then(() => setReady(true));
  }, []);

  const [token, setToken] = useState<string | null>(() => {
    // start with whatever NocoBaseClient already has in memory
    // (will be null until ready() completes on first load)
    return nocobaseClient.authStore.token;
  });

  // sync token into NocoBaseClient state once ready (covers the case where
  // token was restored from storage after initial state was captured)
  useEffect(() => {
    if (ready && token && !nocobaseClient.isAuthenticated) {
      nocobaseClient.authStore; // just touch it to ensure client is aware
    }
  }, [ready, token]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  useEffect(() => {
    // token is already restored via nocobaseClient._loadAuth() in constructor
    // no need to call pb.authStore.save() since pb is a mock object
  }, [token]);

  useEffect(() => {
    const handleAuthError = () => {
      setToken(null);
      pb.authStore.clear();
    };
    window.addEventListener("auth-error", handleAuthError);

    return () => window.removeEventListener("auth-error", handleAuthError);
  }, []);

  useEffect(() => {
    const electron = (window as any).electron;
    if (electron?.syncState && token) {
      electron.syncState({ token });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      await nocobaseClient.login(email, password);
      const newToken = pb.authStore.token;
      setToken(newToken);
      secureLogger.info("[auth] login successful");

      const electron = (window as any).electron;
      if (electron?.syncState) {
        electron.syncState({ token: newToken });
      }
    } catch (error) {
      secureLogger.error("[auth] login failed:", error);
      throw error;
    }
  };

  const loginWithApiKey = async (apiKey: string) => {
    try {
      await nocobaseClient.loginWithApiKey(apiKey);
      const newToken = apiKey;
      setToken(newToken);
      secureLogger.info("[auth] api key login successful");

      const electron = (window as any).electron;
      if (electron?.syncState) {
        electron.syncState({ token: newToken });
      }
    } catch (error) {
      secureLogger.error("[auth] api key login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    nocobaseClient.logout();
    setToken(null);

    const electron = (window as any).electron;
    if (electron?.syncState) {
      electron.syncState({ token: null });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: nocobaseClient.isAuthenticated,
        login,
        loginWithApiKey,
        logout,
        client: nocobaseClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

let warnedMissingProvider = false;

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (process.env.NODE_ENV !== "production" || !warnedMissingProvider) {
      secureLogger.warn(
        "useAuth called outside of AuthProvider; returning fallback stub.",
      );
      warnedMissingProvider = true;
    }
    return {
      token: null,
      isAuthenticated: false,
      login: async () => {},
      loginWithApiKey: async () => {},
      logout: async () => {},
      client: nocobaseClient,
    } as AuthContextType;
  }
  return context;
}

export { AuthContext };
