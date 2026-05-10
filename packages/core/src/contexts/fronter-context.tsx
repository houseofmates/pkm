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
}

export interface FrontEntry {
  id: string;
  startTime: string;
  endTime?: string;
  members: { id: string; role?: string; customStatus?: string }[];
  comment?: string;
}

interface FronterContextType {
  activeFronters: string[];
  members: Headmate[];
  history: FrontEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  registerFrontChange: (memberIds: string[], comment?: string) => Promise<void>;
  overrides: Record<string, any>;
  updateOverride: (id: string, data: any) => void;
  setOverrides: (overrides: Record<string, any>) => void;
  flushOverrides: () => Promise<void>;
  cacheMemberColors: (members: any[]) => void;
  updateFronters: (fronters: string[]) => void;
  toggleFronter: (id: string) => void;
  memberColors: Record<string, string>;
}

const FronterContext = createContext<FronterContextType | undefined>(undefined);

export function FronterProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Headmate[]>([]);
  const [history, setHistory] = useState<FrontEntry[]>([]);
  const [activeFronters, setActiveFronters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
    return Promise.resolve();
  };

  const cacheMemberColors = (members: any[]) => {
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
      let headmatesData: any[] = [];
      try {
        const res = await nocobaseClient.listRecords("headmates", {
          sort: "name",
          pageSize: 100,
        });
        headmatesData = res.data || [];
      } catch (e) {
        secureLogger.warn("Headmates collection missing?", e);
      }

      let historyData: any[] | null = null;
      try {
        const res = await nocobaseClient.listRecords("front_history", {
          sort: "-startTime",
          pageSize: 50,
        });
        historyData = res.data || [];
      } catch (e: any) {
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

      const parsedMembers: Headmate[] = headmatesData.map((m: any) => ({
        id: m.id?.toString(),
        name: m.name || "Unnamed",
        avatar: m.avatar?.[0]?.url || m.avatarUrl,
        pronouns: m.pronouns,
        color: m.color,
        description: m.description,
      }));
      setMembers(parsedMembers);

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

      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const frontRes = await fetch(
        SimplyPluralClient.url(`/frontHistory/${systemId}`) +
        `?startTime=${oneWeekAgo}&endTime=${now}`,
        {
          headers: { Authorization: apiKey },
        },
      );
      if (!frontRes.ok) return;
      const frontData = await frontRes.json();
      if (Array.isArray(frontData) && frontData.length > 0) {
        const sorted = frontData
          .map((entry: any) => {
            const content = entry.content || {};
            return {
              memberId: content.member,
              startTime: content.startTime,
              live: content.live,
            };
          })
          .sort((a: any, b: any) => b.startTime - a.startTime);

        if (sorted.length > 0) {
          const latestTs = sorted[0].startTime;
          const latestGroup = sorted.filter((e: any) => e.startTime === latestTs);
          const spFronters = latestGroup.map((e: any) => e.memberId).filter(Boolean);

          setActiveFronters(spFronters);
          storageManager.setItem(
            "pkm_active_fronters",
            JSON.stringify(spFronters),
          );
          secureLogger.info("Synced fronters from SimplyPlural:", spFronters);
        }
      }
    } catch (err) {
      secureLogger.error("SimplyPlural front pull error:", err);
    }
  };

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
          { endTime: timestamp },
        );
        secureLogger.info("Current front closed, result:", updateResult);
      }

      // 2. create new front
      if (memberIds.length > 0) {
        const newEntry: Record<string, string | number | boolean | undefined> = {
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

        // sync to SimplyPlural
        try {
          const apiKey = storageManager.getCachedSecret("pk_api_key");
          if (!apiKey) {
            secureLogger.info("No SP API key, skipping SP sync");
            toast.success("front updated locally");
          } else {
            const meRes = await fetch(SimplyPluralClient.url("/me"), {
              headers: { Authorization: apiKey },
            });
            if (!meRes.ok) throw new Error(`SP /me failed: ${meRes.status}`);
            const meData = await meRes.json();
            const systemId = meData.id;

            const sharedTimestamp = Date.now();
            const results: { ok: boolean; status: number }[] = [];

            for (const memberId of memberIds) {
              const payload = {
                member: memberId,
                startTime: sharedTimestamp,
                live: true,
                customStatus: comment || "",
                custom: false,
              };
              const res = await fetch(
                SimplyPluralClient.url(`/frontHistory/${systemId}`),
                {
                  method: "POST",
                  headers: {
                    Authorization: apiKey,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(payload),
                },
              );
              results.push({ ok: res.ok, status: res.status });
            }

            const failedCount = results.filter(r => !r.ok).length;
            if (failedCount > 0) {
              secureLogger.warn(`SP sync: ${failedCount}/${results.length} failed`);
              toast.warning(`front updated, but SP sync had ${failedCount} failures`);
            } else {
              toast.success("front updated and synced to SimplyPlural");
            }
          }
        } catch (spErr) {
          secureLogger.error("SimplyPlural sync error:", spErr);
          toast.warning("front updated locally, but SP sync failed");
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

    setActiveFronters(newIds);

    try {
      storageManager.setItem("pkm_active_fronters", JSON.stringify(newIds));
      secureLogger.info("Cached to localStorage:", newIds);
    } catch (e) {
      secureLogger.warn("Failed to cache fronters:", e);
    }

    registerFrontChange(newIds).catch((err) => {
      secureLogger.error("failed to register front change:", err);
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
