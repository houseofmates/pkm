import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface CoverageHeatmapProps {
  // 7 days of data, most recent last
  days: Array<{
    date: string;
    mood: number;
    body: number;
    mind: number;
    finance: number;
    social: number;
    hasEntry: boolean;
  }>;
  className?: string;
}

const CATEGORY_COLORS = {
  mood: 'rgb(244, 114, 182)',    // pink-400
  body: 'rgb(96, 165, 250)',    // blue-400
  mind: 'rgb(167, 139, 250)',    // purple-400
  finance: 'rgb(74, 222, 128)',  // green-400
  social: 'rgb(251, 146, 60)',   // orange-400
};

export function CoverageHeatmap({ days, className }: CoverageHeatmapProps) {
  const weekDays = useMemo(() => {
    // ensure we have exactly 7 days
    const padded = [...days];
    while (padded.length < 7) {
      padded.unshift({
        date: '',
        mood: 0,
        body: 0,
        mind: 0,
        finance: 0,
        social: 0,
        hasEntry: false,
      });
    }
    return padded.slice(-7);
  }, [days]);

  const getDayLabel = (dateStr: string, index: number) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) return 'today';
    return date.toLocaleDateString('en-US', { weekday: 'narrow' }).toLowerCase();
  };

  const calculateCoverage = (day: typeof weekDays[0]) => {
    if (!day.hasEntry) return 0;
    return Math.round((day.mood + day.body + day.mind + day.finance + day.social) / 5);
  };

  const getCellColor = (day: typeof weekDays[0]) => {
    if (!day.hasEntry) return 'rgba(255,255,255,0.03)';
    
    const coverage = calculateCoverage(day);
    // gradient from dim to bright based on coverage
    const alpha = 0.2 + (coverage / 100) * 0.8;
    return `rgba(34, 197, 94, ${alpha})`;
  };

  const getCellBorder = (day: typeof weekDays[0]) => {
    if (!day.hasEntry) return 'transparent';
    const coverage = calculateCoverage(day);
    if (coverage >= 80) return 'rgba(74, 222, 128, 0.6)';
    if (coverage >= 50) return 'rgba(250, 204, 21, 0.4)';
    return 'rgba(255,255,255,0.1)';
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* header with average */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 lowercase">7-day coverage</span>
        <span className="text-xs text-white/60">
          {Math.round(weekDays.reduce((acc, d) => acc + calculateCoverage(d), 0) / 7)}% avg
        </span>
      </div>
      
      {/* heatmap grid */}
      <div className="flex gap-1">
        {weekDays.map((day, i) => {
          const coverage = calculateCoverage(day);
          const label = getDayLabel(day.date, i);
          const isToday = label === 'today';
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full aspect-square rounded-md transition-all duration-300 relative",
                  isToday && "ring-1 ring-white/30"
                )}
                style={{
                  backgroundColor: getCellColor(day),
                  border: `1px solid ${getCellBorder(day)}`,
                }}
                title={day.date ? `${day.date}: ${coverage}% coverage` : 'no data'}
              >
                {/* mini indicators for categories */}
                {day.hasEntry && (
                  <div className="absolute inset-1 grid grid-cols-2 grid-rows-3 gap-px">
                    <div 
                      className="rounded-sm" 
                      style={{ backgroundColor: CATEGORY_COLORS.mood, opacity: day.mood / 100 }}
                    />
                    <div 
                      className="rounded-sm" 
                      style={{ backgroundColor: CATEGORY_COLORS.body, opacity: day.body / 100 }}
                    />
                    <div 
                      className="rounded-sm" 
                      style={{ backgroundColor: CATEGORY_COLORS.mind, opacity: day.mind / 100 }}
                    />
                    <div 
                      className="rounded-sm" 
                      style={{ backgroundColor: CATEGORY_COLORS.finance, opacity: day.finance / 100 }}
                    />
                    <div 
                      className="rounded-sm col-span-2" 
                      style={{ backgroundColor: CATEGORY_COLORS.social, opacity: day.social / 100 }}
                    />
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[9px] lowercase",
                isToday ? "text-white/60" : "text-white/30"
              )}>
                {label || '·'}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* legend */}
      <div className="flex items-center justify-between text-[9px] text-white/30">
        <span>less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-white/5" />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.3)' }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.5)' }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 1)' }} />
        </div>
        <span>more</span>
      </div>
    </div>
  );
}
