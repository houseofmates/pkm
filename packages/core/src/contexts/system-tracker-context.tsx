/* eslint-disable */
import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { db } from '@/features/system-tracker/db/database';
import { useSystemStore } from '@/features/system-tracker/stores/system-store';
import { useMembersStore } from '@/features/system-tracker/stores/members-store';
import { useFrontStore } from '@/features/system-tracker/stores/front-store';

interface SystemTrackerContextType {
  initialized: boolean;
  error: string | null;
}

const SystemTrackerContext = createContext<SystemTrackerContextType | undefined>(undefined);

export function SystemTrackerProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { loadSystem } = useSystemStore();
  const { loadMembers, loadCustomFields } = useMembersStore();
  const { loadCurrentSession, loadHistory } = useFrontStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize database
        await db.initialize();

        // Load all data
        await Promise.all([
          loadSystem(),
          loadMembers(),
          loadCustomFields(),
          loadCurrentSession(),
          loadHistory()
        ]);

        setInitialized(true);
      } catch (err) {
        console.error('Failed to initialize system tracker:', err);
        setError(err instanceof Error ? err.message : 'failed to initialize');
      }
    };

    initialize();
  }, [loadSystem, loadMembers, loadCustomFields, loadCurrentSession, loadHistory]);

  const value: SystemTrackerContextType = {
    initialized,
    error
  };

  return (
    <SystemTrackerContext.Provider value={value}>
      {children}
    </SystemTrackerContext.Provider>
  );
}

export function useSystemTracker() {
  const context = useContext(SystemTrackerContext);
  if (context === undefined) {
    throw new Error('useSystemTracker must be used within a SystemTrackerProvider');
  }
  return context;
}