import { useMemo, useEffect, useState } from 'react';
import { CalendarDays, Activity } from 'lucide-react';
import { useRecords } from '@/hooks/use-records';
import { cn } from '@/lib/utils';

interface ContinuityMapProps {
  data?: {
    collectionName?: string;
    activityType?: string;
    months?: number;
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const THEME_COLOR = '#f6b012';

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function ContinuityMap({ data }: ContinuityMapProps) {
  const collectionName = data?.collectionName || 'activity_logs';
  const activityType = data?.activityType;
  const monthsToShow = data?.months || 6;
  
  const { records, refresh } = useRecords(collectionName);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // calculate date range
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - monthsToShow);
    start.setDate(1); // Start from first day of the month
    return { start, end };
  }, [monthsToShow]);

  // process activity data into daily buckets
  const activityData = useMemo(() => {
    if (!records) return new Map<string, number>();

    const dataMap = new Map<string, number>();
    
    records.forEach((record: any) => {
      const timestamp = record.timestamp || record.created_at;
      if (!timestamp) return;
      
      // filter by activity type if specified
      if (activityType && record.type !== activityType && record.activity_type !== activityType) {
        return;
      }
      
      const date = timestamp.split('T')[0];
      dataMap.set(date, (dataMap.get(date) || 0) + 1);
    });

    return dataMap;
  }, [records, activityType]);

  // generate calendar grid data
  const calendarData = useMemo(() => {
    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];

    const { start, end } = dateRange;
    const current = new Date(start);

    // align to sunday
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() - 1);
    }

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const count = activityData.get(dateStr) || 0;
      
      // calculate intensity level
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) level = 1;
      if (count >= 2) level = 2;
      if (count >= 4) level = 3;
      if (count >= 6) level = 4;

      currentWeek.push({
        date: dateStr,
        count,
        level,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [activityData, dateRange]);

  // calculate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; index: number }[] = [];
    const seen = new Set<string>();
    
    calendarData.forEach((week, weekIndex) => {
      week.forEach(day => {
        const date = new Date(day.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!seen.has(monthKey)) {
          seen.add(monthKey);
          labels.push({
            month: date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(),
            index: weekIndex,
          });
        }
      });
    });

    return labels;
  }, [calendarData]);

  // calculate stats
  const stats = useMemo(() => {
    const totalDays = calendarData.flat().length;
    const activeDays = calendarData.flat().filter(d => d.count > 0).length;
    const maxStreak = (() => {
      let max = 0;
      let current = 0;
      calendarData.flat().forEach(day => {
        if (day.count > 0) {
          current++;
          max = Math.max(max, current);
        } else {
          current = 0;
        }
      });
      return max;
    })();

    return { totalDays, activeDays, maxStreak };
  }, [calendarData]);

  // color intensity function
  const getIntensityColor = (level: number): string => {
    const baseColor = THEME_COLOR;
    switch (level) {
      case 0: return 'rgba(255, 255, 255, 0.05)';
      case 1: return `${baseColor}20`; // 12.5% opacity
      case 2: return `${baseColor}40`; // 25% opacity
      case 3: return `${baseColor}70`; // 44% opacity
      case 4: return baseColor; // 100%
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse text-white/40 text-xs lowercase">loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full rounded-xl overflow-hidden flex flex-col p-3"
      style={{ 
        background: '#050505',
        border: `1px solid ${THEME_COLOR}20`,
      }}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: THEME_COLOR }} />
          <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
            {activityType ? `${activityType} activity` : 'activity density'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] lowercase text-white/40">
          <span>{stats.activeDays} active days</span>
          <span>max streak: {stats.maxStreak}</span>
        </div>
      </div>

      {/* month labels */}
      <div className="flex ml-6 mb-1">
        {monthLabels.map((label, i) => (
          <div
            key={i}
            className="text-[9px] lowercase"
            style={{ 
              color: 'rgba(255, 255, 255, 0.5)',
              marginLeft: i === 0 ? 0 : `${label.index * 14}px`,
            }}
          >
            {label.month}
          </div>
        ))}
      </div>

      {/* heatmap grid */}
      <div className="flex gap-[2px] overflow-x-auto">
        {/* day of week labels */}
        <div className="flex flex-col gap-[2px] mr-1">
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, i) => (
            <div 
              key={day}
              className="text-[8px] lowercase h-[10px] flex items-center"
              style={{ color: 'rgba(255, 255, 255, 0.3)' }}
            >
              {i % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* weeks */}
        <div className="flex gap-[2px]">
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="w-[10px] h-[10px] rounded-sm transition-all hover:scale-110"
                  style={{
                    backgroundColor: getIntensityColor(day.level),
                  }}
                  title={`${day.date}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
        <span className="text-[9px] lowercase text-white/30">less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="w-[10px] h-[10px] rounded-sm"
            style={{ backgroundColor: getIntensityColor(level) }}
          />
        ))}
        <span className="text-[9px] lowercase text-white/30">more</span>
      </div>
    </div>
  );
}
