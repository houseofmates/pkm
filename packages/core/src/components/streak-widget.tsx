import { useState, useEffect } from 'react';
import { Heart, Flame, TrendingUp, Crown, Zap } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';

interface StreakData {
  current: number;
  longest: number;
  lastDate: string;
}

export function StreakWidget() {
  const [streak, setStreak] = useState({ current: 0, longest: 0 } as StreakData);
  const haptics = useHaptics();

  useEffect(() => {
    const saved = localStorage.getItem('pkm:journal:streak_data');
    if (saved) {
      const data = JSON.parse(saved);
      setStreak(data);
    }
  }, []);

  const getFlameColor = (streak: number) => {
    if (streak >= 30) return '#ff6b6b';
    if (streak >= 14) return '#f7931e';
    if (streak >= 7) return '#fbbf24';
    return '#facc15';
  };

  const getStreakLabel = (streak: number) => {
    if (streak >= 100) return 'legendary';
    if (streak >= 60) return 'epic';
    if (streak >= 30) return 'fire';
    if (streak >= 14) return 'solid';
    if (streak >= 7) return 'warming up';
    return 'just getting started';
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 shadow-sharp">
      <div className="flex items-center gap-2 mb-2">
        <Flame 
          size={24} 
          className="animate-flicker"
          style={{ color: getFlameColor(streak.current) }}
        />
        <p className="text-xs text-white/40 lowercase">journaling streak</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-1 mb-1">
          <span className="text-3xl font-bold" style={{ color: getFlameColor(streak.current) }}>
            {streak.current}
          </span>
          <span className="text-lg font-medium text-white/60">days</span>
        </div>
        <p className="text-xs text-white/50 lowercase">{getStreakLabel(streak.current)}</p>
        
        {streak.longest > 0 && (
          <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-white/10">
            <Crown size={12} className="text-yellow-400" />
            <span className="text-[10px] text-yellow-400 lowercase">best: {streak.longest}</span>
          </div>
        )}
      </div>
    </div>
  );
}

