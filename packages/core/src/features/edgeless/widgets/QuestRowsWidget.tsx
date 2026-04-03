import React from 'react';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';

interface QuestRowsWidgetProps {
  className?: string;
}

export function QuestRowsWidget({ className }: QuestRowsWidgetProps) {
  const { questRows, updateQuestCell } = useGamificationStore();

  const toggleCell = (rowId: string, cellId: string) => {
    updateQuestCell(rowId, cellId, true);
  };

  return (
    <div className={cn("p-4 rounded-xl bg-black/80 border border-blue-500/30", className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <Target className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80 lowercase">daily quests</p>
          <p className="text-xs text-white/40 lowercase">
            {questRows.filter(r => r.cells.every(c => c.completed)).length}/{questRows.length} complete
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-48 overflow-y-auto">
        {questRows.slice(0, 4).map((row) => {
          const completedCount = row.cells.filter(c => c.completed).length;
          const isComplete = completedCount === row.cells.length;
          
          return (
            <div 
              key={row.id} 
              className={cn(
                "p-2 rounded-lg border transition-all",
                isComplete 
                  ? "bg-blue-500/10 border-blue-400/30" 
                  : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/80 lowercase">{row.label}</span>
                <span className={cn(
                  "text-[10px] lowercase",
                  isComplete ? "text-blue-400" : "text-white/40"
                )}>
                  {completedCount}/{row.cells.length}
                </span>
              </div>
              
              <div className="flex gap-1 flex-wrap">
                {row.cells.slice(0, 5).map((cell) => (
                  <button
                    key={cell.id}
                    onClick={() => toggleCell(row.id, cell.id)}
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-xs transition-all",
                      cell.completed
                        ? "bg-blue-500/30 text-blue-400 border border-blue-400/50"
                        : "bg-white/5 text-white/30 border border-white/10 hover:bg-white/10"
                    )}
                    title={cell.label}
                  >
                    {cell.completed ? <CheckCircle2 className="w-3 h-3" /> : cell.icon}
                  </button>
                ))}
              </div>
              
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    isComplete ? "bg-blue-400" : "bg-white/30"
                  )}
                  style={{ width: `${(completedCount / row.cells.length) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
