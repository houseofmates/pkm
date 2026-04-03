import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Square, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActivityTip {
  id: string;
  text: string;
  category: string;
  emoji: string;
}

// category-specific tips database
export const ACTIVITY_TIPS: ActivityTip[] = [
  // dental hygiene
  { id: 'floss-1', category: 'dental', emoji: '🦷', text: 'water flossing removes 99.9% of plaque from treated areas' },
  { id: 'floss-2', category: 'dental', emoji: '🚿', text: 'flossing before brushing increases fluoride effectiveness' },
  { id: 'floss-3', category: 'dental', emoji: '✨', text: 'consistent flossing reduces gum disease risk by 40%' },
  { id: 'floss-4', category: 'dental', emoji: '🔬', text: 'oral bacteria can enter bloodstream - flossing protects your heart' },
  { id: 'brush-1', category: 'dental', emoji: '🪥', text: 'two minutes of brushing removes up to 85% of surface plaque' },
  { id: 'brush-2', category: 'dental', emoji: '⏱️', text: 'most people only brush for 45 seconds - aim for the full two' },
  { id: 'brush-3', category: 'dental', emoji: '🌙', text: 'brushing before bed is the most important session of the day' },
  
  // meditation / mindfulness
  { id: 'meditate-1', category: 'mindfulness', emoji: '🧠', text: '8 weeks of meditation changes brain structure measurably' },
  { id: 'meditate-2', category: 'mindfulness', emoji: '💆', text: 'meditation reduces cortisol levels by up to 23%' },
  { id: 'meditate-3', category: 'mindfulness', emoji: '🌊', text: 'focused breathing activates the parasympathetic nervous system' },
  { id: 'meditate-4', category: 'mindfulness', emoji: '🎯', text: 'even 5 minutes improves sustained attention for 24 hours' },
  { id: 'meditate-5', category: 'mindfulness', emoji: '😴', text: 'meditation practitioners report 50% better sleep quality' },
  { id: 'meditate-6', category: 'mindfulness', emoji: '💪', text: 'mindfulness strengthens emotional regulation like a muscle' },
  
  // exercise / movement
  { id: 'exercise-1', category: 'movement', emoji: '❤️', text: 'one workout session boosts immune function for 24 hours' },
  { id: 'exercise-2', category: 'movement', emoji: '🧠', text: 'exercise increases bdnf - fertilizer for brain cell growth' },
  { id: 'exercise-3', category: 'movement', emoji: '🏃', text: 'just 20 minutes of movement improves cognitive performance' },
  { id: 'exercise-4', category: 'movement', emoji: '💪', text: 'strength training reduces all-cause mortality by 21%' },
  { id: 'exercise-5', category: 'movement', emoji: '⚡', text: 'your body produces endocannabinoids - natural mood boosters' },
  { id: 'exercise-6', category: 'movement', emoji: '🦴', text: 'weight-bearing exercises increase bone density at any age' },
  
  // hydration
  { id: 'hydrate-1', category: 'hydration', emoji: '💧', text: 'the brain is 75% water - even mild dehydration impairs cognition' },
  { id: 'hydrate-2', category: 'hydration', emoji: '🧪', text: 'water carries nutrients and oxygen to every cell' },
  { id: 'hydrate-3', category: 'hydration', emoji: '🔥', text: 'proper hydration increases metabolic rate by up to 30%' },
  { id: 'hydrate-4', category: 'hydration', emoji: '💆', text: 'joints are 80% water - hydration keeps them lubricated' },
  
  // reading / learning
  { id: 'learn-1', category: 'learning', emoji: '📚', text: 'reading fiction increases empathy and theory of mind' },
  { id: 'learn-2', category: 'learning', emoji: '🧠', text: 'learning new skills creates new neural pathways at any age' },
  { id: 'learn-3', category: 'learning', emoji: '🎯', text: 'spaced repetition beats cramming by 200% for retention' },
  { id: 'learn-4', category: 'learning', emoji: '💡', text: 'teaching what you learn improves your own understanding' },
  
  // sleep
  { id: 'sleep-1', category: 'sleep', emoji: '🧹', text: 'sleep is when your brain clears toxic metabolic waste' },
  { id: 'sleep-2', category: 'sleep', emoji: '📊', text: 'sleep deprivation affects cognition like 0.08% blood alcohol' },
  { id: 'sleep-3', category: 'sleep', emoji: '💪', text: 'muscle repair happens during deep sleep stages' },
  { id: 'sleep-4', category: 'sleep', emoji: '🧬', text: 'sleep regulates genes involved in stress and immunity' },
  
  // nutrition
  { id: 'nutrition-1', category: 'nutrition', emoji: '🥬', text: 'fiber feeds your gut microbiome - your second brain' },
  { id: 'nutrition-2', category: 'nutrition', emoji: '⚡', text: 'protein at every meal maintains steady energy levels' },
  { id: 'nutrition-3', category: 'nutrition', emoji: '🧠', text: 'omega-3s make up 30% of brain cell membranes' },
  { id: 'nutrition-4', category: 'nutrition', emoji: '🌈', text: 'colorful plants contain unique antioxidant compounds' },
  
  // social
  { id: 'social-1', category: 'social', emoji: '💬', text: 'social connection is as vital as food and water' },
  { id: 'social-2', category: 'social', emoji: '🤝', text: 'quality time reduces inflammation markers in the body' },
  { id: 'social-3', category: 'social', emoji: '🧠', text: 'social interaction stimulates multiple brain regions' },
  { id: 'social-4', category: 'social', emoji: '💪', text: 'strong relationships increase lifespan by 50%' },
  
  // medication
  { id: 'meds-1', category: 'medication', emoji: '💊', text: 'consistent timing improves medication effectiveness' },
  { id: 'meds-2', category: 'medication', emoji: '📊', text: 'tracking helps identify patterns and side effects' },
  { id: 'meds-3', category: 'medication', emoji: '✅', text: 'medication adherence improves outcomes by 70%' },
  { id: 'meds-4', category: 'medication', emoji: '🌞', text: 'morning meds often work better with circadian rhythms' },
  
  // creative
  { id: 'creative-1', category: 'creative', emoji: '🎨', text: 'creative flow states reduce anxiety and depression' },
  { id: 'creative-2', category: 'creative', emoji: '🧠', text: 'making art activates the brain\'s reward pathway' },
  { id: 'creative-3', category: 'creative', emoji: '✨', text: 'creative practice builds problem-solving neural networks' },
  { id: 'creative-4', category: 'creative', emoji: '🎯', text: 'completion of creative work releases dopamine' },
  
  // hygiene
  { id: 'hygiene-1', category: 'hygiene', emoji: '🚿', text: 'warm showers increase oxytocin - the bonding hormone' },
  { id: 'hygiene-2', category: 'hygiene', emoji: '🧴', text: 'skin is your largest organ - care matters' },
  { id: 'hygiene-3', category: 'hygiene', emoji: '🦶', text: 'foot care prevents issues that cascade systemically' },
  { id: 'hygiene-4', category: 'hygiene', emoji: '✨', text: 'grooming rituals signal self-respect to your brain' },
];

// get tips by category
export function getTipsByCategory(category: string): ActivityTip[] {
  return ACTIVITY_TIPS.filter(tip => tip.category === category);
}

// map activity types to tip categories
export function mapActivityToCategory(activityId: string): string {
  const mapping: Record<string, string> = {
    'water_floss': 'dental',
    'brush_teeth': 'dental',
    'wash_face': 'hygiene',
    'shower': 'hygiene',
    'nail_care': 'hygiene',
    'body_wipe': 'hygiene',
    'meditation': 'mindfulness',
    'worship': 'mindfulness',
    'exercise': 'movement',
    'upper': 'movement',
    'core': 'movement',
    'legs': 'movement',
    'cardio': 'movement',
    'stretch': 'movement',
    'hydrate': 'hydration',
    'read': 'learning',
    'study': 'learning',
    'vibecode': 'learning',
    'sleep': 'sleep',
    'nap': 'sleep',
    'eat_meal': 'nutrition',
    'int_w_family': 'social',
    'online_social_int': 'social',
    'draw': 'creative',
    'paint': 'creative',
    'play_a_game': 'creative',
    'meds_morning': 'medication',
    'meds_afternoon': 'medication',
    'meds_night': 'medication',
    'take_pills': 'medication',
  };
  
  return mapping[activityId] || 'general';
}

export interface FactBufferProps {
  activityId: string;
  activityName: string;
  activityEmoji: string;
  category?: string;
  targetDuration?: number; // target duration in seconds, null for no target
  onComplete?: (duration: number, notes: string, metrics: Record<string, number>) => void;
  onCancel?: () => void;
  className?: string;
}

export function FactBuffer({
  activityId,
  activityName,
  activityEmoji,
  category: propCategory,
  targetDuration,
  onComplete,
  onCancel,
  className,
}: FactBufferProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [intensity, setIntensity] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const category = propCategory || mapActivityToCategory(activityId);
  const tips = getTipsByCategory(category);
  const currentTip = tips[currentTipIndex % tips.length];
  
  // cycle through tips every 8 seconds
  useEffect(() => {
    if (!isRunning || isPaused) return;
    
    const tipInterval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % tips.length);
    }, 8000);
    
    return () => clearInterval(tipInterval);
  }, [isRunning, isPaused, tips.length]);
  
  // timer
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          // auto-stop if target reached
          if (targetDuration && next >= targetDuration) {
            setIsRunning(false);
            onComplete?.(next, notes, { intensity, duration: next });
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, targetDuration, onComplete, notes, intensity]);
  
  const handleStart = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setElapsed(0);
  }, []);
  
  const handlePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);
  
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    onComplete?.(elapsed, notes, { intensity, duration: elapsed });
  }, [elapsed, notes, intensity, onComplete]);
  
  const handleCancel = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setElapsed(0);
    onCancel?.();
  }, [onCancel]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progressPercent = targetDuration 
    ? Math.min((elapsed / targetDuration) * 100, 100) 
    : 0;
  
  // idle state - show start button
  if (!isRunning && elapsed === 0) {
    return (
      <div className={cn(
        "p-6 rounded-2xl border border-[#f5af12]/30 bg-[#050505] relative overflow-hidden",
        className
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#f5af12]/5 to-[#3c9fdd]/5 pointer-events-none" />
        
        <div className="relative z-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#f5af12]/10 flex items-center justify-center">
            <span className="text-3xl">{activityEmoji}</span>
          </div>
          
          <div>
            <p className="text-lg text-white lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
              {activityName}
            </p>
            <p className="text-xs text-white/40 lowercase mt-1">
              {targetDuration ? `target: ${formatTime(targetDuration)}` : 'start timer to begin'}
            </p>
          </div>
          
          <button
            onClick={handleStart}
            className="w-full py-3 rounded-xl bg-[#f5af12] hover:bg-[#f5af12]/90 text-[#050505] lowercase font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Play size={18} fill="currentColor" />
            start session
          </button>
        </div>
      </div>
    );
  }
  
  // running state - show timer and fact buffer
  return (
    <div className={cn(
      "p-6 rounded-2xl border-2 border-[#f5af12]/50 bg-[#050505] relative overflow-hidden",
      className
    )}>
      {/* animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5af12]/10 via-transparent to-[#3c9fdd]/10 animate-pulse pointer-events-none" />
      
      {/* progress bar at top */}
      {targetDuration && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-[#f5af12] to-[#3c9fdd] transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      
      <div className="relative z-10 space-y-6">
        {/* header: activity + timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activityEmoji}</span>
            <span className="text-white lowercase" style={{ fontFamily: 'Varela Round, sans-serif' }}>
              {activityName}
            </span>
          </div>
          <div className="text-3xl font-bold text-[#f5af12] tabular-nums" style={{ fontFamily: 'Varela Round, sans-serif' }}>
            {formatTime(elapsed)}
          </div>
        </div>
        
        {/* fact buffer - the loading screen style tips */}
        <div className="relative min-h-[120px] p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="absolute top-2 right-2">
            <Sparkles size={16} className="text-[#3c9fdd] animate-pulse" />
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-2xl">{currentTip?.emoji || '💡'}</span>
            <div className="flex-1">
              <p className="text-[10px] text-[#3c9fdd] uppercase tracking-wider mb-1">
                did you know?
              </p>
              <p 
                className="text-sm text-white/90 lowercase leading-relaxed transition-opacity duration-500"
                style={{ fontFamily: 'Varela Round, sans-serif' }}
                key={currentTipIndex}
              >
                {currentTip?.text || 'stay consistent - small habits compound over time'}
              </p>
            </div>
          </div>
          
          {/* tip progress dots */}
          <div className="flex gap-1 mt-3">
            {tips.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  idx === (currentTipIndex % 5) ? "bg-[#f5af12]" : "bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
        
        {/* intensity slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 lowercase">intensity / volume</span>
            <span className="text-xs text-[#f5af12] tabular-nums">{intensity}</span>
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
        
        {/* quick notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="quick notes..."
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 resize-none focus:outline-none focus:border-[#3c9fdd]/50"
          style={{ fontFamily: 'Varela Round, sans-serif' }}
          rows={2}
        />
        
        {/* controls */}
        <div className="flex gap-2">
          <button
            onClick={handlePause}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white lowercase transition-colors flex items-center justify-center gap-2"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
            {isPaused ? 'resume' : 'pause'}
          </button>
          <button
            onClick={handleStop}
            className="flex-1 py-2.5 rounded-xl bg-[#3c9fdd] hover:bg-[#3c9fdd]/90 text-white lowercase transition-colors flex items-center justify-center gap-2"
          >
            <Square size={16} fill="currentColor" />
            finish
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 lowercase transition-colors"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default FactBuffer;
