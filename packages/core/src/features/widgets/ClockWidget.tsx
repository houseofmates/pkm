import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClockWidgetProps {
  data: {
    format?: string;
    color?: string;
    backgroundColor?: string;
  };
  className?: string;
}

export function ClockWidget({ data, className }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());
  const fmt = data.format || "EEE, MMM d, ''yy";
  const color = data.color || '#f6b012';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center justify-center h-full w-full rounded-xl select-none transition-all",
        className
      )}
      style={{
        color: color,
        backgroundColor: data.backgroundColor || 'rgba(0,0,0,0.2)',
        fontFamily: '"Varela Round", sans-serif'
      }}
    >
      <span className="text-4xl md:text-5xl font-bold lowercase tracking-tight drop-shadow-md">
        {format(time, fmt).toLowerCase()}
      </span>
    </div>
  );
}
