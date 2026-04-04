import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Target, 
  Zap,
  Calendar,
  Clock,
  Activity,
  ChevronRight,
  Trophy,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export interface HabitMetric {
  id: string;
  name: string;
  emoji: string;
  category: string;
  color: string;
  totalSessions: number;
  totalDuration: number; // seconds
  totalIntensity: number;
  currentStreak: number;
  longestStreak: number;
  lastSession: string | null;
  weeklyProgress: number[]; // 7 days
  monthlyAverage: number;
  level: number;
  xp: number;
  nextLevelXp: number;
}

export interface HabitDashboardProps {
  className?: string;
  onHabitSelect?: (habit: HabitMetric) => void;
  showDetails?: boolean;
}

// xp calculation based on habit performance
function calculateLevel(totalDuration: number, totalSessions: number, streak: number): { level: number; xp: number; nextLevelXp: number } {
  const baseXp = Math.floor(totalDuration / 60) + (totalSessions * 10) + (streak * 5);
  const level = Math.floor(Math.sqrt(baseXp / 100)) + 1;
  const xp = baseXp % 100;
  const nextLevelXp = 100;
  return { level, xp, nextLevelXp };
}

// stat names for gamification feel
const STAT_NAMES: Record<string, string> = {
  'dental': 'oral hygiene',
  'mindfulness': 'mindfulness',
  'movement': 'fitness',
  'hydration': 'hydration',
  'learning': 'knowledge',
  'sleep': 'restoration',
  'nutrition': 'nutrition',
  'social': 'connection',
  'medication': 'adherence',
  'creative': 'creativity',
  'hygiene': 'self-care',
  'productivity': 'output',
  'health': 'wellness',
};

function StatBar({ 
  label, 
  value, 
  max = 100, 
  color = '#f5af12',
  icon: Icon,
  level,
  showLevel = true
}: { 
  label: string; 
  value: number; 
  max?: number; 
  color?: string;
  icon?: React.ComponentType<{size?: number, className?: string}>;
  level?: number;
  showLevel?: boolean;
}) {
  const percent = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-white/40" />}
          <span className="text-xs text-white/60 lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showLevel && level !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#f5af12] lowercase">
              lv.{level}
            </span>
          )}
          <span className="text-xs text-white/40 tabular-nums">{Math.round(value)}%</span>
        </div>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500 relative"
          style={{ width: `${percent}%`, backgroundColor: color }}
        >
          {percent > 90 && (
            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}

function HabitCard({ 
  habit, 
  onClick,
  rank
}: { 
  habit: HabitMetric; 
  onClick?: () => void;
  rank?: number;
}) {
  const progressPercent = (habit.xp / habit.nextLevelXp) * 100;
  const isRecentlyActive = habit.lastSession && 
    new Date(habit.lastSession).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border cursor-pointer transition-all group relative overflow-hidden",
        isRecentlyActive 
          ? "border-[#f5af12]/30 bg-[#f5af12]/5" 
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      )}
    >
      {/* rank badge for top habits */}
      {rank && rank <= 3 && (
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
          style={{ 
            backgroundColor: rank === 1 ? '#f5af12' : rank === 2 ? '#c0c0c0' : '#cd7f32',
            color: rank === 1 ? '#050505' : '#fff'
          }}
        >
          <Trophy size={12} />
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${habit.color}20`, borderLeft: `3px solid ${habit.color}` }}
        >
          {habit.emoji}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white lowercase truncate" style={{ fontFamily: 'Varela Round, sans-serif' }}>
              {habit.name}
            </p>
            <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            {habit.currentStreak > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                <Flame size={10} className="text-orange-400" />
                <span className="text-orange-400 lowercase">{habit.currentStreak} streak</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <Clock size={10} />
              <span className="lowercase">{Math.floor(habit.totalDuration / 60)}m total</span>
            </div>
          </div>
          
          {/* xp bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-white/40 lowercase">level {habit.level}</span>
              <span className="text-[#f5af12] lowercase">{habit.xp}/{habit.nextLevelXp} xp</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#f5af12] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* weekly heatmap strip */}
      <div className="flex gap-0.5 mt-3 pt-3 border-t border-white/5">
        {habit.weeklyProgress.map((val, idx) => (
          <div 
            key={idx}
            className="flex-1 h-4 rounded-sm"
            style={{ 
              backgroundColor: val > 0 
                ? `rgba(245, 175, 18, ${0.2 + (val / 100) * 0.8})` 
                : 'rgba(255,255,255,0.05)'
            }}
            title={`day ${idx + 1}: ${val}%`}
          />
        ))}
      </div>
    </div>
  );
}

export function HabitsDashboard({ 
  className, 
  onHabitSelect,
  showDetails = true 
}: HabitDashboardProps) {
  const [habits, setHabits] = useState<HabitMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // load habits data from nocobase
  useEffect(() => {
    const loadHabits = async () => {
      try {
        // fetch habits collection
        const habitsRes: any = await api.listRecords('habits', { pageSize: 100 });
        
        // fetch activity logs for metrics
        const logsRes: any = await api.listRecords('habit_logs', { 
          pageSize: 1000,
          sort: '-timestamp'
        });
        
        const logs = logsRes?.data || [];
        
        // calculate metrics for each habit
        const metrics: HabitMetric[] = (habitsRes?.data || []).map((habit: any) => {
          const habitLogs = logs.filter((l: any) => l.habit_id === habit.id);
          
          const totalSessions = habitLogs.length;
          const totalDuration = habitLogs.reduce((sum: number, l: any) => sum + (l.duration_seconds || 0), 0);
          const totalIntensity = habitLogs.reduce((sum: number, l: any) => sum + (l.intensity || 0), 0);
          
          // calculate streak
          const dates = [...new Set(habitLogs.map((l: any) => l.date))].sort();
          let currentStreak = 0;
          const today = new Date().toISOString().split('T')[0];
          
          for (let i = dates.length - 1; i >= 0; i--) {
            const date = dates[i];
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - (dates.length - 1 - i));
            
            if (date === expectedDate.toISOString().split('T')[0] || 
                (i === dates.length - 1 && date === today)) {
              currentStreak++;
            } else if (i < dates.length - 1) {
              break;
            }
          }
          
          // weekly progress (last 7 days)
          const weeklyProgress = Array(7).fill(0);
          const now = new Date();
          for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            const dayLogs = habitLogs.filter((l: any) => l.date === dateStr);
            weeklyProgress[i] = dayLogs.length > 0 ? Math.min(dayLogs.length * 20, 100) : 0;
          }
          
          const { level, xp, nextLevelXp } = calculateLevel(totalDuration, totalSessions, currentStreak);
          
          return {
            id: habit.id,
            name: habit.name,
            emoji: habit.emoji || '✨',
            category: habit.category || 'general',
            color: habit.color || '#f5af12',
            totalSessions,
            totalDuration,
            totalIntensity,
            currentStreak,
            longestStreak: currentStreak, // simplified
            lastSession: habitLogs[0]?.timestamp || null,
            weeklyProgress,
            monthlyAverage: totalSessions > 0 ? totalDuration / totalSessions / 60 : 0,
            level,
            xp,
            nextLevelXp,
          };
        });
        
        setHabits(metrics);
      } catch (err) {
        secureLogger.error('failed to load habits', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadHabits();
    const interval = setInterval(loadHabits, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // calculate overall stats
  const overallStats = useMemo(() => {
    if (habits.length === 0) return null;
    
    const totalXp = habits.reduce((sum, h) => sum + h.xp + (h.level - 1) * 100, 0);
    const totalLevel = Math.floor(Math.sqrt(totalXp / 100)) + 1;
    const totalStreaks = habits.reduce((sum, h) => sum + h.currentStreak, 0);
    const totalTime = habits.reduce((sum, h) => sum + h.totalDuration, 0);
    const activeHabits = habits.filter(h => h.currentStreak > 0).length;
    
    // category breakdown
    const categories = [...new Set(habits.map(h => h.category))];
    const categoryStats = categories.map(cat => ({
      name: STAT_NAMES[cat] || cat,
      value: habits.filter(h => h.category === cat).reduce((sum, h) => sum + h.xp, 0),
      level: Math.max(...habits.filter(h => h.category === cat).map(h => h.level)),
      color: habits.find(h => h.category === cat)?.color || '#f5af12'
    })).sort((a, b) => b.value - a.value);
    
    return {
      totalLevel,
      totalXp,
      totalStreaks,
      totalTime,
      activeHabits,
      categoryStats,
      completionRate: (activeHabits / habits.length) * 100
    };
  }, [habits]);
  
  // filtered habits
  const filteredHabits = useMemo(() => {
    if (!selectedCategory) return habits;
    return habits.filter(h => h.category === selectedCategory);
  }, [habits, selectedCategory]);
  
  // top habits by level
  const topHabits = useMemo(() => {
    return [...habits].sort((a, b) => (b.level * 100 + b.xp) - (a.level * 100 + a.xp)).slice(0, 3);
  }, [habits]);
  
  const categories = useMemo(() => 
    [...new Set(habits.map(h => h.category))],
    [habits]
  );
  
  if (loading) {
    return (
      <div className={cn("p-6 rounded-2xl border border-white/10 bg-[#050505] animate-pulse", className)}>
        <div className="h-4 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-white/5 rounded-xl" />
          <div className="h-20 bg-white/5 rounded-xl" />
          <div className="h-20 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }
  
  if (habits.length === 0) {
    return (
      <div className={cn("p-6 rounded-2xl border border-white/10 bg-[#050505] text-center", className)}>
        <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3">
          <Target size={20} className="text-white/40" />
        </div>
        <p className="text-sm text-white/60 lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
          no habits configured yet
        </p>
        <p className="text-xs text-white/30 lowercase mt-1">
          add habits in nocobase to see stats
        </p>
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* overall stats header */}
      {overallStats && (
        <div className="p-4 rounded-2xl border border-[#f5af12]/20 bg-[#050505] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f5af12]/5 to-[#3c9fdd]/5 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#f5af12]" />
                <span className="text-xs text-white/40 lowercase">habit mastery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#f5af12]" style={{ fontFamily: 'Varela Round, sans-serif' }}>
                  lv.{overallStats.totalLevel}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#f5af12]">
                  <Flame size={14} />
                  <span className="text-lg font-bold">{overallStats.totalStreaks}</span>
                </div>
                <span className="text-[10px] text-white/40 lowercase">day streaks</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#3c9fdd]">
                  <Clock size={14} />
                  <span className="text-lg font-bold">{Math.floor(overallStats.totalTime / 3600)}h</span>
                </div>
                <span className="text-[10px] text-white/40 lowercase">logged</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-400">
                  <Activity size={14} />
                  <span className="text-lg font-bold">{Math.round(overallStats.completionRate)}%</span>
                </div>
                <span className="text-[10px] text-white/40 lowercase">active</span>
              </div>
            </div>
            
            {/* category stat bars */}
            {showDetails && overallStats.categoryStats.slice(0, 4).map(cat => (
              <StatBar 
                key={cat.name}
                label={cat.name}
                value={cat.value}
                max={Math.max(...overallStats.categoryStats.map(c => c.value))}
                color={cat.color}
                level={cat.level}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs lowercase whitespace-nowrap transition-colors",
            selectedCategory === null 
              ? "bg-[#f5af12] text-[#050505]" 
              : "bg-white/10 text-white/60 hover:bg-white/20"
          )}
        >
          all
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs lowercase whitespace-nowrap transition-colors",
              selectedCategory === cat 
                ? "bg-[#f5af12] text-[#050505]" 
                : "bg-white/10 text-white/60 hover:bg-white/20"
            )}
          >
            {STAT_NAMES[cat] || cat}
          </button>
        ))}
      </div>
      
      {/* habits grid */}
      <div className="grid gap-3">
        {filteredHabits.map((habit, idx) => (
          <HabitCard 
            key={habit.id} 
            habit={habit} 
            onClick={() => onHabitSelect?.(habit)}
            rank={idx < 3 && selectedCategory === null ? idx + 1 : undefined}
          />
        ))}
      </div>
      
      {/* view toggle */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-white/30 lowercase">
          {filteredHabits.length} habits
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 rounded transition-colors",
              viewMode === 'grid' ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
            )}
          >
            <BarChart3 size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded transition-colors",
              viewMode === 'list' ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
            )}
          >
            <Calendar size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default HabitsDashboard;
