import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useFronter } from '@/contexts/fronter-context';
import { AuthContext } from '@/contexts/auth-context';
import type { LLMContextPayload, IdentityContext, AffectiveContext, ActivityContext } from '@/types/llm-context';
// import { usecollections } from '@/hooks/use-collections';
import { debounce } from 'lodash';
import { formatHeadmateName } from '@/utils/text-formatting';
import { secureLogger } from '@/lib/secure-logger';

const LLMContext = createContext<LLMContextPayload | null>(null);

export function LLMContextProvider({ children }: { children: React.ReactNode }) {
  const { activeFronters, overrides } = useFronter();

  // `LLMContextProvider` relies on `useAuth` but we sometimes hit a
  // situation where the hook is accidentally called outside of an
  // `AuthProvider` (especially during hot reloads or early renders).
  // Rather than blowing up the whole app, we guard here and render
  // the children directly if the context is unavailable.  This keeps
  // the rest of the tree functional while we investigate why the
  // provider chain was broken.
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const client = authContext?.client;

  // early return check moved to render to avoid conditional hooks
  const hasAuthProvider = Boolean(authContext);

  // ref to track last pushed context to avoid spamming the main process
  const lastPushedRef = useRef<string | null>(null);

  // --- 0. collection availability check ---
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);

  useEffect(() => {
    if (!hasAuthProvider || !isAuthenticated || !client) return;
    client.listCollections({ pageSize: 100 }).then((res: any) => {
      const list = Array.isArray(res?.data) ? res.data : res?.data;

      if (Array.isArray(list)) {
        setAvailableCollections(list.map((c: any) => c.name));
      }
    }).catch((e) => { secureLogger.warn('Failed to fetch available collections:', e); });
  }, [client, isAuthenticated, hasAuthProvider]);

  // local state for aggregated context
  const [context, setContext] = useState<LLMContextPayload | null>(null);

  // --- 1. identity context ---
  const getIdentityContext = (): IdentityContext => {
    // in a real app, we might fetch the full member details from a cache or nocobase
    // for now, we use the active id and any local overrides
    if (!activeFronters || activeFronters.length === 0) return { activeFronter: null };

    const primaryId = activeFronters[0];
    const override = overrides[primaryId] || {};

    return {
      activeFronter: {
        id: primaryId,
        name: formatHeadmateName((override as any).name || primaryId), // fallback
        avatarUrl: (override as any).avatarUrl
      },
      systemName: "system" // placeholder
    };
  };

  // --- 2. affective context ---
  const [moodState, setMoodState] = useState<AffectiveContext['currentMood']>(null);

  useEffect(() => {
    if (!hasAuthProvider || !isAuthenticated || !client) return;
    if (!availableCollections.includes('moods')) return;

    // strategy: look for a 'moods' or 'journal' collection
    const checkMood = async () => {
      // try 'moods' collection first
      try {
 const res = await client.listRecords('moods', { pageSize: 1, sort: '-createdAt' });
 const rawData = res?.data;
 const data = Array.isArray(rawData) ? rawData : [];

        if (data && data.length > 0) {
          const last = data[0];
          setMoodState({
            name: last.mood || last.name || last.state || 'Unknown',
            intensity: last.intensity,
            note: last.note || last.description
          });
          return;
        }
      } catch (e) { /* ignore */ }

      // fallback: check for 'pkm_settings' -> 'current_mood'
      // (we could implement this if 'moods' fails)
    };

    checkMood();
    // poll every minute? or just on mount/change.
    const interval = setInterval(checkMood, 60000);
    return () => clearInterval(interval);
  }, [client, isAuthenticated, availableCollections]);

  // --- 3. activity context ---
  const [recentActivity, setRecentActivity] = useState<ActivityContext['recentActions']>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!availableCollections.includes('journal')) return;

    const checkActivity = async () => {
      // check 'journal' or just generic audit logs?
      // let's look for 'journal'
      try {
 if (!client) return;
 const res = await client.listRecords('journal', { pageSize: 3, sort: '-createdAt' });
 const rawData = res?.data;
 const data = Array.isArray(rawData) ? rawData : [];

        if (data && data.length > 0) {
          setRecentActivity(data.map((item: any) => ({
            type: 'journal_entry',
            summary: item.title || item.content?.substring(0, 50) || 'Entry',
            timestamp: item.createdAt || new Date().toISOString()
          })));
        }
      } catch (e) { /* ignore */ }
    };
    checkActivity();
    const interval = setInterval(checkActivity, 60000);
    return () => clearInterval(interval);
  }, [client, isAuthenticated, availableCollections]);


  // --- aggregation & push ---

  // debounced push function
  const pushContext = useRef(debounce((payload: LLMContextPayload) => {
    const str = JSON.stringify(payload);
    if (str !== lastPushedRef.current) {
      secureLogger.info("Pushing LLM Context to Electron:", payload);
      if (window.electron && window.electron.updateContext) {
        window.electron.updateContext(payload);
      }
      lastPushedRef.current = str;
    }
  }, 1000)).current;

  useEffect(() => {
    const payload: LLMContextPayload = {
      identity: getIdentityContext(),
      affective: { currentMood: moodState },
      activity: { recentActions: recentActivity },
      timestamp: new Date().toISOString(),
      generatedAt: new Date().toISOString()
    };

    setContext(payload);
    pushContext(payload);
  }, [activeFronters, overrides, moodState, recentActivity]);

  return (
    <LLMContext.Provider value={context}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLMContext() {
  return useContext(LLMContext);
}
