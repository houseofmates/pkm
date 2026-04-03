import React from 'react';
import { Heart, Zap, Smile, Sparkles } from 'lucide-react';
import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';

interface PetStatusWidgetProps {
  className?: string;
}

export function PetStatusWidget({ className }: PetStatusWidgetProps) {
  const { pets } = useGamificationStore();
  const wilson = pets[0];

  if (!wilson) {
    return (
      <div className={cn("p-4 rounded-xl bg-black/80 border border-pink-500/30", className)}>
        <p className="text-sm text-white/40 lowercase text-center">no pet data</p>
      </div>
    );
  }

  const stats = [
    { label: 'hunger', value: wilson.hunger, icon: <Zap className="w-3 h-3" />, color: 'text-yellow-400', bg: 'bg-yellow-400' },
    { label: 'happiness', value: wilson.happiness, icon: <Smile className="w-3 h-3" />, color: 'text-green-400', bg: 'bg-green-400' },
    { label: 'energy', value: wilson.energy, icon: <Sparkles className="w-3 h-3" />, color: 'text-blue-400', bg: 'bg-blue-400' },
    { label: 'cleanliness', value: wilson.cleanliness, icon: <Heart className="w-3 h-3" />, color: 'text-pink-400', bg: 'bg-pink-400' },
  ];

  return (
    <div className={cn("p-4 rounded-xl bg-black/80 border border-pink-500/30", className)}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{wilson.emoji}</span>
        <div>
          <p className="text-sm font-medium text-white/80 lowercase">{wilson.name}</p>
          <p className="text-xs text-white/40 lowercase">{wilson.visualState}</p>
        </div>
      </div>

      <div className="space-y-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <div className={cn("w-4", stat.color)}>{stat.icon}</div>
            <span className="text-xs text-white/40 lowercase w-16">{stat.label}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", stat.bg)}
                style={{ width: `${stat.value}%` }}
              />
            </div>
            <span className="text-xs text-white/60 w-8 text-right">{Math.round(stat.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
