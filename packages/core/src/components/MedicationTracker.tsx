import React from 'react';
import { toast } from 'sonner';
import { useMedicationLog, type MedicationLogEntry } from '@/hooks/use-medication-log';

function formatTimeAmPmFromIso(isoString: string): string {
  const date = new Date(isoString);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m}${ampm}`;
}

export function MedicationTracker() {
  const {
    groups,
    markGroupDone,
    isDoneToday,
    remindersEnabled,
    toggleRemindersEnabled,
    log,
  } = useMedicationLog();

  const getLastLoggedTime = (groupId: string): string | null => {
    const groupEntries = log.filter((entry: MedicationLogEntry) => entry.group === groupId);
    if (groupEntries.length === 0) return null;
    const mostRecent = groupEntries.sort((a: MedicationLogEntry, b: MedicationLogEntry) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    return formatTimeAmPmFromIso(mostRecent.timestamp);
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.04]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold lowercase">med tracker</h2>
        <button
          onClick={() => toggleRemindersEnabled(!remindersEnabled)}
          className="text-xs uppercase tracking-wider text-white/70 bg-white/5 px-2 py-1 rounded"
        >
          reminders: {remindersEnabled ? 'on' : 'off'}
        </button>
      </div>

      <div className="space-y-2">
        {groups.map(group => {
          const done = isDoneToday(group.id);
          const lastTime = getLastLoggedTime(group.id);
          return (
            <button
              key={group.id}
              onClick={() => {
                markGroupDone(group.id);
                toast.success(`${group.label} logged`);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm lowercase transition ${
                done ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="font-medium">{group.label}</div>
                <div className="text-xs text-white/40">
                  {group.items.map(i => `${i.name} (${i.dose}${i.count > 1 ? ` x${i.count}` : ''})`).join(', ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lastTime && (
                  <span className="text-sm font-medium text-white">{lastTime}</span>
                )}
                <span className="text-xs font-bold">{done ? 'done' : 'log'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
