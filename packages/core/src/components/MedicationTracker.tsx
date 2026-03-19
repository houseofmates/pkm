import React from 'react';
import { toast } from 'sonner';
import { useMedicationLog } from '@/hooks/use-medication-log';

export function MedicationTracker() {
  const {
    groups,
    markGroupDone,
    isDoneToday,
    remindersEnabled,
    reminderSchedule,
    toggleRemindersEnabled,
  } = useMedicationLog();

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

      {remindersEnabled && (
        <div className="mb-3 rounded-lg border border-blue-400/30 bg-blue-500/10 p-2 text-xs lowercase">
          {reminderSchedule.map((reminder) => (
            <div key={reminder.id} className="flex justify-between items-center gap-2">
              <span>{reminder.label} @ {String(reminder.hour).padStart(2, '0')}:{String(reminder.minute).padStart(2, '0')}</span>
              <span className="text-white/70">{reminder.body}</span>
            </div>
          ))}
          <p className="mt-1 text-2xs text-white/40 lowercase">notifications are scheduled at these times and will persist until dismissed.</p>
        </div>
      )}

      <div className="space-y-2">
        {groups.map(group => {
          const done = isDoneToday(group.id);
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
              <span className="text-xs font-bold">{done ? 'done' : 'log'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
