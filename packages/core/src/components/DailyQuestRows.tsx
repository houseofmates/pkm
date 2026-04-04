import React, { useEffect } from 'react'
import { secureLogger } from '@/lib/secure-logger'

export interface DailyQuestRowsProps {
  onRowComplete?: (rowId: string) => void;
}

export const DailyQuestRows: React.FC<DailyQuestRowsProps> = () => {
  useEffect(() => {
    const draft = localStorage.getItem('pkm:journal:draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.body) {
          // logic
        }
      } catch (e) {
        secureLogger.debug("failed to parse journal draft:", e);
      }
    }
  }, []);

  return null;
}
