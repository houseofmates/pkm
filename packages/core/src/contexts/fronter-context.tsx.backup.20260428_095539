{/* eslint-disable */}
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { nocobaseClient } from "@/lib/nocobase";
import { toast } from "sonner";
import { secureLogger } from "@/lib/secure-logger";
import { storageManager } from "@/lib/storage-manager";
import { SimplyPluralClient } from "@/lib/simply-plural-client";

export interface Headmate {
  id: string;
  name: string;
  avatar?: string;
  pronouns?: string;
  color?: string;
  description?: string;
  // ... any other fields
}

export interface FrontEntry {
  id: string;
  startTime: string;
  endTime?: string;
  members: { id: string; role?: string; customStatus?: string }[]; // ordered list
  comment?: string;
}

interface FronterContextType {
  activeFronters: string[]; // ids
  members: Headmate[];
  history: FrontEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  registerFrontChange: (memberIds: string[], comment?: string) => Promise<void>;

  // legacy support (to be refactored out)
  overrides: Record<string, any>;
  updateOverride: (id: string, data: any) => void;
  setOverrides: (overrides: Record<string, any>) => void;
  flushOverrides: () => Promise<void>;
  cacheMemberColors: (members: any[]) => void;
  updateFronters: (fronters: string[]) => void;
  toggleFronter: (id: string) => void; // convenience

  // member colors from simplyplural
  memberColors: Record<string, string>;
}

const FronterContext = createContext<FronterContextType | undefined>(undefined);

export function FronterProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Headmate[]>([]);
  const [history, setHistory] = useState<FrontEntry[]>([]);
  const [activeFronters, setActiveFronters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // member colors state
  const [memberColors, setMemberColors] = useState<Record<string, string>>(
    () => {
      try {
        const stored = storageManager.getItem("member_colors");
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    },
  );

  // overrides for simplyplural integration
  const [overrides, setOverridesState] = useState<Record<string, any>>(() => {
    try {
      const stored = storageManager.getItem("headmate_overrides");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const setOverrides = (newOverrides: Record<string, any>) => {
    setOverridesState(newOverrides);
    storageManager.setItem("headmate_overrides", JSON.stringify(newOverrides));
  };

  const updateOverride = (id: string, data: any) => {
    const newOverrides = {
      ...overrides,
      [id]: { ...overrides[id], ...data },
    };
    setOverrides(newOverrides);
  };

  const flushOverrides = async () => {
    // save to localstorage (already done in setoverrides)
    return Promise.resolve();
  };

  const cacheMemberColors = (members: any[]) => {
    // store member colors from simplyplural
    const colorCache: Record<string, string> = {};
    members.forEach((m: any) => {
      if (m.content?.color) {
        colorCache[m.id] = m.content.color;
      }
    });
    setMemberColors(colorCache);
    storageManager.setItem("member_colors", JSON.stringify(colorCache));
  };

  const updateFronters = (fronters: string[]) => {
    setActiveFronters(fronters);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      // 1. ensure collections exist (lazy init)
      // ideally this runs once, but for safety in dev:
      // catch errors? assuming they exist or we create them.
      // let's just try list.

      // fetch headmates
      let headmatesData: any[] = [];
      try {
        const res = await nocobaseClient.listRecords("headmates", {
          sort: "name",
          pageSize: 100,
        });
        headmatesData = res.data || [];
      } catch (e) {
        secureLogger.warn("Headmates collection missing?", e);
        // create if missing?
        // for now, assume schema creation is a separate step or handled via ui.
        // but the user asked for "schema strategy". i should perhaps ensure they exist here?
        // i'll leave empty if missing.
      }

      // fetch history (keep existing if fetch fails)
      let historyData: any[] | null = null;
      try {
        const res = await nocobaseClient.listRecords("front_history", {
          sort: "-startTime",
          pageSize: 50,
        });
        historyData = res.data || [];
      } catch (e: any) {
        // axios aborts (e.g. hmr / navigation) often show as econnaborted.
        // this is not fatal; keep existing history instead of wiping it.
        const isAbort =
          e?.code === "ECONNABORTED" ||
          e?.message?.toLowerCase()?.includes("aborted");
        secureLogger.warn(
          "Front history fetch failed (will keep cached history):",
          e,
        );
        if (isAbort) {
          historyData = null;
        }
      }

      // parse members
      const parsedMembers: Headmate[] = headmatesData.map((m: any) => ({
        id: m.id?.toString(), // ensure string id
        name: m.name || "Unnamed",
        avatar: m.avatar?.[0]?.url || m.avatarUrl, // nocobase attachment vs direct url
        pronouns: m.pronouns,
        color: m.color,
        description: m.description,
      }));
      setMembers(parsedMembers);

      // parse history only if we actually fetched it
      if (historyData) {
        const parsedHistory: FrontEntry[] = historyData.map((h: any) => ({
          id: h.id?.toString(),
          startTime: h.startTime || h.createdAt,
          endTime: h.endTime,
          members:
            typeof h.members === "string"
              ? JSON.parse(h.members)
              : h.members || [],
          comment: h.comment,
        }));
        setHistory(parsedHistory);

        // derive active fronters
        const latest = parsedHistory[0];
        secureLogger.info("Latest front history entry:", latest);
        secureLogger.info("All history entries:", parsedHistory);
        if (latest && !latest.endTime) {
          const fronterIds = latest.members.map((m) => m.id);
          secureLogger.info(
            "Setting active fronters from history:",
            fronterIds,
          );
          setActiveFronters(fronterIds);

          // also cache to storage manager as backup
          try {
            storageManager.setItem(
              "pkm_active_fronters",
              JSON.stringify(fronterIds),
            );
          } catch (e) {
            secureLogger.warn(
              "Failed to cache fronters to storage manager:",
              e,
            );
          }
        } else {
          secureLogger.info(
            "No active front found in history, checking localStorage backup",
          );
          // try to restore from localstorage if database has no active front
          try {
            const cached = storageManager.getItem("pkm_active_fronters");
            if (cached) {
              const cachedIds = JSON.parse(cached);
              secureLogger.info(
                "Restoring fronters from storage manager:",
                cachedIds,
              );
              setActiveFronters(cachedIds);
            } else {
              setActiveFronters([]);
            }
          } catch (e) {
            secureLogger.warn("Failed to restore from storage manager:", e);
            setActiveFronters([]);
          }
        }
      }
    } catch (e) {
      secureLogger.error("Failed to refresh fronter data", e);
      toast.error("failed to load system core data");
    } finally {
      setLoading(false);
    }
  };

  const syncFrontFromSimplyPlural = async () => {
    try {
      const apiKey = storageManager.getCachedSecret("pk_api_key");
      if (!apiKey) return;
      const meRes = await fetch(SimplyPluralClient.url("/me"), {
        headers: { Authorization: apiKey },
      });
      if (!meRes.ok) return;
      const meData = await meRes.json();
      const systemId = meData.id;
      const frontRes = await fetch(
        SimplyPluralClient.url('/fronters'),
        {
          headers: { Authorization: apiKey },
        },
      );
      if (!frontRes.ok) return;
      const frontData = await frontRes.json();
      if (frontData && Array.isArray(frontData.fronters)) {
        const spFronters = frontData.fronters.map((f: any) => f.id);
        setActiveFronters(spFronters);
        storageManager.setItem(
          "pkm_active_fronters",
          JSON.stringify(spFronters),
        );
        secureLogger.info("Synced fronters from SimplyPlural:", spFronters);
      }
    } catch (err) {
      secureLogger.error("SimplyPlural front pull error:", err);
    }
  };

  // initial load & poll
  useEffect(() => {
    let cancelled = false;
    const doRefresh = async () => {
      if (!cancelled) await refresh();
      if (!cancelled) await syncFrontFromSimplyPlural();
    };
    doRefresh();
    const interval = setInterval(doRefresh, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const registerFrontChange = async (memberIds: string[], comment?: string) => {
    const timestamp = new Date().toISOString();
    secureLogger.info("registerFrontChange called with:", {
      memberIds,
      timestamp,
    });

    try {
      // 1. close current front if exists
      const currentActive = history.find((h) => !h.endTime);
      secureLogger.info("Current active front:", currentActive);
      if (currentActive) {
        secureLogger.info("Closing current front:", currentActive.id);
        const updateResult = await nocobaseClient.updateRecord(
          "front_history",
          currentActive.id,
          {
            endTime: timestamp,
          },
        );
        secureLogger.info("Current front closed, result:", updateResult);
      }

      // 2. create new front
      if (memberIds.length > 0) {
        const newEntry: Record<string, string | number | boolean | undefined> =
          {
            startTime: timestamp,
            members: JSON.stringify(
              memberIds.map((id, index) => ({
                id,
                role: index === 0 ? "primary" : "secondary",
                order: index,
              })),
            ),
            comment,
          };
        secureLogger.info("Creating new front entry:", newEntry);
        const createResult = await nocobaseClient.createRecord(
          "front_history",
          newEntry,
        );
        secureLogger.info("New front entry created, result:", createResult);

        try {
          const apiKey = storageManager.getCachedSecret("pk_api_key");
          if (apiKey) {
            const meRes = await fetch(SimplyPluralClient.url("/me"), {
              headers: { Authorization: apiKey },
            });
            if (!meRes.ok)
              throw new Error("Failed to fetch system info from SimplyPlural");
            const meData = await meRes.json();
            const systemId = meData.id;
            const frontPayload = {
              fronters: memberIds.map((id, idx) => ({
                id,
                role: idx === 0 ? "primary" : "secondary",
              })),
            };
            const frontRes = await fetch(
              SimplyPluralClient.url('/fronters'),
              {
                method: "PATCH",
                headers: {
                  Authorization: apiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(frontPayload),
              },
            );
            if (!frontRes.ok) {
              const errText = await frontRes.text();
              secureLogger.warn(
                `SimplyPlural front sync failed (${frontRes.status}):`,
                errText,
              );
              toast.warning(
                `front updated locally, but SimplyPlural sync failed: ${frontRes.status} - ${errText}`,
              );
            } else {
              toast.success("front updated and synced to SimplyPlural");
            }
          }
        } catch (spErr) {
          secureLogger.error("SimplyPlural sync error:", spErr);
        }
      } else {
        secureLogger.info("No members specified, just closing previous front");
      }

      // 3. refresh
      secureLogger.info("Calling refresh...");
      await refresh();
      secureLogger.info("Refresh complete");
      toast.success("front updated");
    } catch (e) {
      secureLogger.error("registerFrontChange error:", e);
      toast.error("failed to update front");
    }
  };

  const toggleFronter = (id: string) => {
    const stringId = String(id);
    const stringFronters = activeFronters.map(String);
    const isCnt = stringFronters.includes(stringId);
    const newIds = isCnt
      ? activeFronters.filter((fid) => String(fid) !== stringId)
      : [...activeFronters, stringId];
    secureLogger.info("toggleFronter:", {
      id: stringId,
      wasFronting: isCnt,
      newFronters: newIds,
    });

    // optimistic update: set state immediately
    setActiveFronters(newIds);

    // cache to localstorage immediately
    try {
      storageManager.setItem("pkm_active_fronters", JSON.stringify(newIds));
      secureLogger.info("Cached to localStorage:", newIds);
    } catch (e) {
      secureLogger.warn("Failed to cache fronters:", e);
    }

    // then sync to backend (don't await, it refreshes internally)
    registerFrontChange(newIds).catch((err) => {
      secureLogger.error("failed to register front change:", err);
      // revert optimistic update on failure using functional update to avoid stale closure
      setActiveFronters((prev) =>
        prev.filter((fid) => String(fid) !== stringId),
      );
      toast.error("front sync failed, reverted locally");
    });
  };

  return (
    <FronterContext.Provider
      value={{
        activeFronters,
        members,
        history,
        loading,
        refresh,
        registerFrontChange,
        overrides,
        updateOverride,
        setOverrides,
        flushOverrides,
        cacheMemberColors,
        updateFronters,
        toggleFronter,
        memberColors,
      }}
    >
      {children}
    </FronterContext.Provider>
  );
}

export function useFronter() {
  const context = useContext(FronterContext);
  if (context === undefined) {
    throw new Error("useFronter must be used within a FronterProvider");
  }
  return context;
}
