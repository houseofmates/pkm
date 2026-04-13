import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { pocketBaseClient, pb } from "@/lib/pocketbase";
import { secureLogger } from "@/lib/secure-logger";
import { storageManager } from "@/lib/storage-manager";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithApiKey: (apiKey: string) => Promise<void>;
  logout: () => Promise<void>;
  client: typeof pocketBaseClient;
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
      client: pocketBaseClient,
    };

    if (process.env.NODE_ENV !== "production") {
      secureLogger.warn(
        "AuthProvider rendered outside of React dispatcher; providing stub context",
      );
    }
    return <AuthContext.Provider value={stub}>{children}</AuthContext.Provider>;
  }

  const [token, setToken] = useState<string | null>(() => {
    const stored = storageManager.getCachedSecret("nocobase_token");
    return stored || null;
  });

  useEffect(() => {
    const storedUser = storageManager.getCachedSecret("nocobase_user");
    if (storedUser && !pb.authStore.model) {
      try {
        const user = JSON.parse(storedUser);
        pb.authStore.save(token || "", user);
      } catch (e) {
        secureLogger.debug("[auth] failed to restore user session", e);
      }
    }
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
      await pocketBaseClient.login(email, password);
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
      await pocketBaseClient.loginWithApiKey(apiKey);
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
    pocketBaseClient.logout();
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
        isAuthenticated: pb.authStore.isValid,
        login,
        loginWithApiKey,
        logout,
        client: pocketBaseClient,
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
      logout: async () => {},
      client: pocketBaseClient,
    } as AuthContextType;
  }
  return context;
}

export { AuthContext };
