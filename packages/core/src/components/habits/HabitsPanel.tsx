import { useState, useCallback } from 'react';
import { X, ChevronRight, Trophy, Flame, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  HabitLoggerWidget, 
  HabitsDashboard, 
  type Habit,
  type HabitLog,
  type HabitMetric 
} from './index';

export interface HabitsPanelProps {
  className?: string;
  onClose?: () => void;
  initialView?: 'dashboard' | 'logger' | 'detail';
  selectedHabitId?: string;
}

// detail view for a specific habit
function HabitDetailView({ 
  habit, 
  onBack,
  onLog
}: { 
  habit: HabitMetric; 
  onBack: () => void;
  onLog: () => void;
}) {
  const [recentLogs, setRecentLogs] = useState<HabitLog[]>([]);
  
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
        >
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${habit.color}20`, borderLeft: `3px solid ${habit.color}` }}
        >
          {habit.emoji}
        </div>
        <div className="flex-1">
          <p className="text-white lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {habit.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="lowercase">level {habit.level}</span>
            <span>•</span>
            <span className="lowercase">{habit.xp} xp</span>
          </div>
        </div>
      </div>
      
      {/* stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame size={14} className="text-orange-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">streak</span>
          </div>
          <p className="text-xl font-bold text-orange-400" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {habit.currentStreak} days
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy size={14} className="text-[#f5af12]" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">best</span>
          </div>
          <p className="text-xl font-bold text-[#f5af12]" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {habit.longestStreak} days
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={14} className="text-[#3c9fdd]" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">sessions</span>
          </div>
          <p className="text-xl font-bold text-[#3c9fdd]" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {habit.totalSessions}
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 size={14} className="text-green-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">time</span>
          </div>
          <p className="text-xl font-bold text-green-400" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {Math.floor(habit.totalDuration / 3600)}h {Math.floor((habit.totalDuration % 3600) / 60)}m
          </p>
        </div>
      </div>
      
      {/* xp progress */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/40 lowercase">progress to next level</span>
          <span className="text-xs text-[#f5af12] lowercase">{habit.xp}/{habit.nextLevelXp} xp</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-gradient-to-r from-[#f5af12] to-[#3c9fdd] rounded-full transition-all duration-500"
            style={{ width: `${(habit.xp / habit.nextLevelXp) * 100}%` }}
          />
        </div>
        <p className="text-xs text-white/30 lowercase">
          {habit.nextLevelXp - habit.xp} xp needed for level {habit.level + 1}
        </p>
      </div>
      
      {/* weekly chart */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <p className="text-xs text-white/40 lowercase mb-3">last 7 days</p>
        <div className="flex gap-1">
          {habit.weeklyProgress.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-white/5 rounded-sm relative overflow-hidden" style={{ height: '60px' }}>
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-[#f5af12] transition-all duration-300 rounded-sm"
                  style={{ height: `${val}%` }}
                />
              </div>
              <span className="text-[8px] text-white/30">
                {['m','t','w','t','f','s','s'][idx]}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* action button */}
      <button
        onClick={onLog}
        className="w-full py-3 rounded-xl bg-[#f5af12] hover:bg-[#f5af12]/90 text-[#050505] lowercase font-medium transition-colors"
        style={{ fontFamily: 'Varela Round, sans-serif' }}
      >
        log {habit.name} session
      </button>
    </div>
  );
}

// main panel component
export function HabitsPanel({
  className,
  onClose,
  initialView = 'dashboard',
  selectedHabitId
}: HabitsPanelProps) {
  const [view, setView] = useState<'dashboard' | 'logger' | 'detail'>(initialView);
  const [selectedHabit, setSelectedHabit] = useState<HabitMetric | null>(null);
  
  const handleHabitSelect = useCallback((habit: HabitMetric) => {
    setSelectedHabit(habit);
    setView('detail');
  }, []);
  
  const handleBack = useCallback(() => {
    setView('dashboard');
    setSelectedHabit(null);
  }, []);
  
  const handleLogClick = useCallback(() => {
    setView('logger');
  }, []);
  
  const handleLogged = useCallback(() => {
    setView('dashboard');
  }, []);
  
  return (
    <div className={cn(
      "p-4 rounded-2xl border border-white/10 bg-[#050505] relative overflow-hidden",
      className
    )}>
      {/* subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5af12]/5 via-transparent to-[#3c9fdd]/5 pointer-events-none" />
      
      <div className="relative z-10">
        {/* panel header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#f5af12]/10 flex items-center justify-center">
              <Zap size={16} className="text-[#f5af12]" />
            </div>
            <p className="text-sm text-white lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
              {view === 'dashboard' && 'habit mastery'}
              {view === 'logger' && 'log habit'}
              {view === 'detail' && selectedHabit?.name}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* view content */}
        {view === 'dashboard' && (
          <HabitsDashboard 
            onHabitSelect={handleHabitSelect}
            showDetails={true}
          />
        )}
        
        {view === 'logger' && (
          <HabitLoggerWidget
            onLogged={handleLogged}
            onClose={() => setView('dashboard')}
            compact={true}
          />
        )}
        
        {view === 'detail' && selectedHabit && (
          <HabitDetailView
            habit={selectedHabit}
            onBack={handleBack}
            onLog={handleLogClick}
          />
        )}
        
        {/* bottom action bar */}
        {view === 'dashboard' && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={() => setView('logger')}
              className="w-full py-2.5 rounded-xl bg-[#f5af12]/10 hover:bg-[#f5af12]/20 text-[#f5af12] lowercase font-medium transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: 'Varela Round, sans-serif' }}
            >
              <Zap size={16} />
              log new habit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// inline widget for embedding in other pages
export function HabitsInlineWidget({ className }: { className?: string }) {
  const [showLogger, setShowLogger] = useState(false);
  
  if (showLogger) {
    return (
      <HabitLoggerWidget
        className={className}
        onClose={() => setShowLogger(false)}
        onLogged={() => setShowLogger(false)}
        compact={true}
      />
    );
  }
  
  return (
    <div className={cn(
      "p-4 rounded-xl border border-white/10 bg-[#050505]",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
          quick log
        </p>
        <button
          onClick={() => setShowLogger(true)}
          className="text-xs text-[#f5af12] lowercase hover:underline"
        >
          view all
        </button>
      </div>
      
      {/* mini habit grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: 'water_floss', emoji: '🚿', color: '#3c9fdd' },
          { id: 'meditation', emoji: '🧘', color: '#f5af12' },
          { id: 'brush_teeth', emoji: '🦷', color: '#3c9fdd' },
          { id: 'exercise', emoji: '💪', color: '#22c55e' },
        ].map(habit => (
          <button
            key={habit.id}
            onClick={() => setShowLogger(true)}
            className="aspect-square rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center gap-1"
          >
            <span className="text-xl">{habit.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default HabitsPanel;
