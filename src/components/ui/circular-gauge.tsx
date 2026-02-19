import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

// google font: varela round should be loaded in index.html or global css
// assuming it is available as 'font-varela' or similar utility.

interface CircularGaugeProps {
  Title: String;
  totalSeconds: number; // e.g. 1500 for Pomodoro (25m)
  color?: String; // Default var(--primary)
  className?: String;
}

export function CircularGauge({ Title, totalSeconds, color = 'var(--primary)', className }: CircularGaugeProps) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
  let interval: NodeJS.Timeout | undefined;
  let rafId: number | undefined;

  if (isActive && timeLeft > 0) {
    interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
  } else if (timeLeft === 0 && isActive) {
    rafId = requestAnimationFrame(() => setIsActive(false));
  }

  return () => {
    if (interval) clearInterval(interval);
    if (rafId) cancelAnimationFrame(rafId);
  };
  }, [isActive, timeLeft]);

  const progress = timeLeft / totalSeconds;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
  setIsActive(false);
  setTimeLeft(totalSeconds);
  };

  const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
  <div className={cn("flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 w-fit", className)}>
  <div className="relative w-32 h-32 flex items-center justify-center">
 {/* track */}
 <svg className="w-full h-full transform -rotate-90">
 <circle
 cx="64"
 cy="64"
 r={radius}
 stroke="currentColor"
 strokeWidth="8"
 fill="transparent"
 className="text-white/10"
 />
 {/* progress */}
 <motion.circle
 cx="64"
 cy="64"
 r={radius}
 stroke={color}
 strokeWidth="8"
 fill="transparent"
 strokeDasharray={circumference}
 animate={{ strokeDashoffset: offset }}
 transition={{ duration: 1, ease: "linear" }}
 strokeLinecap="round"
 />
 </svg>

 {/* time display */}
 <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
 <span className="text-2xl font-bold font-varela ">{formatTime(timeLeft)}</span>
 <span className="text-[10px] text-white/50 ">{Title}</span>
 </div>
  </div>

  {/* controls */}
  <div className="flex items-center gap-4 mt-2">
 <button
 onClick={toggleTimer}
 className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
 >
 {isactive ? <Pause size={16} /> : <Play size={16} />}
 </button>
 <button
 onClick={resetTimer}
 className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
 >
 <RotateCcw size={16} />
 </button>
  </div>
  </div>
  );
}
