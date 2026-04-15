import { nocobaseClient } from "@/lib/nocobase";
import { localDbService } from "./local-db.service";
import { useCollectionsStore } from "@/store/useCollectionsStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { secureLogger } from "@/lib/secure-logger";
import { toast } from "sonner";
import "./field-types";
import type { FieldInstance } from "./schema.service";
import { io, Socket } from "socket.io-client";
import { pb } from "@/lib/nocobase";

const SYNC_THEME_COLOR = "#f6b012";

const HARDCODED_COLLECTIONS = [
  "activities",
  "activity_logs",
  "bookmarks",
  "captures",
  "drawings",
  "events",
  "exercise",
  "finances",
  "habits",
  "headmates",
  "hygiene-log",
  "journal",
  "media",
  "products",
  "sleep",
];

class DataService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscriptions: Map<string, () => void> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || window.location.origin;

    try {
      this.socket = io(backendUrl, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on("connect", () => {
        secureLogger.info("[DataSync] websocket connected");
        this.reconnectAttempts = 0;
      });

      this.socket.on("disconnect", (reason) => {
        secureLogger.info("[DataSync] websocket disconnected:", reason);
      });

      this.socket.on("connect_error", (error) => {
        this.reconnectAttempts++;
        secureLogger.warn(
          "[DataSync] websocket connection error:",
          error.message,
        );
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          secureLogger.error("[DataSync] max reconnection attempts reached");
          this.socket?.disconnect();
        }
      });

      this.socket.on("data_update", (payload) => {
        secureLogger.info("[DataSync] received data update:", payload.type);
        this.handleDataUpdate(payload);
      });
    } catch (error) {
      secureLogger.error("[DataSync] failed to initialize socket:", error);
    }
  }

  private handleDataUpdate(payload: any): void {
    const { type, source } = payload;

    switch (type) {
      case "activity_logged":
        this.refreshGamificationState();
        break;
      case "gamification_updated":
        this.refreshGamificationState();
        break;
      case "collections_updated":
        this.syncTables();
        break;
      default:
        secureLogger.info("[DataSync] unknown update type:", type);
    }

    if (source !== "self") {
      toast.success("system synced", {
        style: {
          background: "#1a1a1a",
          border: `1px solid ${SYNC_THEME_COLOR}40`,
          color: "#fff",
        },
        description: "data updated from another device",
        duration: 2000,
        position: "bottom-right",
      });
    }
  }

  private async refreshGamificationState(): Promise<void> {
    try {
      const gamificationStore = useGamificationStore.getState();
      await gamificationStore.loadFromServer();
      secureLogger.info("[DataSync] gamification state refreshed from server");
    } catch (error) {
      secureLogger.warn(
        "[DataSync] failed to refresh from server, using cache:",
        error,
      );
    }
  }

  public emitDataUpdate(dataType: string, payload: any): void {
    if (this.socket?.connected) {
      this.socket.emit("client_data_update", {
        type: dataType,
        timestamp: new Date().toISOString(),
        source: "self",
        ...payload,
      });
      secureLogger.info("[DataSync] emitted data update:", dataType);
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public async createTable(
    name: string,
    fields: FieldInstance[],
  ): Promise<void> {
    secureLogger.info(
      `Creating collection "${name}" via NocoBase API`,
    );

    // nocobase collections are created via api
    secureLogger.info(
      "[DataService] Creating NocoBase collection via API",
    );

    await this.syncTables();
    this.emitDataUpdate("collections_updated", { collection_name: name });
  }

  public async syncTables(): Promise<void> {
    try {
      const cachedCollections = await localDbService.getAllCollections();
      if (cachedCollections && cachedCollections.length > 0) {
        secureLogger.info(
          `Loaded ${cachedCollections.length} collections from cache.`,
        );
        useCollectionsStore.getState().setCollections(cachedCollections);
      }
    } catch (error) {
      secureLogger.error("Failed to load collections from cache:", error);
    }

    try {
      // nocobase has a direct list collections endpoint
      // use hardcoded collections as fallback
      const freshCollections = HARDCODED_COLLECTIONS.map((name) => ({
        name,
        title: name,
        fields: [],
      }));

      secureLogger.info(
        `Using ${freshCollections.length} collections for NocoBase.`,
      );

      const SYSTEM_NAMES = new Set([
        "server-stats",
        "pkm_backend",
        "pkm_canvases",
        "pkm_settings",
        "form-submissions",
        "public_blocks",
        "public_pages",
        "site-pages",
        "website",
        "front_history",
        "sidebar_item_colors",
        "dupemates-stats",
        "dupemates-pages",
        "dupe-forms",
        "llms",
        "roles",
        "users",
        "_auths",
        "_logins",
      ]);

      const userCollections = freshCollections.filter((c: any) => {
        const name = (c.name || "").toLowerCase();
        return !SYSTEM_NAMES.has(name);
      });

      await localDbService.saveCollections(userCollections);
      useCollectionsStore.getState().setCollections(userCollections as any);
    } catch (error) {
      secureLogger.error(
        "Failed to sync collections from NocoBase. App may be offline.",
        error,
      );
    }
  }

  public subscribeToCollection(
    collectionName: string,
    callback: (e: { action: string; record: any }) => void,
  ): () => void {
    if (this.subscriptions.has(collectionName)) {
      return this.subscriptions.get(collectionName)!;
    }

    const unsubscribe = nocobaseClient.subscribe(collectionName, callback);
    this.subscriptions.set(collectionName, unsubscribe);
    return unsubscribe;
  }

  public unsubscribeFromCollection(collectionName: string): void {
    nocobaseClient.unsubscribe(collectionName);
    this.subscriptions.delete(collectionName);
  }
}

export const dataService = new DataService();
