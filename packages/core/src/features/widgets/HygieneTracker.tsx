import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Droplets, Check, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HygieneLog {
  id: string;
  type: 'shower' | 'brush' | 'skincare' | 'other';
  timestamp: Date;
  notes?: string;
}

interface HygieneTrackerProps {
  data?: {
    lastShower?: string;
    streak?: number;
  };
}

const hygieneTypes = [
  { id: 'shower', label: 'shower', icon: Droplets, color: '#3c9fdd' },
  { id: 'brush', label: 'brush', icon: Sparkles, color: '#f5af12' },
  { id: 'skincare', label: 'care', icon: Droplets, color: '#22c55e' },
] as const;

export function HygieneTracker({ data }: HygieneTrackerProps) {
  const [logs, setLogs] = useState<HygieneLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [lastLog, setLastLog] = useState<Date | null>(
    data?.lastShower ? new Date(data.lastShower) : null
  );


  // calculate time since last shower
  const getTimeSince = () => {
    if (!lastLog) return null;
    const hours = Math.floor((Date.now() - lastLog.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // get status color based on time since last shower
  const getStatusColor = () => {
    if (!lastLog) return '#ef4444';
    const hours = Math.floor((Date.now() - lastLog.getTime()) / (1000 * 60 * 60));
    if (hours < 12) return '#22c55e'; // fresh
    if (hours < 24) return '#f5af12'; // getting there
    if (hours < 48) return '#f97316'; // overdue
    return '#ef4444'; // very overdue
  };

  const handleLog = async (type: HygieneLog['type']) => {
    setIsLogging(true);
    
    const newLog: HygieneLog = {
      id: Date.now().toString(),
      type,
      timestamp: new Date(),
    };

    // simulate save delay for tactile feel
    await new Promise(resolve => setTimeout(resolve, 300));

    setLogs(prev => [newLog, ...prev]);
    setLastLog(new Date());
    setIsLogging(false);

    // show rewarding toast
    const messages = [
      'self-care complete ✦',
      'refreshing ✦',
      'momentum building ✦',
      'ritual complete ✦',
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    toast(message, { 
      icon: <Check className="w-4 h-4 text-[#22c55e]" />,
      style: {
        background: '#050505',
        border: '1px solid #f5af12',
        color: '#ffffff',
      }
    });
  };

  const timeSince = getTimeSince();
  const statusColor = getStatusColor();

  return (
    <div 
      className="w-full max-w-sm rounded-xl overflow-hidden"
      style={{ 
        background: '#050505',
        border: '1px solid rgba(245, 175, 18, 0.2)',
      }}
    >
      {/* header */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ 
          background: 'linear-gradient(90deg, rgba(245, 175, 18, 0.1) 0%, rgba(60, 159, 221, 0.1) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4" style={{ color: '#3c9fdd' }} />
          <span 
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: '#f5af12' }}
          >
            hygiene ritual
          </span>
        </div>
        {timeSince && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" style={{ color: statusColor }} />
            <span className="text-[10px]" style={{ color: statusColor }}>
              {timeSince}
            </span>
          </div>
        )}
      </div>

      {/* main action buttons */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {hygieneTypes.map((item) => {
            const Icon = item.icon;
            const isShower = item.id === 'shower';
            return (
              <button
                key={item.id}
                onClick={() => handleLog(item.id)}
                disabled={isLogging}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-all duration-200",
                  "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                style={{
                  background: isShower 
                    ? 'linear-gradient(135deg, rgba(60, 159, 221, 0.2) 0%, rgba(245, 175, 18, 0.2) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isShower ? 'rgba(245, 175, 18, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                }}
              >
                <Icon 
                  className="w-5 h-5" 
                  style={{ color: item.color }}
                />
                <span 
                  className="text-[10px] font-medium lowercase"
                  style={{ color: '#ffffff' }}
                >
                  {item.label}
                </span>
                {isShower && (
                  <div 
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                    style={{ background: '#f5af12' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* primary shower button */}
        <Button
          onClick={() => handleLog('shower')}
          disabled={isLogging}
          className={cn(
            "w-full h-12 text-sm font-medium lowercase transition-all duration-300",
            "hover:brightness-110 active:scale-[0.98]"
          )}
          style={{
            background: 'linear-gradient(90deg, #3c9fdd 0%, #f5af12 100%)',
            color: '#000000',
            border: 'none',
          }}
        >
          {isLogging ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              logging...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              log shower
            </span>
          )}
        </Button>

        {/* status indicator */}
        {lastLog && (
          <div 
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg"
            style={{ 
              background: 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${statusColor}30`,
            }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
              }}
            />
            <span className="text-[10px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              last shower: <span style={{ color: '#ffffff' }}>{timeSince}</span>
            </span>
          </div>
        )}
      </div>

      {/* recent logs */}
      {logs.length > 0 && (
        <div 
          className="px-4 pb-4"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
        >
          <div className="pt-3 space-y-2">
            <span className="text-[10px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              today&apos;s rituals
            </span>
            <div className="space-y-1">
              {logs.slice(0, 3).map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded"
                  style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                  <span className="text-[10px] lowercase" style={{ color: '#ffffff' }}>
                    {log.type}
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
