import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cat, Check, Clock, Plus, X, Fish, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRecords } from '@/hooks/use-records';
import { dataService } from '@/services/data.service';

interface CatCareTask {
  id: string;
  name: string;
  frequency: 'daily' | 'twice_daily' | 'weekly';
  lastDone: string | null;
  icon?: string;
}

interface CatCareLog {
  id: string;
  task_id: string;
  task_name: string;
  timestamp: string;
  notes?: string;
}

interface CatCareWidgetProps {
  data?: {
    collectionName?: string;
    tasks?: CatCareTask[];
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const THEME_COLOR = '#f6b012';
const CAT_COLOR = '#a855f7';

export function CatCareWidget({ data, onUpdate }: CatCareWidgetProps) {
  const collectionName = data?.collectionName ?? 'cat_care_logs';
  const { createRecord, records, refresh } = useRecords(collectionName);

  const [tasks, setTasks] = useState<CatCareTask[]>(
    data?.tasks ?? [
      { id: 'feeding', name: 'feeding', frequency: 'daily', lastDone: null, icon: 'fish' },
      { id: 'litter', name: 'litter box', frequency: 'daily', lastDone: null, icon: 'trash' },
      { id: 'play', name: 'play session', frequency: 'daily', lastDone: null, icon: 'sparkles' },
    ]
  );
  const [logs, setLogs] = useState<CatCareLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', frequency: 'daily' as const, icon: 'sparkles' });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (records) {
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = records
        .filter((r: any) => r.timestamp?.startsWith(today))
        .map((r: any) => ({
          id: r.id,
          task_id: r.task_id,
          task_name: r.task_name,
          timestamp: r.timestamp,
          notes: r.notes,
        }));
      setLogs(todayLogs);

      // update task last done based on logs
      setTasks(prev => prev.map(task => {
        const taskLogs = records.filter((r: any) => r.task_id === task.id);
        const lastLog = taskLogs.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        const ts = lastLog?.timestamp;
        const lastDone = typeof ts === 'string' ? ts : null;
        return {
          ...task,
          lastDone,
        };
      }));
    }
  }, [records]);

  const handleLog = async (task: CatCareTask) => {
    setIsLogging(true);

    try {
      const payload = {
        task_id: task.id,
        task_name: task.name,
        timestamp: new Date().toISOString(),
        notes: notes || undefined,
      };

      await createRecord(payload);

      // emit sync event
      dataService.emitDataUpdate('cat_care_completed', {
        task_id: task.id,
        task_name: task.name
      });

      setLogs(prev => [{
        id: Date.now().toString(),
        ...payload
      }, ...prev]);

      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, lastDone: payload.timestamp } : t
      ));

      setNotes('');

      toast.success(`${task.name} completed`, {
        icon: <Check className="w-4 h-4 text-[#22c55e]" />,
      });

      refresh();
    } catch (e) {
      toast.error('failed to save log');
    } finally {
      setIsLogging(false);
    }
  };

  const handleAddTask = () => {
    if (!newTask.name) return;
    
    const task: CatCareTask = {
      id: `custom_${Date.now()}`,
      name: newTask.name,
      frequency: newTask.frequency,
      lastDone: null,
      icon: newTask.icon,
    };

    setTasks(prev => [...prev, task]);
    setNewTask({ name: '', frequency: 'daily', icon: 'sparkles' });
    setShowAdd(false);
    onUpdate?.({ tasks: [...tasks, task] });
  };

  const getTaskIcon = (iconName?: string) => {
    switch (iconName) {
      case 'fish': return <Fish className="w-4 h-4" style={{ color: CAT_COLOR }} />;
      case 'trash': return <Trash2 className="w-4 h-4" style={{ color: CAT_COLOR }} />;
      case 'sparkles': return <Sparkles className="w-4 h-4" style={{ color: THEME_COLOR }} />;
      default: return <Cat className="w-4 h-4" style={{ color: CAT_COLOR }} />;
    }
  };

  const getTimeSince = (timestamp: string | null): string => {
    if (!timestamp) return 'not done today';
    const hours = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return 'over a day ago';
  };

  const isTaskDue = (task: CatCareTask): boolean => {
    if (!task.lastDone) return true;
    const hoursSince = (Date.now() - new Date(task.lastDone).getTime()) / (1000 * 60 * 60);
    
    switch (task.frequency) {
      case 'daily': return hoursSince >= 20;
      case 'twice_daily': return hoursSince >= 10;
      case 'weekly': return hoursSince >= 160;
      default: return hoursSince >= 24;
    }
  };

  return (
    <div 
      className="w-full h-full rounded-xl overflow-hidden flex flex-col"
      style={{ 
        background: '#050505',
        border: `1px solid ${CAT_COLOR}20`,
      }}
    >
      {/* header */}
      <div 
        className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{ 
          background: `linear-gradient(90deg, ${CAT_COLOR}10 0%, transparent 100%)`,
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="flex items-center gap-2">
          <Cat className="w-4 h-4" style={{ color: CAT_COLOR }} />
          <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
            cat care
          </span>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 p-3 space-y-2 overflow-auto min-h-0">
        {/* task list */}
        {tasks.map((task) => {
          const due = isTaskDue(task);
          const timeSince = getTimeSince(task.lastDone);
          
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-all"
              )}
              style={{
                background: due 
                  ? `${THEME_COLOR}10`
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${due ? THEME_COLOR : 'rgba(255, 255, 255, 0.08)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ 
                    background: due 
                      ? `${THEME_COLOR}20`
                      : '#22c55e20'
                  }}
                >
                  {getTaskIcon(task.icon)}
                </div>
                <div>
                  <span className="text-xs font-medium lowercase block" style={{ color: '#ffffff' }}>
                    {task.name}
                  </span>
                  <span 
                    className="text-[10px] lowercase" 
                    style={{ color: due ? THEME_COLOR : 'rgba(255, 255, 255, 0.5)' }}
                  >
                    {timeSince}
                  </span>
                </div>
              </div>
              
              <Button
                size="xs"
                onClick={() => handleLog(task)}
                disabled={isLogging}
                className="h-7 px-2 text-[10px] lowercase"
                style={{
                  background: due ? THEME_COLOR : '#22c55e',
                  color: '#000000',
                }}
              >
                {isLogging ? '...' : due ? 'do' : 'done'}
              </Button>
            </div>
          );
        })}

        {/* notes input */}
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="notes (optional)"
          className="w-full h-8 px-2 text-xs bg-black/40 border border-white/10 rounded lowercase"
        />

        {/* add task */}
        {showAdd ? (
          <div className="space-y-2 p-2 rounded-lg border border-white/10 bg-white/5">
            <input
              value={newTask.name}
              onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
              placeholder="task name"
              className="w-full h-8 px-2 text-xs bg-black/40 border border-white/10 rounded lowercase"
            />
            <select
              value={newTask.frequency}
              onChange={(e) => setNewTask(prev => ({ ...prev, frequency: e.target.value as any }))}
              className="w-full h-8 px-2 text-xs bg-black/40 border border-white/10 rounded lowercase"
            >
              <option value="daily">daily</option>
              <option value="twice_daily">twice daily</option>
              <option value="weekly">weekly</option>
            </select>
            <div className="flex gap-2">
              <Button
                size="xs"
                className="flex-1 h-7 text-[10px] lowercase"
                onClick={handleAddTask}
                style={{ background: THEME_COLOR, color: '#000000' }}
              >
                add
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setShowAdd(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="xs"
            variant="ghost"
            className="w-full h-7 text-[10px] lowercase border border-dashed border-white/20"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            add task
          </Button>
        )}

        {/* today's summary */}
        {logs.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] lowercase text-white/40">
              today: {logs.length} tasks completed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
