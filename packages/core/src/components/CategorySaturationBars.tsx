import { useGamificationStore, type CategorySaturation } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';

interface CategoryBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
  emptyHint?: string;
}

function CategoryBar({ label, value, color, icon, emptyHint }: CategoryBarProps) {
  const isEmpty = value === 0;
  const fillPercent = Math.min(100, Math.max(0, value));
  
  return (
    <div className="group relative">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className={cn(
          "text-xs lowercase transition-colors",
          isEmpty ? "text-white/20" : "text-white/60"
        )}>
          {label}
        </span>
        <span className={cn(
          "text-xs ml-auto tabular-nums",
          isEmpty ? "text-white/20" : "text-white/50"
        )}>
          {Math.round(fillPercent)}%
        </span>
      </div>
      
      {/* Bar container */}
      <div className={cn(
        "h-3 rounded-full overflow-hidden transition-all duration-300",
        isEmpty ? "bg-white/5 border border-white/10" : "bg-black/40 border border-white/10"
      )}>
        {/* Fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out relative",
            isEmpty && "opacity-0"
          )}
          style={{
            width: `${fillPercent}%`,
            background: `linear-gradient(90deg, ${color}40 0%, ${color} 100%)`,
            boxShadow: fillPercent > 0 ? `0 0 10px ${color}50` : 'none'
          }}
        >
          {/* Shimmer effect when filling */}
          {fillPercent > 0 && (
            <div 
              className="absolute inset-0 animate-pulse"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${color}60 50%, transparent 100%)`,
                animation: 'shimmer 2s infinite'
              }}
            />
          )}
        </div>
      </div>
      
      {/* Empty hint - shows as subtle ghost text */}
      {isEmpty && emptyHint && (
        <p className="text-[10px] text-white/10 lowercase mt-1 italic">
          {emptyHint}
        </p>
      )}
    </div>
  );
}

interface CategorySaturationBarsProps {
  className?: string;
}

export function CategorySaturationBars({ className }: CategorySaturationBarsProps) {
  const { saturation } = useGamificationStore();
  
  const categories: Array<{
    key: keyof CategorySaturation;
    label: string;
    color: string;
    icon: string;
    emptyHint: string;
  }> = [
    { 
      key: 'mood', 
      label: 'mood', 
      color: '#8b5cf6', // violet
      icon: '🎭',
      emptyHint: 'how are you feeling?'
    },
    { 
      key: 'body', 
      label: 'body', 
      color: '#22c55e', // green
      icon: '💪',
      emptyHint: 'movement, hygiene, health'
    },
    { 
      key: 'mind', 
      label: 'mind', 
      color: '#3b82f6', // blue
      icon: '🧠',
      emptyHint: 'journaling, creativity, learning'
    },
    { 
      key: 'social', 
      label: 'social', 
      color: '#f59e0b', // amber
      icon: '💬',
      emptyHint: 'connections, conversations'
    },
    { 
      key: 'finance', 
      label: 'creative', 
      color: '#ec4899', // pink
      icon: '🎨',
      emptyHint: 'projects, art, coding'
    },
  ];
  
  return (
    <div className={cn("p-4 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10", className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🌈</span>
        <span className="text-xs text-white/40 lowercase">daily saturation</span>
      </div>
      
      <div className="space-y-3">
        {categories.map((cat) => (
          <CategoryBar
            key={cat.key}
            label={cat.label}
            value={saturation[cat.key] || 0}
            color={cat.color}
            icon={cat.icon}
            emptyHint={cat.emptyHint}
          />
        ))}
      </div>
    </div>
  );
}
