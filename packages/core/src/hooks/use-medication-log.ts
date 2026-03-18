import { useCallback, useMemo, useState } from 'react';

export type MedicationLogEntry = {
  id: string;
  group: string;
  medId: string;
  name: string;
  dose: string;
  count: number;
  notes?: string;
  timestamp: string;
};

export type MedicationItem = {
  id: string;
  name: string;
  dose: string;
  count: number;
  notes?: string;
};

export type MedicationGroup = {
  id: string;
  label: string;
  items: MedicationItem[];
};

const STORAGE_KEY_LOG = 'pkm:medication_log';
const STORAGE_KEY_LAST_DONE = 'pkm:medication_last_done';

const DEFAULT_GROUPS: MedicationGroup[] = [
  {
    id: 'morning',
    label: 'morning meds',
    items: [
      { id: 'paxil', name: 'paxil', dose: '60mg', count: 2, notes: '30mg each' },
      { id: 'wellbutrin', name: 'wellbutrin', dose: '300mg', count: 1 },
      { id: 'adderall', name: 'adderall', dose: '20mg', count: 2, notes: '10mg each' },
      { id: 'vit_d', name: 'vitamin d', dose: '250mcg', count: 1 },
      { id: 'vit_k', name: 'vitamin k', dose: '100mcg', count: 1 },
      { id: 'iron', name: 'iron bisglycinate', dose: '50mg', count: 2, notes: '25mg each' },
    ],
  },
  {
    id: 'afternoon',
    label: 'afternoon meds',
    items: [
      { id: 'adderall_pm', name: 'adderall', dose: '10mg', count: 1 },
      { id: 'aripiprazole', name: 'aripiprazole', dose: '5mg', count: 1 },
    ],
  },
  {
    id: 'night',
    label: 'night meds',
    items: [
      { id: 'iron_night', name: 'iron bisglycinate', dose: '50mg', count: 2, notes: '25mg each - take with lithium' },
      { id: 'lithium', name: 'lithium', dose: '300mg', count: 1 },
    ],
  },
];

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useMedicationLog() {
  const [log, setLog] = useState<MedicationLogEntry[]>(() =>
    parseJson(localStorage.getItem(STORAGE_KEY_LOG), [])
  );
  const [lastDone, setLastDone] = useState<Record<string, string>>(() =>
    parseJson(localStorage.getItem(STORAGE_KEY_LAST_DONE), {})
  );

  const groups = useMemo(() => DEFAULT_GROUPS, []);

  const markGroupDone = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const timestamp = new Date().toISOString();
    const entries: MedicationLogEntry[] = group.items.map(item => ({
      id: `${groupId}-${item.id}-${timestamp}`,
      group: groupId,
      medId: item.id,
      name: item.name,
      dose: item.dose,
      count: item.count,
      notes: item.notes,
      timestamp,
    }));

    const updatedLog = [...entries, ...log];
    const updatedLastDone = { ...lastDone, [groupId]: todayIso() };

    localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(updatedLog));
    localStorage.setItem(STORAGE_KEY_LAST_DONE, JSON.stringify(updatedLastDone));

    setLog(updatedLog);
    setLastDone(updatedLastDone);
  }, [groups, log, lastDone]);

  const clearLog = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_LOG);
    setLog([]);
  }, []);

  const clearLastDone = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_LAST_DONE);
    setLastDone({});
  }, []);

  const isDoneToday = useCallback((groupId: string) => {
    return lastDone[groupId] === todayIso();
  }, [lastDone]);

  return {
    groups,
    log,
    lastDone,
    markGroupDone,
    clearLog,
    clearLastDone,
    isDoneToday,
  };
}
