import { useMemo, useEffect, useState } from 'react';
import { Droplets, Pill, Cat, TrendingUp, Check } from 'lucide-react';
import { useRecords } from '@/hooks/use-records';
import { cn } from '@/lib/utils';

interface StatusSummaryProps {
  data?: {
    collections?: Array<{ name: string; label: string; icon: string }>;
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const THEME_COLOR = '#f6b012';
const HYGIENE_COLOR = '#f6b012';
const MEDICATION_COLOR = '#3c9fdd';
const CAT_COLOR = '#a855f7';

interface StreakData {
  label: string;
  current: number;
  max: number;
  lastDate: string | null;
  icon: React.ReactNode;
  color: string;
}

export function StatusSummary({ data }: StatusSummaryProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // fetch records for each collection
  const { records: hygieneRecords } = useRecords('hygiene_logs');
  const { records: medicationRecords } = useRecords('medication_logs');
  const { records: catCareRecords } = useRecords('cat_care_logs');

  // calculate streaks
  const streaks = useMemo(() => {
    const calculateStreak = (records: any[] | null, type?: string): StreakData => {
      if (!records || records.length === 0) {
        return {
          label: type || 'activity',
          current: 0,
          max: 0,
          lastDate: null,
          icon: <TrendingUp className="w-4 h-4" />,
          color: THEME_COLOR,
        };
      }

      // sort by date descending
      const sorted = [...records].sort((a, b) => {
        const dateA = new Date(a.timestamp || a.created_at || 0);
        const dateB = new Date(b.timestamp || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // get unique dates
      const uniqueDates = new Set<string>();
      sorted.forEach(r => {
        const date = (r.timestamp || r.created_at || '').split('T')[0];
        if (date) uniqueDates.add(date);
      });
      const dates = Array.from(uniqueDates).sort().reverse();

      // calculate current streak
      let current = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // check if active today or yesterday
      if (dates[0] === today || dates[0] === yesterday) {
        current = 1;
        for (let i = 1; i < dates.length; i++) {
          const prevDate = new Date(dates[i - 1]);
          const currDate = new Date(dates[i]);
          const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);
          
          if (diffDays === 1) {
            current++;
          } else {
            break;
          }
        }
      }

      // calculate max streak
      let max = 0;
      let tempMax = 1;
      const sortedDates = Array.from(uniqueDates).sort();
      
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / 86400000);
        
        if (diffDays === 1) {
          tempMax++;
        } else {
          max = Math.max(max, tempMax);
          tempMax = 1;
        }
      }
      max = Math.max(max, tempMax);

      return {
        label: type || 'activity',
        current,
        max,
        lastDate: dates[0] || null,
        icon: <TrendingUp className="w-4 h-4" />,
        color: THEME_COLOR,
      };
    };

    return [
      {
        ...calculateStreak(hygieneRecords, 'hygiene'),
        icon: <Droplets className="w-4 h-4" />,
        color: HYGIENE_COLOR,
      },
      {
        ...calculateStreak(medicationRecords, 'medication'),
        icon: <Pill className="w-4 h-4" />,
        color: MEDICATION_COLOR,
      },
      {
        ...calculateStreak(catCareRecords, 'cat care'),
        icon: <Cat className="w-4 h-4" />,
        color: CAT_COLOR,
      },
    ];
  }, [hygieneRecords, medicationRecords, catCareRecords]);

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
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4" style={{ color: THEME_COLOR }} />
        <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
          unbroken streaks
        </span>
      </div>

      {/* streak list */}
      <div className="space-y-2 flex-1">
        {streaks.map((streak) => (
          <div
            key={streak.label}
            className="flex items-center justify-between p-2 rounded-lg"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: `${streak.color}20` }}
              >
                {streak.icon}
              </div>
              <div>
                <span className="text-xs lowercase block" style={{ color: '#ffffff' }}>
                  {streak.label}
                </span>
                {streak.lastDate && (
                  <span className="text-[9px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    last: {new Date(streak.lastDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    }).toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* current streak */}
              <div className="text-right">
                <span 
                  className="text-lg font-bold tabular-nums block"
                  style={{ color: streak.current > 0 ? streak.color : 'rgba(255, 255, 255, 0.3)' }}
                >
                  {streak.current}
                </span>
                <span className="text-[9px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  days
                </span>
              </div>

              {/* max streak indicator */}
              {streak.max > streak.current && (
                <div 
                  className="text-[10px] lowercase px-1.5 py-0.5 rounded"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}
                >
                  max: {streak.max}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* summary footer */}
      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-[10px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
          total active streaks
        </span>
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3" style={{ color: '#22c55e' }} />
          <span className="text-[10px] lowercase" style={{ color: '#22c55e' }}>
            {streaks.filter(s => s.current > 0).length} of {streaks.length}
          </span>
        </div>
      </div>
    </div>
  );
}
