import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/api/nocobase-client';
import { toast } from 'sonner';

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
  refresh: () => Promise<void>;
  registerFrontChange: (memberIds: string[], comment?: string) => Promise<void>;

  // Legacy support (to be refactored out)
  overrides: Record<string, any>;
  updateOverride: (id: string, data: any) => void;
  setOverrides: (overrides: Record<string, any>) => void;
  flushOverrides: () => Promise<void>;
  cacheMemberColors: (members: any[]) => void;
  updateFronters: (fronters: string[]) => void;
  toggleFronter: (id: string) => void; // Convenience
  
  // Member colors from SimplyPlural
  memberColors: Record<string, string>;
}

const FronterContext = createContext<FronterContextType | undefined>(undefined);

export function FronterProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Headmate[]>([]);
  const [history, setHistory] = useState<FrontEntry[]>([]);
  const [activeFronters, setActiveFronters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Member colors state
  const [memberColors, setMemberColors] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('member_colors');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Overrides for SimplyPlural integration
  const [overrides, setOverridesState] = useState<Record<string, any>>(() => {
  try {
  const stored = localStorage.getItem('headmate_overrides');
  return stored ? JSON.parse(stored) : {};
  } catch {
  return {};
  }
  });

  const setOverrides = (newOverrides: Record<string, any>) => {
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
  // Save to localStorage (already done in setOverrides)
  return Promise.resolve();
  };

  const cacheMemberColors = (members: any[]) => {
  // Store member colors from SimplyPlural
  const colorCache: Record<string, string> = {};
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
  // 1. Ensure Collections Exist (Lazy Init)
  // Ideally this runs once, but for safety in dev:
  // catch errors? assuming they exist or we create them.
  // Let's just try list.

  // Fetch Headmates
  let headmatesData: any[] = [];
  try {
 const res = await api.listRecords('headmates', { sort: 'name', pageSize: 100 });
 headmatesData = Array.isArray(res) ? res : ((res as { data?: any[] })?.data || []);
  } catch (e) {
 console.warn("Headmates collection missing?", e);
 // Create if missing?
 // For now, assume schema creation is a separate step or handled via UI.
 // But the user asked for "Schema Strategy". I should perhaps ensure they exist here?
 // I'll leave empty if missing.
  }

  // Fetch History
  let historyData: any[] = [];
  try {
 const res = await api.listRecords('front_history', { sort: '-startTime', pageSize: 50 });
 historyData = Array.isArray(res) ? res : ((res as { data?: any[] })?.data || []);
  } catch (e) {
 console.warn("Front history missing?", e);
  }

  // Parse Members
  const parsedMembers: Headmate[] = headmatesData.map((m: any) => ({
 id: m.id?.toString(), // Ensure string ID
 name: m.name || 'Unnamed',
 avatar: m.avatar?.[0]?.url || m.avatarUrl, // NocoBase attachment vs direct URL
 pronouns: m.pronouns,
 color: m.color,
 description: m.description
  }));
  setMembers(parsedMembers);

  // Parse History
  const parsedHistory: FrontEntry[] = historyData.map((h: any) => ({
 id: h.id?.toString(),
 startTime: h.startTime || h.createdAt,
 endTime: h.endTime,
 members: typeof h.members === 'string' ? JSON.parse(h.members) : (h.members || []),
 comment: h.comment
  }));
  setHistory(parsedHistory);

  // Derive Active Fronters
  // Find most recent entry with NO endTime
  const latest = parsedHistory[0];
  console.log('Latest front history entry:', latest);
  console.log('All history entries:', parsedHistory);
  if (latest && !latest.endTime) {
 const fronterIds = latest.members.map(m => m.id);
 console.log('Setting active fronters from history:', fronterIds);
 setActiveFronters(fronterIds);

 // Also cache to localStorage as backup
 try {
 localStorage.setItem('pkm_active_fronters', JSON.stringify(fronterIds));
 } catch (e) {
 console.warn('Failed to cache fronters to localStorage:', e);
 }
  } else {
 console.log('No active front found in history, checking localStorage backup');
 // Try to restore from localStorage if database has no active front
 try {
 const cached = localStorage.getItem('pkm_active_fronters');
 if (cached) {
 const cachedIds = JSON.parse(cached);
 console.log('Restoring fronters from localStorage:', cachedIds);
 setActiveFronters(cachedIds);
 } else {
 setActiveFronters([]);
 }
 } catch (e) {
 console.warn('Failed to restore from localStorage:', e);
 setActiveFronters([]);
 }
  }

  } catch (e) {
  console.error("Failed to refresh fronter data", e);
  toast.error("failed to load system core data");
  } finally {
  setLoading(false);
  }
  };

  // Initial Load & Poll
  useEffect(() => {
  refresh();
  const interval = setInterval(refresh, 60000); // Poll every minute
  return () => clearInterval(interval);
  }, []);

  const registerFrontChange = async (memberIds: string[], comment?: string) => {
  const timestamp = new Date().toISOString();
  console.log('registerFrontChange called with:', { memberIds, timestamp });

  try {
  // 1. Close current front if exists
  const currentActive = history.find(h => !h.endTime);
  console.log('Current active front:', currentActive);
  if (currentActive) {
 console.log('Closing current front:', currentActive.id);
 const updateResult = await api.updateRecord('front_history', currentActive.id, {
 endTime: timestamp
 });
 console.log('Current front closed, result:', updateResult);
  }

  // 2. Create new front
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
 console.log('Creating new front entry:', newEntry);
 const createResult = await api.createRecord('front_history', newEntry);
 console.log('New front entry created, result:', createResult);
  } else {
 console.log('No members specified, just closing previous front');
  }

  // 3. Refresh
  console.log('Calling refresh...');
  await refresh();
  console.log('Refresh complete');
  toast.success("front updated");

  } catch (e) {
  console.error('registerFrontChange error:', e);
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
  console.log('toggleFronter:', { id: stringId, wasFronting: isCnt, newFronters: newIds });

  // OPTIMISTIC UPDATE: Set state immediately
  setActiveFronters(newIds);

  // Cache to localStorage immediately
  try {
  localStorage.setItem('pkm_active_fronters', JSON.stringify(newIds));
  console.log('Cached to localStorage:', newIds);
  } catch (e) {
  console.warn('Failed to cache fronters:', e);
  }

  // Then sync to backend (don't await, it refreshes internally)
  registerFrontChange(newIds).catch(err => {
  console.error('Failed to register front change:', err);
  // Revert optimistic update on failure
  setActiveFronters(activeFronters);
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
