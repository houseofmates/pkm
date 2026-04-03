import React from 'react';
import { Smile, Frown, Meh, ThumbsUp, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GamificationMoodWidgetProps {
  className?: string;
}

const MOODS = [
  { id: 1, label: 'terrible', icon: <Frown className="w-5 h-5" />, color: '#ef4444', bg: 'bg-red-500/20' },
  { id: 2, label: 'bad', icon: <Meh className="w-5 h-5" />, color: '#f97316', bg: 'bg-orange-500/20' },
  { id: 3, label: 'fine', icon: <Smile className="w-5 h-5" />, color: '#eab308', bg: 'bg-yellow-500/20' },
  { id: 4, label: 'good', icon: <ThumbsUp className="w-5 h-5" />, color: '#22c55e', bg: 'bg-green-500/20' },
  { id: 5, label: 'excellent', icon: <Heart className="w-5 h-5" />, color: '#8b5cf6', bg: 'bg-violet-500/20' },
];

export function GamificationMoodWidget({ className }: GamificationMoodWidgetProps) {
  const handleMoodClick = (moodId: number) => {
    // Dispatch event for journal to capture
    window.dispatchEvent(new CustomEvent('quick-mood-log', { 
      detail: { mood: moodId } 
    }));
    
    const mood = MOODS.find(m => m.id === moodId);
    toast.success(`Mood logged: ${mood?.label}`);
  };

  return (
    <div className={cn(
      "p-4 rounded-xl bg-black/80 border border-violet-500/30",
      className
    )}>
      <div className="text-center mb-3">
        <p className="text-sm font-medium text-white/80 lowercase">how are you?</p>
        <p className="text-xs text-white/40 lowercase">tap to log mood</p>
      </div>

      <div className="flex justify-center items-center gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            onClick={() => handleMoodClick(mood.id)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              "hover:scale-110 border border-white/10 hover:border-white/30",
              mood.bg
            )}
            style={{ color: mood.color }}
            title={mood.label}
          >
            {mood.icon}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-white/30 lowercase text-center mt-3">
        logs to journal
      </p>
    </div>
  );
}
