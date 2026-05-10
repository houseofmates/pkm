/* eslint-disable */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { FrontSession, FrontType, FrontAnalytics } from '../types/schema';

interface FrontState {
  currentSession: FrontSession | null;
  history: FrontSession[];
  loading: boolean;
  error: string | null;
  activeFronters: string[];
}

interface FrontActions {
  loadHistory: () => Promise<void>;
  loadCurrentSession: () => Promise<void>;
  startFrontSession: (entries: Array<{memberId: string; frontType: FrontType; customStatus?: string}>, comment?: string) => Promise<string>;
  endCurrentSession: () => Promise<void>;
  updateSession: (id: string, updates: Partial<FrontSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveFronters: (memberIds: string[]) => void;
  getAnalytics: (memberId?: string, startDate?: string, endDate?: string) => Promise<FrontAnalytics[]>;
  reset: () => void;
}

export const useFrontStore = create<FrontState & FrontActions>()(
  subscribeWithSelector((set, get) => ({
    currentSession: null,
    history: [],
    loading: false,
    error: null,
    activeFronters: [],

    loadHistory: async () => {
      set({ loading: true, error: null });
      try {
        const history = await db.getFrontSessions(100); // Load last 100 sessions
        set({ history, loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to load front history', 
          loading: false 
        });
      }
    },

    loadCurrentSession: async () => {
      set({ loading: true, error: null });
      try {
        const currentSession = await db.getCurrentFrontSession();
        const activeFronters = currentSession 
          ? currentSession.entries.map(entry => entry.memberId)
          : [];
        set({ currentSession, activeFronters, loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to load current session', 
          loading: false 
        });
      }
    },

    startFrontSession: async (entries, comment) => {
      set({ loading: true, error: null });
      try {
        const sessionId = await db.startFrontSession(entries, comment);
        await get().loadCurrentSession();
        await get().loadHistory();
        set({ loading: false });
        return sessionId;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to start front session', 
          loading: false 
        });
        throw error;
      }
    },

    endCurrentSession: async () => {
      const { currentSession } = get();
      if (!currentSession) return;

      set({ loading: true, error: null });
      try {
        await db.endFrontSession(currentSession.id);
        await get().loadCurrentSession();
        await get().loadHistory();
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to end front session', 
          loading: false 
        });
      }
    },

    updateSession: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        await db.updateFrontSession(id, updates);
        await get().loadCurrentSession();
        await get().loadHistory();
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to update front session', 
          loading: false 
        });
      }
    },

    deleteSession: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.deleteFrontSession(id);
        await get().loadCurrentSession();
        await get().loadHistory();
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to delete front session', 
          loading: false 
        });
      }
    },

    setActiveFronters: (memberIds) => {
      set({ activeFronters: memberIds });
    },

    getAnalytics: async (memberId, startDate, endDate) => {
      try {
        return await db.getFrontAnalytics(memberId, startDate, endDate);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to get front analytics'
        });
        return [];
      }
    },

    reset: () => {
      set({ 
        currentSession: null, 
        history: [], 
        loading: false, 
        error: null, 
        activeFronters: [] 
      });
    }
  }))
);