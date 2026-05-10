/* eslint-disable */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { JournalEntry } from '../types/schema';

interface JournalState {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  selectedEntryId: string | null;
  filterMemberId: string | null;
}

interface JournalActions {
  loadEntries: (memberId?: string) => Promise<void>;
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setSelectedEntry: (id: string | null) => void;
  setFilterMember: (memberId: string | null) => void;
  getEntriesForMember: (memberId: string) => JournalEntry[];
  getSystemEntries: () => JournalEntry[];
  searchEntries: (query: string) => Promise<JournalEntry[]>;
  reset: () => void;
}

export const useJournalStore = create<JournalState & JournalActions>()(
  subscribeWithSelector((set, get) => ({
    entries: [],
    loading: false,
    error: null,
    selectedEntryId: null,
    filterMemberId: null,

    loadEntries: async (memberId) => {
      set({ loading: true, error: null });
      try {
        const entries = await db.getJournalEntries(memberId);
        set({ entries, loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to load journal entries', 
          loading: false 
        });
      }
    },

    addEntry: async (entryData) => {
      set({ loading: true, error: null });
      try {
        const id = await db.addJournalEntry(entryData);
        await get().loadEntries(get().filterMemberId); // Refresh entries
        set({ loading: false });
        return id;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to add journal entry', 
          loading: false 
        });
        throw error;
      }
    },

    updateEntry: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        await db.updateJournalEntry(id, updates);
        await get().loadEntries(get().filterMemberId); // Refresh entries
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to update journal entry', 
          loading: false 
        });
      }
    },

    deleteEntry: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.deleteJournalEntry(id);
        await get().loadEntries(get().filterMemberId); // Refresh entries
        if (get().selectedEntryId === id) {
          set({ selectedEntryId: null });
        }
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to delete journal entry', 
          loading: false 
        });
      }
    },

    setSelectedEntry: (id) => {
      set({ selectedEntryId: id });
    },

    setFilterMember: (memberId) => {
      set({ filterMemberId: memberId });
      get().loadEntries(memberId);
    },

    getEntriesForMember: (memberId) => {
      const { entries } = get();
      return entries.filter(entry => entry.memberId === memberId);
    },

    getSystemEntries: () => {
      const { entries } = get();
      return entries.filter(entry => !entry.memberId);
    },

    searchEntries: async (query) => {
      try {
        return await db.searchJournal(query, get().filterMemberId);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to search journal entries'
        });
        return [];
      }
    },

    reset: () => {
      set({ 
        entries: [], 
        loading: false, 
        error: null, 
        selectedEntryId: null,
        filterMemberId: null
      });
    }
  }))
);