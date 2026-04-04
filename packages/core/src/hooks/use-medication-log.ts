import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isCapacitorNative } from '@/lib/platform';
import { secureLogger } from '@/lib/secure-logger';

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
const STORAGE_KEY_REMINDERS_ENABLED = 'pkm:medication_reminders_enabled';
const STORAGE_KEY_REMINDERS_SCHEDULE = 'pkm:medication_reminders_schedule';

export type MedicationReminderSchedule = {
  id: number;
  groupId: 'morning' | 'afternoon' | 'night';
  label: string;
  hour: number;
  minute: number;
  body: string;
};

const DEFAULT_REMINDER_SCHEDULE: MedicationReminderSchedule[] = [
  { id: 1001, groupId: 'morning', label: 'morning pills', hour: 10, minute: 0, body: 'time to take your morning meds' },
  { id: 1002, groupId: 'afternoon', label: 'afternoon pills', hour: 13, minute: 0, body: 'time to take your afternoon meds' },
  { id: 1003, groupId: 'night', label: 'night pills', hour: 23, minute: 0, body: 'time to take your nighttime meds' },
];

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

function nextTriggerTime(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

async function showNotification(title: string, body: string): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const hasPermission = await LocalNotifications.checkPermissions();
      if (hasPermission.display === 'denied') {
        await LocalNotifications.requestPermissions();
      }

      // capacitor typings omit platform keys; runtime plugin accepts this shape
      const notifications = [
        {
          id: Math.floor(Math.random() * 100000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: '',
          extra: { medicationReminder: true },
          android: { channelId: 'medication-reminders', sound: '', smallIcon: 'ic_stat_icon', sticky: true, priority: 'high' },
        },
      ] as never;
      await LocalNotifications.schedule({ notifications });
      return;
    } catch (e) {
      // fallback to web notification when plugin is unavailable
      secureLogger.warn('local notification fallback:', e);
    }
  }

  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, silent: true, requireInteraction: true });
    } else {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body, silent: true, requireInteraction: true });
        }
      });
    }
  }
}

export function useMedicationLog() {
  const [log, setLog] = useState<MedicationLogEntry[]>(() =>
    parseJson(localStorage.getItem(STORAGE_KEY_LOG), [])
  );
  const [lastDone, setLastDone] = useState<Record<string, string>>(() =>
    parseJson(localStorage.getItem(STORAGE_KEY_LAST_DONE), {})
  );
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() =>
    parseJson(localStorage.getItem(STORAGE_KEY_REMINDERS_ENABLED), true)
  );
  const [reminderSchedule, setReminderSchedule] = useState<MedicationReminderSchedule[]>(() =>
    parseJson(localStorage.getItem(STORAGE_KEY_REMINDERS_SCHEDULE), DEFAULT_REMINDER_SCHEDULE)
  );

  const reminderTimeoutRefs = useRef<Record<number, number | null>>({});

  const groups = useMemo(() => DEFAULT_GROUPS, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REMINDERS_ENABLED, JSON.stringify(remindersEnabled));
  }, [remindersEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REMINDERS_SCHEDULE, JSON.stringify(reminderSchedule));
  }, [reminderSchedule]);

  useEffect(() => {
    const clearTimers = () => {
      Object.values(reminderTimeoutRefs.current).forEach((timerId) => {
        if (timerId != null) {
          clearTimeout(timerId);
        }
      });
      reminderTimeoutRefs.current = {};
    };

    if (!remindersEnabled) {
      clearTimers();
      return;
    }

    const scheduleOne = (reminder: MedicationReminderSchedule) => {
      const next = nextTriggerTime(reminder.hour, reminder.minute);
      const timeout = next.getTime() - Date.now();

      if (reminderTimeoutRefs.current[reminder.id] != null) {
        clearTimeout(reminderTimeoutRefs.current[reminder.id]!);
      }

      reminderTimeoutRefs.current[reminder.id] = window.setTimeout(async () => {
        await showNotification(`med reminder: ${reminder.label}`, reminder.body);
        scheduleOne(reminder);
      }, timeout);
    };

    const scheduleAll = async () => {
      for (const reminder of reminderSchedule) {
        if (isCapacitorNative()) {
          try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            await LocalNotifications.requestPermissions();
            await LocalNotifications.schedule({
              notifications: reminderSchedule.map((item) => ({
                id: item.id,
                title: `med reminder: ${item.label}`,
                body: item.body,
                schedule: {
                  hour: item.hour,
                  minute: item.minute,
                  repeats: true,
                },
                sound: '',
                extra: { medicationReminder: true },
                android: {
                  channelId: 'medication-reminders',
                  smallIcon: 'ic_stat_icon',
                  priority: 'high',
                  sticky: true,
                  sound: '',
                },
                ios: {
                  sound: '',
                },
              })),
            });
            // allow plugin to handle notifications and avoid duplicate local timers
            return;
          } catch (err) {
            console.warn('failed to schedule capacitor local reminder', err);
          }
        }

        // web path: schedule in runtime
        scheduleOne(reminder);
      }
    };

    scheduleAll();

    return () => clearTimers();
  }, [remindersEnabled, reminderSchedule]);

  const toggleRemindersEnabled = useCallback((enabled: boolean) => {
    setRemindersEnabled(enabled);
  }, []);

  const setReminderScheduleState = useCallback((schedule: MedicationReminderSchedule[]) => {
    setReminderSchedule(schedule);
  }, []);

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
    remindersEnabled,
    reminderSchedule,
    toggleRemindersEnabled,
    setReminderSchedule: setReminderScheduleState,
  };
}
