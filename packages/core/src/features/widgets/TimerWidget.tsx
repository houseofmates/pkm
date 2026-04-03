import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, Play, Square, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { dataService } from '@/services/data.service';

interface TimerWidgetProps {
  data?: {
    activityName?: string;
    targetDuration?: number; // seconds
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const THEME_COLOR = '#f6b012';

export function TimerWidget({ data, onUpdate }: TimerWidgetProps) {
  const activityName = data?.activityName ?? 'activity';
  const targetDuration = data?.targetDuration ?? 1800; // default 30 min

  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (startTime) {
        const newElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(newElapsed);
        
        // check if target reached
        if (newElapsed >= targetDuration && !isComplete) {
          setIsComplete(true);
          toast.success(`${activityName} target reached!`, {
            icon: <Check className="w-4 h-4 text-[#22c55e]" />,
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime, targetDuration, activityName, isComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const startTimer = () => {
    setIsRunning(true);
    setStartTime(Date.now() - elapsed * 1000);
    setIsComplete(false);
  };

  const stopTimer = () => {
    setIsRunning(false);
    
    // emit completion if ran for meaningful duration
    if (elapsed > 60) {
      dataService.emitDataUpdate('timer_completed', {
        activity_name: activityName,
        duration: elapsed,
        target_duration: targetDuration
      });

      toast.success(`${activityName} logged: ${formatDuration(elapsed)}`, {
        icon: <Check className="w-4 h-4 text-[#22c55e]" />,
      });
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsed(0);
    setIsComplete(false);
  };

  const progressPercent = Math.min((elapsed / targetDuration) * 100, 100);

  return (
    <div 
      className="w-full h-full rounded-xl overflow-hidden flex flex-col"
      style={{ 
        background: '#050505',
        border: `1px solid ${THEME_COLOR}20`,
      }}
    >
      {/* header */}
      <div 
        className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{ 
          background: `linear-gradient(90deg, ${THEME_COLOR}10 0%, transparent 100%)`,
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" style={{ color: THEME_COLOR }} />
          <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
            {activityName}
          </span>
        </div>
        <span className="text-[10px] lowercase text-white/40">
          target: {formatDuration(targetDuration)}
        </span>
      </div>

      {/* timer display */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* progress ring */}
        <div className="relative w-24 h-24 mb-4">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={isComplete ? '#22c55e' : THEME_COLOR}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          
          {/* time in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className={cn(
                "text-2xl font-mono font-bold tabular-nums",
                isRunning && "animate-pulse"
              )}
              style={{ color: isComplete ? '#22c55e' : '#ffffff' }}
            >
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              size="sm"
              onClick={stopTimer}
              className="h-9 w-9 p-0 rounded-full"
              style={{ background: '#ef4444', color: '#ffffff' }}
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startTimer}
              disabled={elapsed > 0 && !isComplete}
              className="h-9 w-9 p-0 rounded-full"
              style={{ background: THEME_COLOR, color: '#000000' }}
            >
              <Play className="w-4 h-4 fill-current" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={resetTimer}
            className="h-9 w-9 p-0 rounded-full"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* status */}
        {isComplete && (
          <span className="mt-3 text-xs lowercase" style={{ color: '#22c55e' }}>
            target reached
          </span>
        )}
        {isRunning && !isComplete && (
          <span className="mt-3 text-xs lowercase text-white/40">
            {formatTime(targetDuration - elapsed)} remaining
          </span>
        )}
      </div>
    </div>
  );
}
