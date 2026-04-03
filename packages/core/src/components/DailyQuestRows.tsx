import { useState, useEffect, useCallback } from 'react';
import { useGamificationStore, type QuestRow } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';
import { Check, Sparkles, BookOpen, Heart, Brain, Home } from 'lucide-react';
import { useLifeTrackers, type TrackerId } from '@/components/HygieneLifeTracker';
import { XPExplosion } from '@/components/XPExplosion';

interface QuestRowDisplayProps {
  row: QuestRow;
  index: number;
  onComplete: (rowId: string) => void;
  completedToday: boolean;
  showExplosion?: boolean;
}

// Row 0: Journal (entry + mood)
// Row 1: Body (shower + ate + water >= 3)
// Row 2: Mind (creative/coding OR journal 100+ words)
// Row 3: Pets/Self (meds + left bed + one hygiene)

const ROW_CONFIG = [
  { 
    id: 'journal', 
    icon: BookOpen, 
    color: 'from-violet-500 to-purple-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-400/30',
    emptyHint: 'journal entry + mood log'
  },
  { 
    id: 'body', 
    icon: Heart, 
    color: 'from-emerald-500 to-teal-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-400/30',
    emptyHint: 'shower + ate + water'
  },
  { 
    id: 'mind', 
    icon: Brain, 
    color: 'from-blue-500 to-cyan-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-400/30',
    emptyHint: 'creative work or 100+ words'
  },
  { 
    id: 'self', 
    icon: Home, 
    color: 'from-amber-500 to-orange-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-400/30',
    emptyHint: 'meds + left bed + hygiene'
  },
];

function QuestRowDisplay({ row, index, onComplete, completedToday, showExplosion }: QuestRowDisplayProps) {
  const config = ROW_CONFIG[index] || ROW_CONFIG[0];
  const Icon = config.icon;
  
  const completedCount = row.cells.filter(c => c.completed).length;
  const totalCells = row.cells.length;
  const progressPercent = (completedCount / totalCells) * 100;
  const isComplete = completedCount === totalCells;
  
  // Visual state based on completion
  const isEmpty = completedCount === 0;
  const isPartial = completedCount > 0 && !isComplete;
  
  return (
    <div 
      className={cn(
        "relative p-3 rounded-xl border transition-all duration-300",
        isComplete 
          ? `${config.bgColor} ${config.borderColor}` 
          : isEmpty
            ? "bg-black/20 border-white/5 opacity-70"
            : "bg-black/40 border-white/10"
      )}
    >
      {/* XP Explosion effect */}
      <XPExplosion 
        trigger={showExplosion || false} 
        rowId={row.id}
        className="absolute inset-0 z-50"
      />
      {/* Row header */}
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isComplete 
            ? `bg-gradient-to-br ${config.color} text-white`
            : "bg-white/5 text-white/40"
        )}>
          {isComplete ? <Sparkles className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium lowercase transition-colors",
              isComplete ? "text-white" : isEmpty ? "text-white/30" : "text-white/60"
            )}>
              {row.label}
            </span>
            {isComplete && (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                +25 xp
              </span>
            )}
          </div>
          
          {/* Empty hint */}
          {isEmpty && (
            <p className="text-[10px] text-white/20 lowercase italic">
              {config.emptyHint}
            </p>
          )}
        </div>
        
        {/* Progress count */}
        <span className={cn(
          "text-xs tabular-nums",
          isComplete ? "text-white/80" : "text-white/30"
        )}>
          {completedCount}/{totalCells}
        </span>
      </div>
      
      {/* Progress bar - always visible, shows partial fill */}
      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isComplete 
              ? `bg-gradient-to-r ${config.color}`
              : isPartial
                ? "bg-white/30"
                : "bg-white/10"
          )}
          style={{ width: `${Math.max(progressPercent, 5)}%` }}
        />
      </div>
      
      {/* Cell indicators */}
      <div className="flex gap-1 mt-2">
        {row.cells.map((cell, i) => (
          <div
            key={cell.id}
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center text-xs transition-all",
              cell.completed
                ? `bg-gradient-to-br ${config.color} text-white`
                : "bg-white/5 text-white/20"
            )}
            title={cell.label}
          >
            {cell.completed ? <Check className="w-3 h-3" /> : cell.icon}
          </div>
        ))}
      </div>
      
      {/* XP explosion effect placeholder - will be triggered by parent */}
      {completedToday && (
        <div className="absolute inset-0 pointer-events-none animate-ping opacity-20 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-xl" />
      )}
    </div>
  );
}

interface DailyQuestRowsProps {
  className?: string;
  onRowComplete?: (rowId: string) => void;
}

export function DailyQuestRows({ className, onRowComplete }: DailyQuestRowsProps) {
  const { questRows, updateQuestCell, pets, updatePet, addXp } = useGamificationStore();
  const lifeTrackers = useLifeTrackers();
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [completedRows, setCompletedRows] = useState<Set<string>>(new Set());
  const [explodingRows, setExplodingRows] = useState<Set<string>>(new Set());
  
  // Load today's journal entry
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const loadEntry = async () => {
      try {
        const api = (await import('@/api/nocobase-client')).default;
        const res: any = await api.listRecords('journal', {
          filter: { date: today },
          pageSize: 1
        });
        if (res?.data?.[0]) {
          setTodayEntry(res.data[0]);
          const body = res.data[0].body || '';
          setWordCount(body.split(/\s+/).filter((w: string) => w.length > 0).length);
        }
      } catch (e) {
        // Silently fail - no journal entry yet
      }
    };
    loadEntry();
    
    // Also check localStorage for draft
    const draft = localStorage.getItem('pkm:journal:draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.body) {
          const draftWords = parsed.body.split(/\s+/).filter((w: string) => w.length > 0).length;
          setWordCount(prev => Math.max(prev, draftWords));
        }
      } catch {}
    }
  }, []);
  
  // Check quest completion based on tracker data and journal
  useEffect(() => {
    // Row 0: Journal (entry + mood)
    if (todayEntry) {
      updateQuestCell('journal', 'entry', true);
      if (todayEntry.mood) updateQuestCell('journal', 'mood', true);
      
      const emotions = JSON.parse(todayEntry.emotions || '[]');
      if (emotions.length >= 3) updateQuestCell('journal', 'emotions', true);
      
      if (wordCount >= 50) updateQuestCell('journal', 'body', true);
      if (wordCount >= 100) updateQuestCell('journal', 'reflect', true);
    }
    
    // Row 1: Body (shower + ate + water)
    const hasShower = lifeTrackers.hasChecked(['shower']);
    const hasAte = lifeTrackers.hasChecked(['ate']);
    const waterLevel = lifeTrackers.getScaleValue('water');
    const hasWater = waterLevel >= 3;
    
    if (hasShower) updateQuestCell('body', 'shower', true);
    if (hasAte) updateQuestCell('body', 'ate', true);
    if (hasWater) updateQuestCell('body', 'water', true);
    
    // Row 3: Self/Pets (meds + left_bed + one hygiene)
    const hasMeds = lifeTrackers.hasChecked(['meds']);
    const hasLeftBed = lifeTrackers.hasChecked(['left_bed']);
    const hasHygiene = lifeTrackers.hasChecked([
      'shower', 'brush_teeth_morning', 'brush_teeth_night', 
      'wash_face', 'skincare', 'makeup'
    ]);
    
    if (hasMeds) updateQuestCell('self', 'meds', true);
    if (hasLeftBed) updateQuestCell('self', 'left_bed', true);
    if (hasHygiene) updateQuestCell('self', 'hygiene', true);
    
  }, [todayEntry, wordCount, lifeTrackers]);
  
  // Listen for row completion events
  useEffect(() => {
    const handleRowComplete = (e: CustomEvent<{ rowId: string }>) => {
      const { rowId } = e.detail;
      setCompletedRows(prev => new Set(prev).add(rowId));
      setExplodingRows(prev => new Set(prev).add(rowId)); // Trigger explosion
      onRowComplete?.(rowId);
      
      // Feed Wilson when a row completes
      if (pets[0]) {
        updatePet('wilson', { 
          hunger: Math.min(100, pets[0].hunger + 15),
          happiness: Math.min(100, pets[0].happiness + 10),
          visualState: 'eating'
        });
        
        setTimeout(() => {
          updatePet('wilson', { visualState: 'idle-happy' });
        }, 3000);
      }
      
      // Clear completion flash and explosion after animation
      setTimeout(() => {
        setCompletedRows(prev => {
          const next = new Set(prev);
          next.delete(rowId);
          return next;
        });
        setExplodingRows(prev => {
          const next = new Set(prev);
          next.delete(rowId);
          return next;
        });
      }, 2000);
    };
    
    window.addEventListener('quest-row-complete', handleRowComplete as EventListener);
    return () => window.removeEventListener('quest-row-complete', handleRowComplete as EventListener);
  }, [onRowComplete, pets, updatePet]);
  
  // Reconfigure default quest rows to match our 4-row system
  const reconfiguredRows: QuestRow[] = [
    {
      id: 'journal',
      label: 'journal',
      completed: questRows.find(r => r.id === 'journal')?.completed || false,
      cells: questRows.find(r => r.id === 'journal')?.cells || [
        { id: 'entry', label: 'entry', completed: false, icon: '📝' },
        { id: 'mood', label: 'mood', completed: false, icon: '😊' },
        { id: 'emotions', label: '3+ emotions', completed: false, icon: '💭' },
        { id: 'body', label: '50+ words', completed: false, icon: '📄' },
        { id: 'reflect', label: '100+ words', completed: false, icon: '🪞' },
      ]
    },
    {
      id: 'body',
      label: 'body',
      completed: false,
      cells: [
        { id: 'shower', label: 'shower', completed: lifeTrackers.hasChecked(['shower']), icon: '🚿' },
        { id: 'ate', label: 'ate', completed: lifeTrackers.hasChecked(['ate']), icon: '🍽️' },
        { id: 'water', label: 'water 3+', completed: lifeTrackers.getScaleValue('water') >= 3, icon: '💧' },
      ]
    },
    {
      id: 'mind',
      label: 'mind',
      completed: false,
      cells: [
        { id: 'journal_words', label: '100+ words', completed: wordCount >= 100, icon: '✍️' },
        { id: 'creative', label: 'creative', completed: false, icon: '🎨' },
        { id: 'coding', label: 'coding', completed: false, icon: '💻' },
      ]
    },
    {
      id: 'self',
      label: 'pets/self',
      completed: false,
      cells: [
        { id: 'meds', label: 'meds', completed: lifeTrackers.hasChecked(['meds']), icon: '💊' },
        { id: 'left_bed', label: 'left bed', completed: lifeTrackers.hasChecked(['left_bed']), icon: '🛏️' },
        { id: 'hygiene', label: 'hygiene', completed: lifeTrackers.hasChecked(['shower', 'brush_teeth_morning', 'brush_teeth_night', 'wash_face', 'skincare']), icon: '🧴' },
      ]
    }
  ];
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-xs text-white/40 lowercase">daily quests</span>
        </div>
        <span className="text-xs text-white/30 tabular-nums">
          {reconfiguredRows.filter(r => r.cells.every(c => c.completed)).length}/4 complete
        </span>
      </div>
      
      {reconfiguredRows.map((row, index) => (
        <QuestRowDisplay
          key={row.id}
          row={row}
          index={index}
          onComplete={onRowComplete || (() => {})}
          completedToday={completedRows.has(row.id)}
          showExplosion={explodingRows.has(row.id)}
        />
      ))}
    </div>
  );
}
