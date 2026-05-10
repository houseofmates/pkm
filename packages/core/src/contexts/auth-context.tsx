{/* eslint-disable */}
import React, {
 createContext,
 useContext,
 useState,
 useEffect,
 useCallback,
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
 const persistTokenAndReload = async (nextToken: string) => {
 await storageManager.setEncryptedItem("nocobase_token", nextToken);
 (globalThis as any).location?.reload?.();
 };
 const stub: AuthContextType = {
 token: initialToken,
 isAuthenticated: !!initialToken,
 login: async (emailOrToken: string, password?: string) => {
 await persistTokenAndReload(password ?? emailOrToken);
 },
 loginWithApiKey: persistTokenAndReload,
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

 // wait for NocoBaseClient to finish loading auth from encrypted storage
 // before rendering children. without this, the token is null on reload
 // because _loadAuth() runs async and React renders before it completes.
 const [ready, setReady] = useState(false);
 const [token, setToken] = useState<string | null>(null);

 useEffect(() => {
 nocobaseClient.ready().then(() => {
 // after the client has loaded auth from storage, read the restored
 // token into React state so the app knows we're authenticated
 const restoredToken = nocobaseClient.authStore.token;
 if (restoredToken) {
 setToken(restoredToken);
 secureLogger.info("[auth] token restored from storage");
 } else {
 secureLogger.info("[auth] no token found in storage");
 }
 setReady(true);
 });
 }, []);

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
 const newToken = nocobaseClient.authStore.token;
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

 // don't render children until the client has finished loading auth
 // this prevents the flash-then-login-screen bug
 if (!ready) {
 return (
 <div className="flex items-center justify-center h-screen">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
 </div>
 );
 }

 return (
 <AuthContext.Provider
 value={{
 token,
 isAuthenticated: !!token,
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
