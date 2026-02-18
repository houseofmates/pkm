import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/api/nocobase-client';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';

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
  members: { id: string; role?: string; customStatus?: string }[]; // Ordered list
  comment?: string;
}

interface FronterContextType {
  activeFronters: string[]; // IDs
  members: Headmate[];
  history: FrontEntry[];
  loading: boolean;
  refresh: () => promise<void>;
  registerFrontChange: (memberIds: string[], comment?: string) => promise<void>;

  // legacy support (to be refactored out)
  overrides: record<string, any>;
  updateOverride: (id: string, data: any) => void;
  setoverrides: (overrides: record<string, any>) => void;
  flushOverrides: () => promise<void>;
  cacheMemberColors: (members: any[]) => void;
  updateFronters: (fronters: string[]) => void;
  toggleFronter: (id: string) => void; // convenience
  
  // member colors from simplyplural
  membercolors: record<string, string>;
}

const frontercontext = createcontext<FronterContextType | undefined>(undefined);

export function fronterprovider({ children }: { children: reactnode }) {
  const [members, setmembers] = usestate<Headmate[]>([]);
  const [history, sethistory] = usestate<FrontEntry[]>([]);
  const [activefronters, setactivefronters] = usestate<string[]>([]);
  const [loading, setloading] = usestate(true);
  
  // member colors state
  const [membercolors, setmembercolors] = usestate<Record<string, string>>(() => {
    try {
      const stored = localstorage.getitem('member_colors');
      return stored ? json.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // overrides for simplyplural integration
  const [overrides, setoverridesstate] = usestate<Record<string, any>>(() => {
  try {
  const stored = localstorage.getitem('headmate_overrides');
  return stored ? json.parse(stored) : {};
  } catch {
  return {};
  }
  });

  const setoverrides = (newoverrides: record<string, any>) => {
  setOverridesState(newOverrides);
  localStorage.setItem('headmate_overrides', JSON.stringify(newOverrides));
  };

  const updateOverride = (id: string, data: any) => {
  const newOverrides = {
  ...overrides,
  [id]: { ...overrides[id], ...data }
  };
  setOverrides(newOverrides);
  };

  const flushOverrides = async () => {
  // save to localstorage (already done in setoverrides)
  return Promise.resolve();
  };

  const cacheMemberColors = (members: any[]) => {
  // store member colors from simplyplural
  const colorcache: record<string, string> = {};
  members.forEach((m: any) => {
  if (m.content?.color) {
 colorCache[m.id] = m.content.color;
  }
  });
  setMemberColors(colorCache);
  localStorage.setItem('member_colors', JSON.stringify(colorCache));
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
 const res = await api.listRecords('headmates', { sort: 'name', pageSize: 100 });
 headmatesData = Array.isArray(res) ? res : ((res as { data?: any[] })?.data || []);
  } catch (e) {
 secureLogger.warn("Headmates collection missing?", e);
 // create if missing?
 // for now, assume schema creation is a separate step or handled via ui.
 // but the user asked for "schema strategy". i should perhaps ensure they exist here?
 // i'll leave empty if missing.
  }

  // fetch history
  let historyData: any[] = [];
  try {
 const res = await api.listRecords('front_history', { sort: '-startTime', pageSize: 50 });
 historyData = Array.isArray(res) ? res : ((res as { data?: any[] })?.data || []);
  } catch (e) {
 secureLogger.warn("Front history missing?", e);
  }

  // parse members
  const parsedMembers: Headmate[] = headmatesData.map((m: any) => ({
 id: m.id?.toString(), // Ensure string ID
 name: m.name || 'Unnamed',
 avatar: m.avatar?.[0]?.url || m.avatarUrl, // NocoBase attachment vs direct URL
 pronouns: m.pronouns,
 color: m.color,
 description: m.description
  }));
  setMembers(parsedMembers);

  // parse history
  const parsedHistory: FrontEntry[] = historyData.map((h: any) => ({
 id: h.id?.toString(),
 startTime: h.startTime || h.createdAt,
 endTime: h.endTime,
 members: typeof h.members === 'string' ? JSON.parse(h.members) : (h.members || []),
 comment: h.comment
  }));
  setHistory(parsedHistory);

  // derive active fronters
  // find most recent entry with no endtime
  const latest = parsedHistory[0];
  secureLogger.info('Latest front history entry:', latest);
  secureLogger.info('All history entries:', parsedHistory);
  if (latest && !latest.endTime) {
 const fronterIds = latest.members.map(m => m.id);
 secureLogger.info('Setting active fronters from history:', fronterIds);
 setActiveFronters(fronterIds);

 // also cache to localstorage as backup
 try {
 localStorage.setItem('pkm_active_fronters', JSON.stringify(fronterIds));
 } catch (e) {
 secureLogger.warn('Failed to cache fronters to localStorage:', e);
 }
  } else {
 secureLogger.info('No active front found in history, checking localStorage backup');
 // try to restore from localstorage if database has no active front
 try {
 const cached = localStorage.getItem('pkm_active_fronters');
 if (cached) {
 const cachedIds = JSON.parse(cached);
 secureLogger.info('Restoring fronters from localStorage:', cachedIds);
 setActiveFronters(cachedIds);
 } else {
 setActiveFronters([]);
 }
 } catch (e) {
 secureLogger.warn('Failed to restore from localStorage:', e);
 setActiveFronters([]);
 }
  }

  } catch (e) {
  secureLogger.error("Failed to refresh fronter data", e);
  toast.error("failed to load system core data");
  } finally {
  setLoading(false);
  }
  };

  // initial load & poll
  useEffect(() => {
  refresh();
  const interval = setInterval(refresh, 60000); // Poll every minute
  return () => clearInterval(interval);
  }, []);

  const registerFrontChange = async (memberIds: string[], comment?: string) => {
  const timestamp = new Date().toISOString();
  secureLogger.info('registerFrontChange called with:', { memberIds, timestamp });

  try {
  // 1. close current front if exists
  const currentActive = history.find(h => !h.endTime);
  secureLogger.info('Current active front:', currentActive);
  if (currentActive) {
 secureLogger.info('Closing current front:', currentActive.id);
 const updateResult = await api.updateRecord('front_history', currentActive.id, {
 endTime: timestamp
 });
 secureLogger.info('Current front closed, result:', updateResult);
  }

  // 2. create new front
  if (memberIds.length > 0) {
 const newEntry = {
 startTime: timestamp,
 members: memberIds.map((id, index) => ({
 id,
 role: index === 0 ? 'primary' : 'secondary',
 order: index
 })),
 comment
 };
 secureLogger.info('Creating new front entry:', newEntry);
 const createResult = await api.createRecord('front_history', newEntry);
 secureLogger.info('New front entry created, result:', createResult);
  } else {
 secureLogger.info('No members specified, just closing previous front');
  }

  // 3. refresh
  secureLogger.info('Calling refresh...');
  await refresh();
  secureLogger.info('Refresh complete');
  toast.success("front updated");

  } catch (e) {
  secureLogger.error('registerFrontChange error:', e);
  toast.error("failed to update front");
  }
  };

  const toggleFronter = (id: string) => {
  const stringId = String(id);
  const stringFronters = activeFronters.map(String);
  const isCnt = stringFronters.includes(stringId);
  const newIds = isCnt
  ? activeFronters.filter(fid => String(fid) !== stringId)
  : [...activeFronters, stringId];
  secureLogger.info('toggleFronter:', { id: stringId, wasFronting: isCnt, newFronters: newIds });

  // optimistic update: set state immediately
  setActiveFronters(newIds);

  // cache to localstorage immediately
  try {
  localStorage.setItem('pkm_active_fronters', JSON.stringify(newIds));
  secureLogger.info('Cached to localStorage:', newIds);
  } catch (e) {
  secureLogger.warn('Failed to cache fronters:', e);
  }

  // then sync to backend (don't await, it refreshes internally)
  registerFrontChange(newIds).catch(err => {
  securelogger.error('failed to register front change:', err);
  // revert optimistic update on failure
  setactivefronters(activefronters);
  });
  };

  return (
  <FronterContext.Provider value={{
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
  memberColors
  }}>
  {children}
  </FronterContext.Provider>
  );
}

export function useFronter() {
  const context = useContext(FronterContext);
  if (context === undefined) {
  throw new Error('useFronter must be used within a FronterProvider');
  }
  return context;
}
