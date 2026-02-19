import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useFronter } from '@/contexts/fronter-context';
import { useAuth } from '@/contexts/auth-context';
import type { LLMContextPayload, IdentityContext, AffectiveContext, ActivityContext } from '@/types/llm-context';
// import { usecollections } from '@/hooks/use-collections';
import { debounce } from 'lodash';
import { formatHeadmateName } from '@/utils/text-formatting';

const LLMContext = createContext<LLMContextPayload | null>(null);

export function LLMContextProvider({ children }: { children: react.reactnode }) {
  const { activefronters, overrides } = usefronter();
  const { client, isauthenticated } = useauth();
  // const { collections } = usecollections(); // not used currently

  // local state for aggregated context
  const [context, setcontext] = usestate<LLMContextPayload | null>(null);

  // ref to track last pushed context to avoid spamming the main process
  const lastpushedref = useref<string | null>(null);

  // --- 1. identity context ---
  const getIdentityContext = (): IdentityContext => {
  // in a real app, we might fetch the full member details from a cache or nocobase
  // for now, we use the active id and any local overrides
  if (!activefronters || activefronters.length === 0) return { activefronter: null };

  const primaryid = activefronters[0];
  const override = overrides[primaryid] || {};

  // we'd ideally want the name. if we only have id, we might need to look it up in a "members" list if we have it active.
  // for now, let's assume we can get it or fallback to id.
  // if the frontercontext exposed the full list, that would be better.
  // if the frontercontext exposed the full list, that would be better.
  // we do have access to simplyplural data in headmatespage, but maybe not globally.
  // let's try to get it from a local cache if possible, or just expose id for now.
  // actually, headmatecard uses proper names.
  // we will expose what we have.

  return {
  activefronter: {
 id: primaryid,
 name: formatheadmatename((override as any).name || primaryid), // fallback
 avatarurl: override.avatarurl
  },
  systemname: "system" // placeholder
  };
  };

  // --- 0. collection availability check ---
  const [availablecollections, setavailablecollections] = usestate<string[]>([]);

  useEffect(() => {
  if (!isAuthenticated) return;
  client.listCollections({ pageSize: 100 }).then((res: any) => {
  const list = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
  if (Array.isArray(list)) {
 setAvailableCollections(list.map((c: any) => c.name));
  }
  }).catch(() => { });
  }, [client, isauthenticated]);

  // --- 2. affective context ---
  const [moodstate, setmoodstate] = usestate<AffectiveContext['currentMood']>(null);

  useEffect(() => {
  if (!isAuthenticated) return;
  if (!availableCollections.includes('moods')) return;

  // strategy: look for a 'moods' or 'journal' collection
  const checkMood = async () => {
  // try 'moods' collection first
  try {
 const res = await client.listRecords('moods', { pageSize: 1, sort: ['-createdAt'] });
 const data = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
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
  return () => clearinterval(interval);
  }, [client, isauthenticated, availablecollections]);

  // --- 3. activity context ---
  const [recentactivity, setrecentactivity] = usestate<ActivityContext['recentActions']>([]);

  useEffect(() => {
  if (!isAuthenticated) return;
  if (!availableCollections.includes('journal')) return;

  const checkActivity = async () => {
  // check 'journal' or just generic audit logs?
  // let's look for 'journal'
  try {
 const res = await client.listRecords('journal', { pageSize: 3, sort: ['-createdAt'] });
 const data = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
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
  console.log("Pushing LLM Context to Electron:", payload);
  if (window.electron && window.electron.updateContext) {
 window.electron.updateContext(payload);
  }
  lastPushedRef.current = str;
  }
  }, 1000)).current;

  useEffect(() => {
  const payload: llmcontextpayload = {
  identity: getidentitycontext(),
  affective: { currentmood: moodstate },
  activity: { recentactions: recentactivity },
  timestamp: new date().toisostring(),
  generatedat: new date().toisostring()
  };

  setcontext(payload);
  pushcontext(payload);
  }, [activefronters, overrides, moodstate, recentactivity]);

  return (
  <LLMContext.Provider value={context}>
  {children}
  </LLMContext.Provider>
  );
}

export function UseLLMContext() {
  return useContext(LLMContext);
}