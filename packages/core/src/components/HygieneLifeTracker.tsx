import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, Droplets, Sun, Moon } from 'lucide-react';

export type TrackerId = 
  | 'shower' | 'brush_teeth_morning' | 'brush_teeth_night' | 'wash_face' 
  | 'skincare' | 'makeup' | 'ate' | 'water' | 'left_bed' 
  | 'left_room' | 'left_house' | 'meds';

export interface LifeTracker {
  id: TrackerId;
  label: string;
  emoji: string;
  checked: boolean;
  category: 'hygiene' | 'health' | 'wellness' | 'water';
  type: 'toggle' | 'scale';
  scaleValue?: number; // 1-5 for water
  metadata?: Record<string, unknown>;
}

interface HygieneLifeTrackerProps {
  date?: string;
  onChange?: (trackers: LifeTracker[]) => void;
  className?: string;
}

const DEFAULT_TRACKERS: Omit<LifeTracker, 'checked' | 'scaleValue'>[] = [
  // Hygiene
  { id: 'shower', label: 'shower', emoji: '🚿', category: 'hygiene', type: 'toggle' },
  { id: 'brush_teeth_morning', label: 'brushed (am)', emoji: '🌅', category: 'hygiene', type: 'toggle' },
  { id: 'brush_teeth_night', label: 'brushed (pm)', emoji: '🌙', category: 'hygiene', type: 'toggle' },
  { id: 'wash_face', label: 'washed face', emoji: '🧴', category: 'hygiene', type: 'toggle' },
  { id: 'skincare', label: 'skincare', emoji: '✨', category: 'hygiene', type: 'toggle' },
  { id: 'makeup', label: 'grooming', emoji: '💄', category: 'hygiene', type: 'toggle' },
  
  // Health basics
  { id: 'ate', label: 'ate something', emoji: '🍽️', category: 'health', type: 'toggle' },
  { id: 'meds', label: 'took meds', emoji: '💊', category: 'health', type: 'toggle' },
  
  // Water with scale
  { id: 'water', label: 'hydration', emoji: '💧', category: 'water', type: 'scale' },
  
  // Movement (the "left" track - progressive disclosure)
  { id: 'left_bed', label: 'left bed', emoji: '🛏️', category: 'wellness', type: 'toggle' },
  { id: 'left_room', label: 'left room', emoji: '🚪', category: 'wellness', type: 'toggle' },
  { id: 'left_house', label: 'left house', emoji: '🌳', category: 'wellness', type: 'toggle' },
];

function ToggleTracker({ 
  tracker, 
  onToggle 
}: { 
  tracker: LifeTracker; 
  onToggle: (id: TrackerId) => void;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleClick = () => {
    setIsAnimating(true);
    onToggle(tracker.id);
    setTimeout(() => setIsAnimating(false), 300);
  };
  
  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative px-3 py-2.5 rounded-xl text-xs lowercase transition-all duration-200",
        "border select-none touch-manipulation",
        "flex items-center gap-2 min-w-[100px]",
        tracker.checked
          ? "border-transparent bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white"
          : "border-white/15 bg-black/20 text-white/40 hover:border-white/30 hover:text-white/60"
      )}
    >
      {/* Background fill animation */}
      <span 
        className={cn(
          "absolute inset-0 rounded-xl transition-all duration-300",
          tracker.checked ? "opacity-100" : "opacity-0 scale-75"
        )}
        style={{
          background: tracker.checked 
            ? 'radial-gradient(circle at 30% 50%, rgba(16, 185, 129, 0.25) 0%, transparent 70%)'
            : 'none',
        }}
      />
      
      <span className="relative z-10 flex items-center gap-2">
        {/* Check indicator */}
        <span className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-200 border",
          tracker.checked 
            ? "bg-emerald-400 text-black border-emerald-400" 
            : "bg-transparent text-white/30 border-white/20"
        )}>
          {tracker.checked ? <Check className="w-3 h-3" /> : '○'}
        </span>
        
        {/* Emoji with bounce */}
        <span className={cn(
          "transition-transform duration-200",
          isAnimating && tracker.checked && "scale-125"
        )}>
          {tracker.emoji}
        </span>
        
        {/* Label */}
        <span className={cn(
          "transition-all duration-200",
          tracker.checked && "font-medium text-white"
        )}>
          {tracker.label}
        </span>
      </span>
      
      {/* Subtle pulse when checked */}
      {tracker.checked && (
        <span className="absolute inset-0 rounded-xl animate-pulse opacity-20 bg-emerald-400/10" />
      )}
    </button>
  );
}

function WaterScaleTracker({ 
  tracker, 
  onScaleChange 
}: { 
  tracker: LifeTracker; 
  onScaleChange: (id: TrackerId, value: number) => void;
}) {
  const droplets = tracker.scaleValue || 0;
  
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-white/15 bg-black/20">
      <div className="flex items-center gap-2">
        <span className="text-sm">{tracker.emoji}</span>
        <span className="text-xs text-white/60 lowercase">{tracker.label}</span>
        <span className="text-xs text-white/30 ml-auto">{droplets}/5</span>
      </div>
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onScaleChange(tracker.id, level === droplets ? 0 : level)}
            className={cn(
              "flex-1 h-8 rounded-lg transition-all duration-200 flex items-center justify-center",
              level <= droplets
                ? "bg-cyan-500/30 border border-cyan-400/50 text-cyan-300"
                : "bg-white/5 border border-white/10 text-white/20 hover:bg-white/10"
            )}
          >
            <Droplets className={cn(
              "w-4 h-4 transition-all",
              level <= droplets ? "fill-current" : ""
            )} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function HygieneLifeTracker({ date, onChange, className }: HygieneLifeTrackerProps) {
  const storageKey = `pkm:life-trackers:${date || new Date().toISOString().split('T')[0]}`;
  
  const [trackers, setTrackers] = useState<LifeTracker[]>(() => {
    const saved = localStorage.getItem(storageKey);
    const initialChecked: Record<string, boolean> = saved ? JSON.parse(saved).checked || {} : {};
    const initialScales: Record<string, number> = saved ? JSON.parse(saved).scales || {} : {};
    
    return DEFAULT_TRACKERS.map(t => ({
      ...t,
      checked: initialChecked[t.id] || false,
      scaleValue: t.type === 'scale' ? (initialScales[t.id] || 0) : undefined
    }));
  });
  
  // Persist to localStorage
  useEffect(() => {
    const checked: Record<string, boolean> = {};
    const scales: Record<string, number> = {};
    
    trackers.forEach(t => {
      checked[t.id] = t.checked;
      if (t.type === 'scale' && t.scaleValue !== undefined) {
        scales[t.id] = t.scaleValue;
      }
    });
    
    localStorage.setItem(storageKey, JSON.stringify({ checked, scales }));
    onChange?.(trackers);
  }, [trackers, storageKey, onChange]);
  
  const toggleTracker = (id: TrackerId) => {
    setTrackers(prev => prev.map(t => 
      t.id === id ? { ...t, checked: !t.checked } : t
    ));
  };
  
  const setScaleValue = (id: TrackerId, value: number) => {
    setTrackers(prev => prev.map(t => 
      t.id === id ? { ...t, scaleValue: value, checked: value > 0 } : t
    ));
  };
  
  const hygieneTrackers = trackers.filter(t => t.category === 'hygiene');
  const healthTrackers = trackers.filter(t => t.category === 'health');
  const waterTracker = trackers.find(t => t.category === 'water');
  const wellnessTrackers = trackers.filter(t => t.category === 'wellness');
  
  // Calculate progress for each section
  const hygieneProgress = hygieneTrackers.filter(t => t.checked).length;
  const healthProgress = healthTrackers.filter(t => t.checked).length;
  const wellnessProgress = wellnessTrackers.filter(t => t.checked).length;
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Hygiene Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-white/30 lowercase">hygiene</span>
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${(hygieneProgress / hygieneTrackers.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/30 tabular-nums">
            {hygieneProgress}/{hygieneTrackers.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {hygieneTrackers.map(t => (
            <ToggleTracker key={t.id} tracker={t} onToggle={toggleTracker} />
          ))}
        </div>
      </div>
      
      {/* Health Basics */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-white/30 lowercase">health basics</span>
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-500"
              style={{ width: `${(healthProgress / healthTrackers.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/30 tabular-nums">
            {healthProgress}/{healthTrackers.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {healthTrackers.map(t => (
            <ToggleTracker key={t.id} tracker={t} onToggle={toggleTracker} />
          ))}
        </div>
      </div>
      
      {/* Water Scale */}
      {waterTracker && (
        <WaterScaleTracker 
          tracker={waterTracker} 
          onScaleChange={setScaleValue}
        />
      )}
      
      {/* Movement/Wellness - progressive disclosure style */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-white/30 lowercase">movement</span>
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
              style={{ width: `${(wellnessProgress / wellnessTrackers.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/30 tabular-nums">
            {wellnessProgress}/{wellnessTrackers.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {wellnessTrackers.map(t => (
            <ToggleTracker key={t.id} tracker={t} onToggle={toggleTracker} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for external access to tracker data
export function useLifeTrackers(date?: string) {
  const storageKey = `pkm:life-trackers:${date || new Date().toISOString().split('T')[0]}`;
  
  const getTrackers = (): LifeTracker[] => {
    const saved = localStorage.getItem(storageKey);
    const initialChecked: Record<string, boolean> = saved ? JSON.parse(saved).checked || {} : {};
    const initialScales: Record<string, number> = saved ? JSON.parse(saved).scales || {} : {};
    
    return DEFAULT_TRACKERS.map(t => ({
      ...t,
      checked: initialChecked[t.id] || false,
      scaleValue: t.type === 'scale' ? (initialScales[t.id] || 0) : undefined
    }));
  };
  
  const hasChecked = (ids: TrackerId[]): boolean => {
    const trackers = getTrackers();
    return ids.every(id => trackers.find(t => t.id === id)?.checked);
  };
  
  const getScaleValue = (id: TrackerId): number => {
    const trackers = getTrackers();
    return trackers.find(t => t.id === id)?.scaleValue || 0;
  };
  
  const getCompletedCount = (): number => {
    const trackers = getTrackers();
    return trackers.filter(t => t.checked).length;
  };
  
  return { getTrackers, hasChecked, getScaleValue, getCompletedCount, storageKey };
}
