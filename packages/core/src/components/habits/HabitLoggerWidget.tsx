import { useState, useCallback, useEffect, useMemo } from 'react';
import { Plus, X, ChevronRight, Sparkles, Timer, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/api/nocobase-client';
import { FactBuffer, ActivityTip, getTipsByCategory, mapActivityToCategory } from './FactBuffer';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  category: string;
  color: string;
  supports_duration: boolean;
  supports_intensity: boolean;
  supports_volume: boolean;
  target_duration?: number; // seconds
  unit?: string; // for volume (e.g., "pages", "reps", "oz")
}

export interface HabitLog {
  id?: string;
  habit_id: string;
  habit_name: string;
  timestamp: string;
  date: string;
  duration_seconds: number;
  intensity: number;
  volume: number;
  notes: string;
  metadata?: Record<string, any>;
}

export interface HabitLoggerWidgetProps {
  className?: string;
  onClose?: () => void;
  onLogged?: (log: HabitLog) => void;
  preselectedHabit?: Habit;
  compact?: boolean;
}

// default habits with multi-metric support
export const DEFAULT_HABITS: Habit[] = [
  { 
    id: 'water_floss', 
    name: 'water floss', 
    emoji: '🚿', 
    category: 'dental', 
    color: '#3c9fdd',
    supports_duration: true,
    supports_intensity: false,
    supports_volume: false,
    target_duration: 120 // 2 minutes
  },
  { 
    id: 'brush_teeth', 
    name: 'brush teeth', 
    emoji: '🦷', 
    category: 'dental', 
    color: '#3c9fdd',
    supports_duration: true,
    supports_intensity: false,
    supports_volume: false,
    target_duration: 120
  },
  { 
    id: 'meditation', 
    name: 'meditate', 
    emoji: '🧘', 
    category: 'mindfulness', 
    color: '#f5af12',
    supports_duration: true,
    supports_intensity: false,
    supports_volume: false,
    target_duration: 600 // 10 minutes
  },
  { 
    id: 'exercise', 
    name: 'exercise', 
    emoji: '💪', 
    category: 'movement', 
    color: '#22c55e',
    supports_duration: true,
    supports_intensity: true,
    supports_volume: true,
    unit: 'reps',
    target_duration: 1800
  },
  { 
    id: 'read', 
    name: 'read', 
    emoji: '📚', 
    category: 'learning', 
    color: '#8b5cf6',
    supports_duration: true,
    supports_intensity: false,
    supports_volume: true,
    unit: 'pages',
    target_duration: 1800
  },
  { 
    id: 'hydrate', 
    name: 'hydrate', 
    emoji: '💧', 
    category: 'hydration', 
    color: '#3c9fdd',
    supports_duration: false,
    supports_intensity: false,
    supports_volume: true,
    unit: 'oz'
  },
  { 
    id: 'shower', 
    name: 'shower', 
    emoji: '🚿', 
    category: 'hygiene', 
    color: '#3c9fdd',
    supports_duration: true,
    supports_intensity: false,
    supports_volume: false,
    target_duration: 600
  },
  { 
    id: 'journal_plan_write', 
    name: 'journal/plan/write', 
    emoji: '📝', 
    category: 'productivity', 
    color: '#32cd32',
    supports_duration: true,
    supports_intensity: false,
    supports_volume: true,
    unit: 'words',
    target_duration: 900
  },
  { 
    id: 'sleep', 
    name: 'sleep', 
    emoji: '🛏️', 
    category: 'sleep', 
    color: '#800080',
    supports_duration: true,
    supports_intensity: true, // quality
    supports_volume: false,
    target_duration: 28800 // 8 hours
  },
  { 
    id: 'eat_meal', 
    name: 'eat meal', 
    emoji: '🍽️', 
    category: 'nutrition', 
    color: '#ff4500',
    supports_duration: false,
    supports_intensity: false,
    supports_volume: false
  },
  { 
    id: 'vibecode', 
    name: 'vibecode', 
    emoji: '💻', 
    category: 'creative', 
    color: '#800080',
    supports_duration: true,
    supports_intensity: false,
    supports_volume: false,
    target_duration: 3600
  },
  { 
    id: 'meds_morning', 
    name: 'morning meds', 
    emoji: '🌞', 
    category: 'medication', 
    color: '#22c55e',
    supports_duration: false,
    supports_intensity: false,
    supports_volume: false
  },
  { 
    id: 'meds_afternoon', 
    name: 'afternoon meds', 
    emoji: '🌤️', 
    category: 'medication', 
    color: '#f59e0b',
    supports_duration: false,
    supports_intensity: false,
    supports_volume: false
  },
  { 
    id: 'meds_night', 
    name: 'night meds', 
    emoji: '🌙', 
    category: 'medication', 
    color: '#6366f1',
    supports_duration: false,
    supports_intensity: false,
    supports_volume: false
  },
];

// quick log form for non-timed habits
function QuickLogForm({
  habit,
  onSubmit,
  onCancel
}: {
  habit: Habit;
  onSubmit: (log: Omit<HabitLog, 'id' | 'timestamp' | 'date'>) => void;
  onCancel: () => void;
}) {
  const [intensity, setIntensity] = useState(0);
  const [volume, setVolume] = useState(0);
  const [notes, setNotes] = useState('');
  
  const handleSubmit = useCallback(() => {
    onSubmit({
      habit_id: habit.id,
      habit_name: habit.name,
      duration_seconds: 0,
      intensity,
      volume,
      notes
    });
  }, [habit, intensity, volume, notes, onSubmit]);
  
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{habit.emoji}</span>
          <span className="text-sm text-white lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {habit.name}
          </span>
        </div>
        <button onClick={onCancel} className="text-white/40 hover:text-white">
          <X size={16} />
        </button>
      </div>
      
      {habit.supports_intensity && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 lowercase">
              {habit.category === 'sleep' ? 'sleep quality' : 'intensity'}
            </span>
            <span className="text-xs text-[#f5af12] tabular-nums">{intensity}/100</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f5af12 0%, #f5af12 ${intensity}%, rgba(255,255,255,0.1) ${intensity}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>
      )}
      
      {habit.supports_volume && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 lowercase">
              {habit.unit || 'amount'}
            </span>
            <span className="text-xs text-[#3c9fdd] tabular-nums">{volume} {habit.unit}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={volume || ''}
              onChange={(e) => setVolume(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase focus:outline-none focus:border-[#3c9fdd]/50"
            />
            <span className="text-xs text-white/40 lowercase">{habit.unit}</span>
          </div>
        </div>
      )}
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="notes (optional)..."
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 resize-none mb-4 focus:outline-none focus:border-[#3c9fdd]/50"
        style={{ fontFamily: 'Varela Round, sans-serif' }}
        rows={2}
      />
      
      <button
        onClick={handleSubmit}
        className="w-full py-2.5 rounded-xl bg-[#f5af12] hover:bg-[#f5af12]/90 text-[#050505] lowercase font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles size={16} />
        log {habit.name}
      </button>
    </div>
  );
}

export function HabitLoggerWidget({
  className,
  onClose,
  onLogged,
  preselectedHabit,
  compact = false
}: HabitLoggerWidgetProps) {
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(preselectedHabit || null);
  const [remoteHabits, setRemoteHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFactBuffer, setShowFactBuffer] = useState(false);
  const [view, setView] = useState<'grid' | 'timer' | 'quick'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // load remote habits from nocobase
  useEffect(() => {
    const loadHabits = async () => {
      try {
        const res: any = await api.listRecords('habits', { pageSize: 100 });
        if (res?.data) {
          const habits: Habit[] = res.data.map((h: any) => ({
            id: h.id,
            name: h.name,
            emoji: h.emoji || '✨',
            category: h.category || 'general',
            color: h.color || '#f5af12',
            supports_duration: h.supports_duration ?? true,
            supports_intensity: h.supports_intensity ?? false,
            supports_volume: h.supports_volume ?? false,
            target_duration: h.target_duration,
            unit: h.unit
          }));
          setRemoteHabits(habits);
        }
      } catch (err) {
        console.error('failed to load habits from nocobase', err);
      }
    };
    
    loadHabits();
  }, []);
  
  const allHabits = useMemo(() => {
    const remoteIds = new Set(remoteHabits.map(h => h.id));
    const defaults = DEFAULT_HABITS.filter(h => !remoteIds.has(h.id));
    return [...remoteHabits, ...defaults];
  }, [remoteHabits]);
  
  const categories = useMemo(() => 
    [...new Set(allHabits.map(h => h.category))],
    [allHabits]
  );
  
  const filteredHabits = useMemo(() => {
    if (!selectedCategory) return allHabits;
    return allHabits.filter(h => h.category === selectedCategory);
  }, [allHabits, selectedCategory]);
  
  const handleHabitSelect = useCallback((habit: Habit) => {
    setSelectedHabit(habit);
    
    if (habit.supports_duration) {
      setShowFactBuffer(true);
      setView('timer');
    } else {
      setView('quick');
    }
  }, []);
  
  const handleTimerComplete = useCallback(async (
    duration: number, 
    notes: string, 
    metrics: Record<string, number>
  ) => {
    if (!selectedHabit) return;
    
    setLoading(true);
    
    const now = new Date();
    const log: HabitLog = {
      habit_id: selectedHabit.id,
      habit_name: selectedHabit.name,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      duration_seconds: duration,
      intensity: metrics.intensity || 0,
      volume: metrics.volume || 0,
      notes
    };
    
    try {
      // save to nocobase
      await api.createRecord('habit_logs', log);
      
      // update local streak cache
      const streakKey = `habit:streak:${selectedHabit.id}`;
      const existingStreak = JSON.parse(localStorage.getItem(streakKey) || '[]');
      const today = now.toISOString().split('T')[0];
      if (!existingStreak.includes(today)) {
        existingStreak.push(today);
        localStorage.setItem(streakKey, JSON.stringify(existingStreak));
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <span>{selectedHabit.emoji}</span>
          <span>{selectedHabit.name} logged: {Math.floor(duration / 60)}m {duration % 60}s</span>
        </div>
      );
      
      onLogged?.(log);
      
      // reset
      setSelectedHabit(null);
      setShowFactBuffer(false);
      setView('grid');
    } catch (err) {
      console.error('failed to log habit', err);
      toast.error('failed to log habit');
    } finally {
      setLoading(false);
    }
  }, [selectedHabit, onLogged]);
  
  const handleQuickLog = useCallback(async (logData: Omit<HabitLog, 'id' | 'timestamp' | 'date'>) => {
    if (!selectedHabit) return;
    
    setLoading(true);
    
    const now = new Date();
    const log: HabitLog = {
      ...logData,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
    };
    
    try {
      await api.createRecord('habit_logs', log);
      
      toast.success(
        <div className="flex items-center gap-2">
          <span>{selectedHabit.emoji}</span>
          <span>{selectedHabit.name} logged</span>
        </div>
      );
      
      onLogged?.(log);
      
      setSelectedHabit(null);
      setView('grid');
    } catch (err) {
      console.error('failed to log habit', err);
      toast.error('failed to log habit');
    } finally {
      setLoading(false);
    }
  }, [selectedHabit, onLogged]);
  
  const handleCancel = useCallback(() => {
    setSelectedHabit(null);
    setShowFactBuffer(false);
    setView('grid');
    onClose?.();
  }, [onClose]);
  
  // timer view with fact buffer
  if (view === 'timer' && selectedHabit && showFactBuffer) {
    return (
      <FactBuffer
        activityId={selectedHabit.id}
        activityName={selectedHabit.name}
        activityEmoji={selectedHabit.emoji}
        category={selectedHabit.category}
        targetDuration={selectedHabit.target_duration}
        onComplete={handleTimerComplete}
        onCancel={() => {
          setShowFactBuffer(false);
          setSelectedHabit(null);
          setView('grid');
        }}
        className={className}
      />
    );
  }
  
  // quick log view
  if (view === 'quick' && selectedHabit) {
    return (
      <QuickLogForm
        habit={selectedHabit}
        onSubmit={handleQuickLog}
        onCancel={handleCancel}
      />
    );
  }
  
  // grid view
  return (
    <div className={cn(
      "p-4 rounded-2xl border border-white/10 bg-[#050505]",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#f5af12]" />
          <p className="text-sm text-white lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            log habit
          </p>
        </div>
        {onClose && (
          <button onClick={handleCancel} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}
      </div>
      
      {/* category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] lowercase whitespace-nowrap transition-colors",
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
              "px-2.5 py-1 rounded-full text-[10px] lowercase whitespace-nowrap transition-colors",
              selectedCategory === cat 
                ? "bg-[#f5af12] text-[#050505]" 
                : "bg-white/10 text-white/60 hover:bg-white/20"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* habits grid */}
      <div className={cn(
        "grid gap-2",
        compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
      )}>
        {filteredHabits.map(habit => (
          <button
            key={habit.id}
            onClick={() => handleHabitSelect(habit)}
            disabled={loading}
            className={cn(
              "p-3 rounded-xl text-left transition-all group relative",
              "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20",
              habit.supports_duration && "border-l-2",
              loading && "opacity-50 cursor-not-allowed"
            )}
            style={{ borderLeftColor: habit.supports_duration ? habit.color : undefined }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{habit.emoji}</span>
              <span className="text-xs text-white lowercase truncate" style={{ fontFamily: 'Varela Round, sans-serif' }}>
                {habit.name}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {habit.supports_duration && (
                <Timer size={12} className="text-[#f5af12]" />
              )}
              {habit.supports_intensity && (
                <BarChart3 size={12} className="text-[#3c9fdd]" />
              )}
              {habit.supports_volume && (
                <span className="text-[10px] text-white/40 lowercase">{habit.unit}</span>
              )}
            </div>
            
            <ChevronRight 
              size={14} 
              className="absolute top-2 right-2 text-white/20 group-hover:text-white/40 transition-colors" 
            />
          </button>
        ))}
      </div>
      
      {filteredHabits.length === 0 && (
        <p className="text-center text-white/30 text-xs lowercase py-8">
          no habits found
        </p>
      )}
      
      {/* legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Timer size={12} className="text-[#f5af12]" />
          <span className="text-[10px] text-white/30 lowercase">timed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BarChart3 size={12} className="text-[#3c9fdd]" />
          <span className="text-[10px] text-white/30 lowercase">intensity</span>
        </div>
      </div>
    </div>
  );
}

export default HabitLoggerWidget;
