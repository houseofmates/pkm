/* eslint-disable */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../db/database';
import type { SystemInfo, SystemSettings } from '../types/schema';

interface SystemState {
  system: SystemInfo | null;
  loading: boolean;
  error: string | null;
}

interface SystemActions {
  loadSystem: () => Promise<void>;
  updateSystem: (updates: Partial<SystemInfo>) => Promise<void>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  reset: () => void;
}

export const useSystemStore = create<SystemState & SystemActions>()(
  persist(
    (set, get) => ({
      system: null,
      loading: false,
      error: null,

      loadSystem: async () => {
        set({ loading: true, error: null });
        try {
          const system = await db.getSystem();
          set({ system: system || null, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'failed to load system', 
            loading: false 
          });
        }
      },

      updateSystem: async (updates) => {
        set({ loading: true, error: null });
        try {
          await db.updateSystem(updates);
          const system = await db.getSystem();
          set({ system: system || null, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'failed to update system', 
            loading: false 
          });
        }
      },

      updateSettings: async (settings) => {
        const { system } = get();
        if (!system) return;

        set({ loading: true, error: null });
        try {
          const updatedSettings = { ...system.settings, ...settings };
          await db.updateSystem({ settings: updatedSettings });
          const updatedSystem = await db.getSystem();
          set({ system: updatedSystem || null, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'failed to update settings', 
            loading: false 
          });
        }
      },

      reset: () => {
        set({ system: null, loading: false, error: null });
      }
    }),
    {
      name: 'system-tracker-system',
      partialize: (state) => ({ system: state.system })
    }
  )
);