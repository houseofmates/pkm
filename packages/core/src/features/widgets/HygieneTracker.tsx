import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Droplets, Check, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRecords } from '@/hooks/use-records';

interface HygieneLog {
  id: string;
  type: 'shower' | 'brush' | 'skincare' | 'other';
  timestamp: string;
  notes?: string;
  mood?: string;
  rating?: number;
  [key: string]: unknown;
}

interface DynamicField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  options?: string[];
}

interface HygieneTrackerProps {
  data?: {
    lastShower?: string;
    streak?: number;
    fields?: DynamicField[];
    collectionName?: string;
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const hygieneTypes = [
  { id: 'shower', label: 'shower', icon: Droplets, color: '#3c9fdd' },
  { id: 'brush', label: 'brush', icon: Sparkles, color: '#f5af12' },
  { id: 'skincare', label: 'care', icon: Droplets, color: '#22c55e' },
] as const;

export function HygieneTracker({ data, onUpdate }: HygieneTrackerProps) {
  const collectionName = data?.collectionName ?? 'hygiene_logs';
  const { createRecord } = useRecords(collectionName);

  const [logs, setLogs] = useState<HygieneLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [lastLog, setLastLog] = useState<Date | null>(
    data?.lastShower ? new Date(data.lastShower) : null
  );
  const [streak, setStreak] = useState(data?.streak ?? 0);
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('neutral');
  const [rating, setRating] = useState(3);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const fieldConfig: DynamicField[] = data?.fields ?? [
    { name: 'mood', label: 'mood', type: 'select', options: ['low', 'okay', 'good', 'great'] },
    { name: 'rating', label: 'session rating', type: 'number' },
    { name: 'notes', label: 'notes', type: 'text' },
  ];

  useEffect(() => {
    if (data?.lastShower) {
      setLastLog(new Date(data.lastShower));
    }
    if (typeof data?.streak === 'number') {
      setStreak(data.streak);
    }
  }, [data?.lastShower, data?.streak]);


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

    const timestamp = new Date();

    const payload: Record<string, unknown> = {
      type,
      timestamp: timestamp.toISOString(),
      mood,
      rating,
      notes,
      ...customFieldValues,
    };

    try {
      await createRecord(payload);
      const newLog: HygieneLog = {
        id: Date.now().toString(),
        type,
        timestamp: timestamp.toISOString(),
        mood,
        rating,
        notes,
        ...customFieldValues,
      };

      setLogs((prev) => [newLog, ...prev]);
      setLastLog(timestamp);

      const daysSinceLast = lastLog
        ? Math.floor((timestamp.getTime() - lastLog.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const nextStreak = daysSinceLast === 1 ? streak + 1 : 1;
      setStreak(nextStreak);
      onUpdate?.({ lastShower: timestamp.toISOString(), streak: nextStreak });

      const messages = [
        'self-care complete ✦',
        'refreshing ✦',
        'momentum building ✦',
        'ritual complete ✦',
        'minor legend gains ✦',
      ];
      const message = messages[Math.floor(Math.random() * messages.length)];

      toast.success(message, {
        icon: <Check className="w-4 h-4 text-[#22c55e]" />,
      });

      setNotes('');
      setMood('neutral');
      setRating(3);
      setCustomFieldValues({});
    } catch (e) {
      console.error('Hygiene log failed to save:', e);
      toast.error('Failed to save hygiene log');
    } finally {
      setIsLogging(false);
    }
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

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] lowercase text-muted-foreground">
            <span>daily habits</span>
            <span>streak {streak}</span>
          </div>

          {fieldConfig.map((field) => {
            if (field.type === 'select') {
              return (
                <div key={field.name} className="space-y-1">
                  <label className="text-[10px] lowercase text-muted-foreground">{field.label}</label>
                  <select
                    value={customFieldValues[field.name] ?? mood}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (field.name === 'mood') setMood(value);
                      setCustomFieldValues((prev) => ({ ...prev, [field.name]: value }));
                    }}
                    className="w-full h-8 bg-black/50 border border-white/10 rounded text-xs"
                  >
                    {field.options?.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.type === 'number') {
              return (
                <div key={field.name} className="space-y-1">
                  <label className="text-[10px] lowercase text-muted-foreground">{field.label}</label>
                  <input
                    type="number"
                    value={field.name === 'rating' ? rating : customFieldValues[field.name] ?? ''}
                    min={1}
                    max={10}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (field.name === 'rating') setRating(value);
                      setCustomFieldValues((prev) => ({ ...prev, [field.name]: value }));
                    }}
                    className="w-full h-8 bg-black/50 border border-white/10 rounded text-xs px-2"
                  />
                </div>
              );
            }

            if (field.type === 'textarea' || field.type === 'text') {
              return (
                <div key={field.name} className="space-y-1">
                  <label className="text-[10px] lowercase text-muted-foreground">{field.label}</label>
                  <input
                    type="text"
                    value={field.name === 'notes' ? notes : customFieldValues[field.name] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (field.name === 'notes') setNotes(value);
                      setCustomFieldValues((prev) => ({ ...prev, [field.name]: value }));
                    }}
                    className="w-full h-8 bg-black/50 border border-white/10 rounded text-xs px-2"
                  />
                </div>
              );
            }

            return null;
          })}
        </div>

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
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
