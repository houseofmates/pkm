import { useEffect, useState } from 'react';
import { TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secure-logger';

interface StreakCounterProps {
  activityId?: number;
  activityName?: string;
  compact?: boolean;
}

export function StreakCounter({ activityId, activityName, compact = false }: StreakCounterProps) {
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, [activityId]);

  const loadStreak = async () => {
    if (!activityId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('nocobase_token');
      const res = await fetch('/api/activities/streaks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const found = data.find((s: any) => s.activity_id === activityId);
      setStreak(found ? { current: found.current_streak, longest: found.longest_streak } : null);
    } catch (err) {
      secureLogger.error('failed to load streak', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return compact ? (
      <span className="text-xs text-white/30">...</span>
    ) : (
      <div className="p-2 rounded-lg bg-white/5 animate-pulse h-12" />
    );
  }

  if (!streak || streak.current === 0) {
    return compact ? null : (
      <div className="p-3 rounded-lg bg-white/5 text-center">
        <p className="text-xs text-white/40 lowercase">no streak yet</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm">🔥</span>
        <span className="text-xs text-yellow-400">{streak.current}</span>
      </div>
    );
  }

  const isRecord = streak.current === streak.longest && streak.current > 1;

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      isRecord 
        ? "bg-yellow-500/10 border-yellow-500/30" 
        : "bg-white/[0.02] border-white/10"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-xs text-white/40 lowercase">current streak</p>
            <p className="text-2xl font-bold text-yellow-400">{streak.current}</p>
          </div>
        </div>
        {isRecord && (
          <div className="flex items-center gap-1 text-yellow-400">
            <Award size={16} />
            <span className="text-xs lowercase">record!</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-white/40">
        <span className="lowercase">longest: {streak.longest} days</span>
        {activityName && <span className="lowercase">{activityName}</span>}
      </div>

      {streak.current >= 7 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-xs text-green-400 lowercase text-center">
            {streak.current >= 30 ? '🏆 incredible consistency!' : '✨ great momentum!'}
          </p>
        </div>
      )}
    </div>
  );
}
