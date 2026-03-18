import React from 'react';
import { toast } from 'sonner';
import { useMedicationLog } from '@/hooks/use-medication-log';

export function MedicationTracker() {
  const { groups, markGroupDone, isDoneToday } = useMedicationLog();

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.04]">
      <h2 className="text-sm font-semibold lowercase mb-2">med tracker</h2>
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
