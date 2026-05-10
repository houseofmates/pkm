import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureLogger } from '@/lib/secure-logger';
import type {
  Member,
  FrontSession,
  Group,
  JournalEntry,
  ChatMessage,
  MemberNote,
  SystemSettings,
  CustomFieldDefinition,
  FilterState,
  FrontType,
  MemberStatus,
  PrivacyLevel,
} from '../types';
import * as db from '../db/plural-system-db';

interface PluralSystemState {
  // data
  members: Member[];
  frontSessions: FrontSession[];
  groups: Group[];
  journalEntries: JournalEntry[];
  chatMessages: ChatMessage[];
  memberNotes: Record<string, MemberNote[]>;
  systemSettings: SystemSettings;
  customFieldDefinitions: CustomFieldDefinition[];

  // derived / ui
  currentFronters: { memberId: string; frontType: FrontType }[];
  activeSessionId: string | null;
  filter: FilterState;
  searchQuery: string;
  isLoading: boolean;
  isInitialized: boolean;

  // actions
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;

  // members
  addMember: (data: Partial<Member>) => Promise<Member>;
  updateMember: (id: string, data: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  getMemberById: (id: string) => Member | undefined;

  // front tracking
  setCurrentFronters: (entries: { memberId: string; frontType: FrontType; customStatus?: string }[], notes?: string) => Promise<void>;
  endCurrentFront: () => Promise<void>;
  quickSwitchFront: (entries: { memberId: string; frontType: FrontType; customStatus?: string }[], notes?: string) => Promise<void>;
  updateFrontSession: (id: string, data: Partial<FrontSession>) => Promise<void>;
  deleteFrontSession: (id: string) => Promise<void>;

  // groups
  addGroup: (data: Partial<Group>) => Promise<Group>;
  updateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;

  // journal
  addJournalEntry: (data: Partial<JournalEntry>) => Promise<JournalEntry>;
  updateJournalEntry: (id: string, data: Partial<JournalEntry>) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;

  // chat
  addChatMessage: (data: Partial<ChatMessage>) => Promise<ChatMessage>;
  deleteChatMessage: (id: string) => Promise<void>;

  // notes
  addMemberNote: (memberId: string, content: string) => Promise<MemberNote>;
  deleteMemberNote: (id: string) => Promise<void>;
  loadMemberNotes: (memberId: string) => Promise<void>;

  // custom fields
  addCustomFieldDefinition: (data: Partial<CustomFieldDefinition>) => Promise<CustomFieldDefinition>;
  updateCustomFieldDefinition: (id: string, data: Partial<CustomFieldDefinition>) => Promise<void>;
  deleteCustomFieldDefinition: (id: string) => Promise<void>;

  // system settings
  updateSystemSettings: (data: Partial<SystemSettings>) => Promise<void>;

  // filter / search
  setFilter: (filter: Partial<FilterState>) => void;
  setSearchQuery: (q: string) => void;
  getFilteredMembers: () => Member[];

  // import / export / reset
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
  resetAllData: () => Promise<void>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultSystemSettings: SystemSettings = {
  id: 'default',
  name: 'our system',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  defaultPrivacyLevel: 'private',
  theme: 'dark',
  dyslexiaFont: false,
  highContrast: false,
  fontScale: 1,
  autoBackup: false,
  backupIntervalMinutes: 60,
};

const defaultFilter: FilterState = {
  search: '',
  status: 'all',
  groupId: 'all',
  tag: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
};

export const usePluralSystem = create<PluralSystemState>()(
  persist(
    (set, get) => ({
      members: [],
      frontSessions: [],
      groups: [],
      journalEntries: [],
      chatMessages: [],
      memberNotes: {},
      systemSettings: defaultSystemSettings,
      customFieldDefinitions: [],
      currentFronters: [],
      activeSessionId: null,
      filter: defaultFilter,
      searchQuery: '',
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        if (get().isInitialized) return;
        set({ isLoading: true });
        try {
          await get().refresh();
          set({ isInitialized: true });
        } catch (e) {
          secureLogger.error('[plural-system] init failed:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      refresh: async () => {
        const [
          members,
          frontSessions,
          groups,
          journalEntries,
          chatMessages,
          settings,
          customFieldDefinitions,
        ] = await Promise.all([
          db.getAllMembers(),
          db.getAllFrontSessions(),
          db.getAllGroups(),
          db.getAllJournalEntries(),
          db.getAllChatMessages(),
          db.getSystemSettings(),
          db.getAllCustomFieldDefinitions(),
        ]);

        const activeSession = frontSessions.find(s => !s.endedAt);
        const currentFronters = activeSession?.entries || [];

        set({
          members,
          frontSessions,
          groups,
          journalEntries,
          chatMessages,
          systemSettings: settings || defaultSystemSettings,
          customFieldDefinitions,
          currentFronters,
          activeSessionId: activeSession?.id || null,
        });
      },

      addMember: async (data) => {
        const now = new Date().toISOString();
        const member: Member = {
          id: generateId(),
          name: data.name || 'unnamed',
          displayName: data.displayName,
          pronouns: data.pronouns,
          color: data.color || '#888888',
          description: data.description,
          birthdate: data.birthdate,
          role: data.role,
          source: data.source,
          species: data.species,
          age: data.age,
          likes: data.likes,
          dislikes: data.dislikes,
          customFields: data.customFields || [],
          status: data.status || 'active',
          tags: data.tags || [],
          privacyLevel: data.privacyLevel || get().systemSettings.defaultPrivacyLevel,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        await db.saveMember(member);
        set(state => ({ members: [...state.members, member] }));
        return member;
      },

      updateMember: async (id, data) => {
        const existing = get().members.find(m => m.id === id);
        if (!existing) return;
        const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
        await db.saveMember(updated);
        set(state => ({
          members: state.members.map(m => (m.id === id ? updated : m)),
        }));
      },

      deleteMember: async (id) => {
        await db.deleteMember(id);
        set(state => ({
          members: state.members.filter(m => m.id !== id),
          currentFronters: state.currentFronters.filter(f => f.memberId !== id),
        }));
      },

      getMemberById: (id) => get().members.find(m => m.id === id),

      setCurrentFronters: async (entries, notes) => {
        const now = new Date().toISOString();
        const state = get();

        // end any active session
        if (state.activeSessionId) {
          const active = state.frontSessions.find(s => s.id === state.activeSessionId);
          if (active) {
            const ended = { ...active, endedAt: now };
            await db.saveFrontSession(ended);
          }
        }

        // create new session if there are fronters
        if (entries.length > 0) {
          const session: FrontSession = {
            id: generateId(),
            startedAt: now,
            endedAt: undefined,
            entries,
            notes,
            createdAt: now,
            updatedAt: now,
          };
          await db.saveFrontSession(session);
          set(state => ({
            frontSessions: [session, ...state.frontSessions],
            currentFronters: entries,
            activeSessionId: session.id,
          }));
        } else {
          set({ currentFronters: [], activeSessionId: null });
        }
      },

      endCurrentFront: async () => {
        const state = get();
        if (!state.activeSessionId) return;
        const now = new Date().toISOString();
        const active = state.frontSessions.find(s => s.id === state.activeSessionId);
        if (active) {
          const ended = { ...active, endedAt: now };
          await db.saveFrontSession(ended);
          set(state => ({
            frontSessions: state.frontSessions.map(s => (s.id === active.id ? ended : s)),
            currentFronters: [],
            activeSessionId: null,
          }));
        }
      },

      quickSwitchFront: async (entries, notes) => {
        await get().setCurrentFronters(entries, notes);
      },

      updateFrontSession: async (id, data) => {
        const existing = get().frontSessions.find(s => s.id === id);
        if (!existing) return;
        const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
        await db.saveFrontSession(updated);
        set(state => ({
          frontSessions: state.frontSessions.map(s => (s.id === id ? updated : s)),
        }));
      },

      deleteFrontSession: async (id) => {
        await db.deleteFrontSession(id);
        set(state => ({
          frontSessions: state.frontSessions.filter(s => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
          currentFronters: state.activeSessionId === id ? [] : state.currentFronters,
        }));
      },

      addGroup: async (data) => {
        const now = new Date().toISOString();
        const group: Group = {
          id: generateId(),
          name: data.name || 'new group',
          color: data.color || '#888888',
          description: data.description,
          memberIds: data.memberIds || [],
          privacyLevel: data.privacyLevel || get().systemSettings.defaultPrivacyLevel,
          createdAt: now,
          updatedAt: now,
        };
        await db.saveGroup(group);
        set(state => ({ groups: [...state.groups, group] }));
        return group;
      },

      updateGroup: async (id, data) => {
        const existing = get().groups.find(g => g.id === id);
        if (!existing) return;
        const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
        await db.saveGroup(updated);
        set(state => ({
          groups: state.groups.map(g => (g.id === id ? updated : g)),
        }));
      },

      deleteGroup: async (id) => {
        await db.deleteGroup(id);
        set(state => ({ groups: state.groups.filter(g => g.id !== id) }));
      },

      addJournalEntry: async (data) => {
        const now = new Date().toISOString();
        const entry: JournalEntry = {
          id: generateId(),
          memberId: data.memberId,
          content: data.content || '',
          frontSessionId: data.frontSessionId,
          tags: data.tags || [],
          createdAt: now,
          updatedAt: now,
        };
        await db.saveJournalEntry(entry);
        set(state => ({ journalEntries: [entry, ...state.journalEntries] }));
        return entry;
      },

      updateJournalEntry: async (id, data) => {
        const existing = get().journalEntries.find(e => e.id === id);
        if (!existing) return;
        const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
        await db.saveJournalEntry(updated);
        set(state => ({
          journalEntries: state.journalEntries.map(e => (e.id === id ? updated : e)),
        }));
      },

      deleteJournalEntry: async (id) => {
        await db.deleteJournalEntry(id);
        set(state => ({ journalEntries: state.journalEntries.filter(e => e.id !== id) }));
      },

      addChatMessage: async (data) => {
        const now = new Date().toISOString();
        const msg: ChatMessage = {
          id: generateId(),
          memberId: data.memberId || '',
          content: data.content || '',
          threadId: data.threadId,
          createdAt: now,
        };
        await db.saveChatMessage(msg);
        set(state => ({ chatMessages: [...state.chatMessages, msg] }));
        return msg;
      },

      deleteChatMessage: async (id) => {
        await db.deleteChatMessage(id);
        set(state => ({ chatMessages: state.chatMessages.filter(m => m.id !== id) }));
      },

      addMemberNote: async (memberId, content) => {
        const now = new Date().toISOString();
        const note: MemberNote = {
          id: generateId(),
          memberId,
          content,
          createdAt: now,
        };
        await db.saveMemberNote(note);
        set(state => ({
          memberNotes: {
            ...state.memberNotes,
            [memberId]: [...(state.memberNotes[memberId] || []), note],
          },
        }));
        return note;
      },

      deleteMemberNote: async (id) => {
        await db.deleteMemberNote(id);
        set(state => {
          const next: Record<string, MemberNote[]> = {};
          for (const [mid, notes] of Object.entries(state.memberNotes)) {
            next[mid] = notes.filter(n => n.id !== id);
          }
          return { memberNotes: next };
        });
      },

      loadMemberNotes: async (memberId) => {
        const notes = await db.getMemberNotes(memberId);
        set(state => ({
          memberNotes: { ...state.memberNotes, [memberId]: notes },
        }));
      },

      addCustomFieldDefinition: async (data) => {
        const def: CustomFieldDefinition = {
          id: generateId(),
          name: data.name || 'new field',
          type: data.type || 'text',
          required: data.required || false,
          sortOrder: data.sortOrder ?? get().customFieldDefinitions.length,
        };
        await db.saveCustomFieldDefinition(def);
        set(state => ({
          customFieldDefinitions: [...state.customFieldDefinitions, def],
        }));
        return def;
      },

      updateCustomFieldDefinition: async (id, data) => {
        const existing = get().customFieldDefinitions.find(d => d.id === id);
        if (!existing) return;
        const updated = { ...existing, ...data, id };
        await db.saveCustomFieldDefinition(updated);
        set(state => ({
          customFieldDefinitions: state.customFieldDefinitions.map(d => (d.id === id ? updated : d)),
        }));
      },

      deleteCustomFieldDefinition: async (id) => {
        await db.deleteCustomFieldDefinition(id);
        set(state => ({
          customFieldDefinitions: state.customFieldDefinitions.filter(d => d.id !== id),
        }));
      },

      updateSystemSettings: async (data) => {
        const updated = { ...get().systemSettings, ...data, id: 'default' };
        await db.saveSystemSettings(updated);
        set({ systemSettings: updated });
      },

      setFilter: (filter) => set(state => ({ filter: { ...state.filter, ...filter } })),
      setSearchQuery: (q) => set({ searchQuery: q }),

      getFilteredMembers: () => {
        const state = get();
        let result = [...state.members];
        const f = state.filter;

        if (f.status !== 'all') {
          result = result.filter(m => m.status === f.status);
        }
        if (f.groupId !== 'all') {
          const group = state.groups.find(g => g.id === f.groupId);
          if (group) {
            result = result.filter(m => group.memberIds.includes(m.id));
          }
        }
        if (f.tag !== 'all') {
          result = result.filter(m => m.tags.includes(f.tag));
        }
        if (f.search || state.searchQuery) {
          const q = (f.search || state.searchQuery).toLowerCase();
          result = result.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.displayName?.toLowerCase().includes(q)) ||
            (m.pronouns?.toLowerCase().includes(q)) ||
            (m.description?.toLowerCase().includes(q)) ||
            (m.role?.toLowerCase().includes(q)) ||
            m.tags.some(t => t.toLowerCase().includes(q))
          );
        }

        result.sort((a, b) => {
          const dir = f.sortOrder === 'asc' ? 1 : -1;
          switch (f.sortBy) {
            case 'name':
              return dir * a.name.localeCompare(b.name);
            case 'createdAt':
              return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            case 'lastFronted': {
              const aLast = state.frontSessions
                .filter(s => s.entries.some(e => e.memberId === a.id))
                .sort((x, y) => new Date(y.startedAt).getTime() - new Date(x.startedAt).getTime())[0];
              const bLast = state.frontSessions
                .filter(s => s.entries.some(e => e.memberId === b.id))
                .sort((x, y) => new Date(y.startedAt).getTime() - new Date(x.startedAt).getTime())[0];
              const aTime = aLast ? new Date(aLast.startedAt).getTime() : 0;
              const bTime = bLast ? new Date(bLast.startedAt).getTime() : 0;
              return dir * (bTime - aTime); // default desc for last fronted
            }
            case 'frontFrequency': {
              const aCount = state.frontSessions.filter(s => s.entries.some(e => e.memberId === a.id)).length;
              const bCount = state.frontSessions.filter(s => s.entries.some(e => e.memberId === b.id)).length;
              return dir * (aCount - bCount);
            }
            default:
              return 0;
          }
        });

        return result;
      },

      exportData: async () => {
        return db.exportAllData();
      },

      importData: async (data) => {
        await db.importAllData(data);
        await get().refresh();
      },

      resetAllData: async () => {
        await db.resetAllData();
        set({
          members: [],
          frontSessions: [],
          groups: [],
          journalEntries: [],
          chatMessages: [],
          memberNotes: {},
          systemSettings: defaultSystemSettings,
          customFieldDefinitions: [],
          currentFronters: [],
          activeSessionId: null,
        });
      },
    }),
    {
      name: 'pkm-plural-system-ui',
      partialize: (state) => ({
        filter: state.filter,
        searchQuery: state.searchQuery,
        systemSettings: state.systemSettings,
      }),
    }
  )
);
