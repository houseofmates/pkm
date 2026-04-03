import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoodEntry {
  date: string;
  mood: number; // 0-5 scale
}

interface MoodTrendWidgetProps {
  entries: MoodEntry[];
  className?: string;
}

const moodEmojis = ['😢', '😟', '😐', '🙂', '😊', '🤩'];
const moodLabels = ['terrible', 'bad', 'fine', 'good', 'great', 'amazing'];

export const MoodTrendWidget = memo(function MoodTrendWidget({ entries, className }: MoodTrendWidgetProps) {
  // Get last 7 days of moods
  const last7Days = useMemo(() => {
    const days: (MoodEntry | null)[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const entry = entries.find(e => e.date === dateStr);
      days.push(entry || null);
    }
    
    return days;
  }, [entries]);

  // Calculate trend
  const trend = useMemo(() => {
    const validMoods = last7Days.filter(d => d !== null).map(d => d!.mood);
    if (validMoods.length < 2) return 'neutral';
    
    const first = validMoods[0];
    const last = validMoods[validMoods.length - 1];
    
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'neutral';
  }, [last7Days]);

  // Calculate average
  const average = useMemo(() => {
    const validMoods = last7Days.filter(d => d !== null).map(d => d!.mood);
    if (validMoods.length === 0) return null;
    return validMoods.reduce((a, b) => a + b, 0) / validMoods.length;
  }, [last7Days]);

  const days = ['m', 't', 'w', 't', 'f', 's', 's'];

  return (
    <div className={cn("p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 lowercase">mood trend</span>
        </div>
        {trend === 'up' && <TrendingUp size={14} className="text-green-400" />}
        {trend === 'down' && <TrendingDown size={14} className="text-red-400" />}
        {trend === 'neutral' && <Minus size={14} className="text-white/40" />}
      </div>

      {/* Sparkline */}
      <div className="flex items-end gap-1 h-16">
        {last7Days.map((entry, i) => {
          const height = entry ? `${((entry.mood + 1) / 6) * 100}%` : '0%';
          const color = entry
            ? entry.mood >= 4 ? 'bg-green-400'
            : entry.mood >= 2 ? 'bg-yellow-400'
            : 'bg-red-400'
            : 'bg-white/10';
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '48px' }}>
                <div
                  className={cn("w-full rounded-t transition-all duration-500", color)}
                  style={{ height }}
                />
              </div>
              <span className="text-[10px] text-white/30 lowercase">{days[i]}</span>
            </div>
          );
        })}
      </div>

      {/* Average */}
      {average !== null && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/10">
          <span className="text-lg">{moodEmojis[Math.round(average)]}</span>
          <span className="text-xs text-white/60 lowercase">
            avg: {moodLabels[Math.round(average)]}
          </span>
        </div>
      )}
    </div>
  );
});
