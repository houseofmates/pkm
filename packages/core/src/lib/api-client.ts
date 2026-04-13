import axios from "axios";
import { secureLogger, sanitizeForLogging } from "./secure-logger";
import { storageManager } from "./storage-manager";
import { normalizeAuthToken, toAuthorizationHeaderValue } from "./auth-token";

export const API_URL = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

type TokenKind =
  | "hom_api_key"
  | "pocketbase_token"
  | "hom_guest_key"
  | "public";

interface PKMAuthConfig {
  tokenKind: TokenKind;
}

apiClient.interceptors.request.use(async (config) => {
  if (config.data) {
    config.data = sanitizeForLogging(config.data);
  }

  const pt = await storageManager.getEncryptedItem("pocketbase_token");
  const ht = await storageManager.getEncryptedItem("hom_api_key");
  const gt = await storageManager.getEncryptedItem("hom_guest_key");

  let token: string | null = null;
  let tokenKind: TokenKind | null = null;

  if (pt && pt.trim() !== "") {
    token = normalizeAuthToken(pt);
    tokenKind = "pocketbase_token";
  } else if (ht && ht.trim() !== "") {
    token = normalizeAuthToken(ht);
    tokenKind = "hom_api_key";
  } else if (gt && gt.trim() !== "") {
    token = normalizeAuthToken(gt);
    tokenKind = "hom_guest_key";
  }

  if (token) {
    const bearerToken = toAuthorizationHeaderValue(token);
    const hostname = window.location.hostname;

    config.headers["Authorization"] = bearerToken;
    config.headers["X-Hostname"] = hostname;

    (config as any)._pkmAuth = { tokenKind } as PKMAuthConfig;
  } else {
    const PUBLIC_ACCESS_TOKEN = import.meta.env.VITE_PUBLIC_ACCESS_TOKEN || "";
    if (PUBLIC_ACCESS_TOKEN) {
      token = normalizeAuthToken(PUBLIC_ACCESS_TOKEN);
      const bearerToken = toAuthorizationHeaderValue(token);
      config.headers["Authorization"] = bearerToken;
      config.headers["X-Hostname"] = window.location.hostname;
      (config as any)._pkmAuth = { tokenKind: "public" } as PKMAuthConfig;
    } else {
      secureLogger.warn("[auth] no public access token configured");
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = sanitizeForLogging(response.data);
    }
    return response;
  },
  (error) => {
    const auth = (error.config as any)?._pkmAuth as PKMAuthConfig | undefined;
    const kind = auth?.tokenKind;

    if (error.response?.status === 401) {
      secureLogger.warn(
        "[auth] 401 unauthorized - clearing stored token",
        kind || "unknown",
      );

      if (kind === "hom_api_key") {
        storageManager.removeItem("hom_api_key");
      } else if (kind === "pocketbase_token") {
        storageManager.removeItem("pocketbase_token");
        storageManager.removeItem("pocketbase_user");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-error"));
        }
      } else if (kind === "hom_guest_key") {
        storageManager.removeItem("hom_guest_key");
      }

      if (typeof window !== "undefined" && (window as any).toast) {
        (window as any).toast.error("session expired - please log in again");
      }
    } else if (error.code === "ECONNABORTED") {
      secureLogger.error("[api] request timeout", error.config?.url);
    } else {
      const url = error.config?.url || "";
      const status = error.response?.status;
      if (url.includes("pkm_canvases") && status === 500) {
        // collection doesn't exist - expected on first run
      } else {
        secureLogger.debug("[api] unexpected error", {
          status,
          url,
          message: error.message,
        });
      }
    }

    return Promise.reject(error);
  },
);

export const apiRequest = async <T = unknown>(
  resource: string,
  action: string,
  options: Record<string, unknown> = {},
): Promise<T> => {
  const { method = "GET", data, ...rest } = options;
  try {
    const res = await apiClient({
      url: `/${resource}:${action}`,
      method: method as any,
      data,
      ...rest,
    });
    return res.data as T;
  } catch (e) {
    secureLogger.debug("api_request_error", sanitizeForLogging(e));
    throw e;
  }
};

export default apiClient;
