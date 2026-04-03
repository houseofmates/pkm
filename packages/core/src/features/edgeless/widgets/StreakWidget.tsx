import React from 'react';
import { Flame, Zap, Target, TrendingUp } from 'lucide-react';
import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';

interface StreakWidgetProps {
  className?: string;
}

export function StreakWidget({ className }: StreakWidgetProps) {
  const { pets, streakDays, totalXp, level, questRows } = useGamificationStore();
  
  const wilson = pets[0];
  const completedQuests = questRows.filter(r => 
    r.cells.filter(c => c.completed).length === r.cells.length
  ).length;
  const totalQuests = questRows.length;
  const questPercent = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

  return (
    <div className={cn("p-4 rounded-xl bg-black/80 border border-amber-500/30", className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Flame className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80 lowercase">streak & progress</p>
          <p className="text-xs text-white/40 lowercase">{streakDays} day streak</p>
        </div>
      </div>

      <div className="space-y-2">
        {/* XP Bar */}
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-yellow-400" />
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-blue-400 rounded-full"
              style={{ width: `${(totalXp % 100)}%` }}
            />
          </div>
          <span className="text-xs text-white/60">{totalXp} xp</span>
        </div>

        {/* Quest Progress */}
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3 text-blue-400" />
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-400 rounded-full"
              style={{ width: `${questPercent}%` }}
            />
          </div>
          <span className="text-xs text-white/60">{questPercent}%</span>
        </div>

        {/* Level */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <span className="lowercase">level {level}</span>
          <span className="lowercase">{completedQuests}/{totalQuests} quests</span>
        </div>
      </div>

      {wilson && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
          <span className="text-lg">{wilson.emoji}</span>
          <span className="text-xs text-white/40 lowercase">{wilson.name} is {wilson.visualState}</span>
        </div>
      )}
    </div>
  );
}
