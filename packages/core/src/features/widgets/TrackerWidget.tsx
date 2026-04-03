import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Check, Clock, Play, Square, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRecords } from '@/hooks/use-records';
import { dataService } from '@/services/data.service';

interface TrackerLog {
  id: string;
  type: string;
  timestamp: string;
  value?: number;
  notes?: string;
  [key: string]: unknown;
}

interface DynamicField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
}

interface TrackerWidgetProps {
  data?: {
    collectionName?: string;
    fields?: DynamicField[];
    activityTypes?: Array<{ id: string; label: string; color: string; icon?: string }>;
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const THEME_COLOR = '#f6b012';

export function TrackerWidget({ data, onUpdate }: TrackerWidgetProps) {
  const collectionName = data?.collectionName ?? 'activity_logs';
  const { createRecord, records, refresh } = useRecords(collectionName);

  const [logs, setLogs] = useState<TrackerLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [fieldConfig, setFieldConfig] = useState<DynamicField[]>(
    data?.fields ?? [
      { name: 'notes', label: 'notes', type: 'textarea' },
      { name: 'rating', label: 'rating', type: 'number' },
    ]
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const activityTypes = data?.activityTypes ?? [
    { id: 'log', label: 'log entry', color: THEME_COLOR },
  ];

  useEffect(() => {
    if (Array.isArray(data?.fields)) {
      setFieldConfig(data.fields as DynamicField[]);
    }
  }, [data?.fields]);

  useEffect(() => {
    if (records) {
      setLogs(records.slice(0, 5).map((r: any) => ({
        id: r.id,
        type: r.type || r.activity_type || 'log',
        timestamp: r.timestamp || r.created_at,
        ...r
      })));
    }
  }, [records]);

  // timer effect
  useEffect(() => {
    if (!activeTimer || !timerStart) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, timerStart]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (activityId: string) => {
    setActiveTimer(activityId);
    setTimerStart(Date.now());
    setElapsedTime(0);
  };

  const stopTimer = async (activityId: string) => {
    if (!timerStart) return;
    
    const duration = Math.floor((Date.now() - timerStart) / 1000);
    setIsLogging(true);

    try {
      const payload = {
        type: activityId,
        timestamp: new Date().toISOString(),
        duration,
        ...customFieldValues,
      };

      await createRecord(payload);
      
      // emit sync event
      dataService.emitDataUpdate('activity_logged', {
        activity_id: activityId,
        duration,
        collection: collectionName
      });

      toast.success(`activity logged: ${formatDuration(duration)}`, {
        icon: <Check className="w-4 h-4 text-[#22c55e]" />,
      });

      refresh();
      setCustomFieldValues({});
    } catch (e) {
      toast.error('failed to save log');
    } finally {
      setIsLogging(false);
      setActiveTimer(null);
      setTimerStart(null);
      setElapsedTime(0);
    }
  };

  const handleQuickLog = async (type: string) => {
    setIsLogging(true);

    try {
      const payload = {
        type,
        timestamp: new Date().toISOString(),
        ...customFieldValues,
      };

      await createRecord(payload);

      // emit sync event
      dataService.emitDataUpdate('activity_logged', {
        activity_id: type,
        collection: collectionName
      });

      const newLog: TrackerLog = {
        id: Date.now().toString(),
        type,
        timestamp: new Date().toISOString(),
        ...customFieldValues,
      };

      setLogs((prev) => [newLog, ...prev]);

      toast.success('activity logged', {
        icon: <Check className="w-4 h-4 text-[#22c55e]" />,
      });

      setCustomFieldValues({});
    } catch (e) {
      toast.error('failed to save log');
    } finally {
      setIsLogging(false);
    }
  };

  const renderField = (field: DynamicField) => {
    const value = customFieldValues[field.name] ?? '';
    
    if (field.type === 'select') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-[10px] lowercase text-white/60">{field.label}</label>
          <select
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
            className="w-full h-8 bg-black/50 border border-white/10 rounded text-xs px-2"
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-[10px] lowercase text-white/60">{field.label}</label>
          <input
            type="number"
            value={value}
            min={1}
            max={10}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.name]: Number(e.target.value) }))}
            className="w-full h-8 bg-black/50 border border-white/10 rounded text-xs px-2"
          />
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-1">
        <label className="text-[10px] lowercase text-white/60">{field.label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
          className="w-full h-8 bg-black/50 border border-white/10 rounded text-xs px-2"
        />
      </div>
    );
  };

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
          <Activity className="w-4 h-4" style={{ color: THEME_COLOR }} />
          <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
            {collectionName.replace(/_/g, ' ')}
          </span>
        </div>
        {activeTimer && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: THEME_COLOR }}>
            <Clock className="w-3 h-3 animate-pulse" />
            {formatDuration(elapsedTime)}
          </div>
        )}
      </div>

      {/* content */}
      <div className="flex-1 p-3 space-y-3 overflow-auto min-h-0">
        {/* activity buttons */}
        <div className="grid grid-cols-2 gap-2">
          {activityTypes.map((activity) => (
            <button
              key={activity.id}
              onClick={() => activeTimer === activity.id ? stopTimer(activity.id) : startTimer(activity.id)}
              disabled={isLogging || (activeTimer && activeTimer !== activity.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 p-2 rounded-lg transition-all duration-200",
                "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed lowercase"
              )}
              style={{
                background: activeTimer === activity.id 
                  ? `${THEME_COLOR}20`
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${activeTimer === activity.id ? THEME_COLOR : 'rgba(255, 255, 255, 0.08)'}`,
              }}
            >
              {activeTimer === activity.id ? (
                <Square className="w-4 h-4" style={{ color: THEME_COLOR }} />
              ) : (
                <Play className="w-4 h-4" style={{ color: activity.color || THEME_COLOR }} />
              )}
              <span className="text-[10px] font-medium" style={{ color: '#ffffff' }}>
                {activeTimer === activity.id ? 'stop' : activity.label}
              </span>
            </button>
          ))}
        </div>

        {/* quick log button */}
        <Button
          onClick={() => handleQuickLog('manual')}
          disabled={isLogging || !!activeTimer}
          className={cn(
            "w-full h-9 text-xs font-medium lowercase transition-all duration-300",
            "hover:brightness-110 active:scale-[0.98]"
          )}
          style={{
            background: THEME_COLOR,
            color: '#000000',
            border: 'none',
          }}
        >
          {isLogging ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              logging...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              quick log
            </span>
          )}
        </Button>

        {/* dynamic fields */}
        {fieldConfig.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            {fieldConfig.map(renderField)}
          </div>
        )}

        {/* recent logs */}
        {logs.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-white/10">
            <span className="text-[10px] lowercase text-white/40">recent</span>
            <div className="space-y-1">
              {logs.slice(0, 3).map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between py-1 px-2 rounded"
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
        )}
      </div>
    </div>
  );
}
