import React from 'react';
import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';

interface MoodRingWidgetProps {
  className?: string;
  onMoodSelect?: (mood: number) => void;
}

const MOOD_IMAGES = [
  '/images/moods/terrible.png',
  '/images/moods/bad.png',
  '/images/moods/fine.png',
  '/images/moods/good.png',
  '/images/moods/excellent.png',
];

const MOOD_LABELS = ['terrible', 'bad', 'fine', 'good', 'excellent'];

export function MoodRingWidget({ className, onMoodSelect }: MoodRingWidgetProps) {
  const handleMoodClick = (moodIndex: number) => {
    // Log mood via event for journal to handle
    window.dispatchEvent(new CustomEvent('quick-mood-log', { detail: { mood: moodIndex + 1 } }));
    onMoodSelect?.(moodIndex + 1);
  };

  return (
    <div className={cn("p-4 rounded-xl bg-black/80 border border-violet-500/30", className)}>
      <div className="text-center mb-3">
        <p className="text-sm font-medium text-white/80 lowercase">quick mood</p>
        <p className="text-xs text-white/40 lowercase">tap to log</p>
      </div>

      <div className="flex justify-center items-center gap-2">
        {MOOD_IMAGES.map((img, i) => (
          <button
            key={i}
            onClick={() => handleMoodClick(i)}
            className="group relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400/50 transition-all"
            title={MOOD_LABELS[i]}
          >
            <img 
              src={img} 
              alt={MOOD_LABELS[i]}
              className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ))}
      </div>

      <p className="text-[10px] text-white/30 lowercase text-center mt-3">
        logs to today's journal
      </p>
    </div>
  );
}
