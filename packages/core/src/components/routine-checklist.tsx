import { useState, useEffect } from 'react';
import { CheckSquare, X, Plus, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { cn } from '@/lib/utils';

interface RoutineTemplate {
  id: number;
  name: string;
  type: string;
  items: Array<{ id: string; label: string; icon?: string }>;
  reset_time: string;
  active: boolean;
}

interface RoutineCompletion {
  id: number;
  routine_id: number;
  date: string;
  completed_items: string[];
  completion_percentage: number;
}

export function RoutineChecklist() {
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);
  const [completions, setCompletions] = useState<Record<number, RoutineCompletion>>({});
  const [loading, setLoading] = useState(true);
  const [showAddRoutine, setShowAddRoutine] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    setLoading(true);
    try {
      const routinesRes: any = await api.listRecords('routine_templates', { 
        filter: { active: true },
        pageSize: 100 
      });
      
      const routinesList = routinesRes?.data || [];
      setRoutines(routinesList);

      // load today's completions
      const today = new Date().toISOString().split('T')[0];
      const completionsRes: any = await api.listRecords('routine_completions', {
        filter: { date: today },
        pageSize: 100
      });

      const completionsMap: Record<number, RoutineCompletion> = {};
      (completionsRes?.data || []).forEach((comp: RoutineCompletion) => {
        completionsMap[comp.routine_id] = comp;
      });
      setCompletions(completionsMap);
    } catch (err) {
      console.error('failed to load routines', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (routine: RoutineTemplate, itemId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const completion = completions[routine.id];
    
    try {
      let newCompletedItems: string[];
      
      if (!completion) {
        // create new completion
        newCompletedItems = [itemId];
        const percentage = (newCompletedItems.length / routine.items.length) * 100;
        
        const res: any = await api.createRecord('routine_completions', {
          routine_id: routine.id,
          date: today,
          completed_items: newCompletedItems,
          completion_percentage: percentage,
          completed_at: new Date().toISOString()
        });

        setCompletions(prev => ({
          ...prev,
          [routine.id]: res.data
        }));
      } else {
        // update existing completion
        const currentItems = completion.completed_items || [];
        newCompletedItems = currentItems.includes(itemId)
          ? currentItems.filter(id => id !== itemId)
          : [...currentItems, itemId];
        
        const percentage = (newCompletedItems.length / routine.items.length) * 100;

        await api.request('routine_completions', 'update', {
          filterByTk: completion.id,
          completed_items: newCompletedItems,
          completion_percentage: percentage,
          completed_at: new Date().toISOString()
        });

        setCompletions(prev => ({
          ...prev,
          [routine.id]: {
            ...completion,
            completed_items: newCompletedItems,
            completion_percentage: percentage
          }
        }));
      }

      // check if routine fully completed
      if (newCompletedItems.length === routine.items.length) {
        toast.success(`${routine.name} complete! 🎉`);
      }
    } catch (err) {
      console.error('failed to toggle item', err);
      toast.error('failed to update routine');
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse">
        <div className="h-32 bg-white/5 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-blue-400" />
          <p className="text-xs text-white/40 lowercase">daily routines</p>
        </div>
        <button
          onClick={() => setShowAddRoutine(true)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
        >
          <Plus size={14} />
        </button>
      </div>

      {routines.map(routine => {
        const completion = completions[routine.id];
        const completedItems = completion?.completed_items || [];
        const percentage = completion?.completion_percentage || 0;
        const icon = routine.type === 'morning' ? Sun : routine.type === 'evening' ? Moon : CheckSquare;
        const IconComponent = icon;

        return (
          <div key={routine.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IconComponent size={16} className="text-yellow-400" />
                <span className="text-sm lowercase text-white">{routine.name}</span>
              </div>
              <span className="text-xs text-white/40">{percentage.toFixed(0)}%</span>
            </div>

            <div className="h-2 bg-white/5 rounded-full mb-3 overflow-hidden">
              <div 
                className="h-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-green-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="space-y-2">
              {routine.items.map(item => {
                const isCompleted = completedItems.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 cursor-pointer select-none group"
                  >
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => toggleItem(routine, item.id)}
                      className="h-4 w-4 rounded border-white/30 bg-transparent accent-green-500"
                    />
                    {item.icon && <span className="text-sm">{item.icon}</span>}
                    <span className={cn(
                      'text-sm lowercase transition-colors',
                      isCompleted ? 'text-white/40 line-through' : 'text-white/70 group-hover:text-white'
                    )}>
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>

            {percentage === 100 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-green-400 lowercase text-center">
                  ✓ routine complete!
                </p>
              </div>
            )}
          </div>
        );
      })}

      {routines.length === 0 && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-center text-white/30 text-sm lowercase py-4">
            no routines configured yet
          </p>
        </div>
      )}

      {showAddRoutine && (
        <AddRoutineModal
          onClose={() => setShowAddRoutine(false)}
          onSuccess={() => {
            loadRoutines();
            setShowAddRoutine(false);
          }}
        />
      )}
    </div>
  );
}

function AddRoutineModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'morning' | 'evening' | 'custom'>('morning');
  const [items, setItems] = useState<Array<{ id: string; label: string; icon?: string }>>([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    if (!newItemLabel.trim()) return;
    setItems([...items, { id: `item_${Date.now()}`, label: newItemLabel.trim() }]);
    setNewItemLabel('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!name.trim() || items.length === 0) {
      toast.error('name and at least one item required');
      return;
    }

    setLoading(true);
    try {
      await api.createRecord('routine_templates', {
        name: name.trim(),
        type,
        items,
        reset_time: type === 'morning' ? '06:00' : type === 'evening' ? '18:00' : '00:00',
        active: true
      });

      toast.success('routine created');
      onSuccess();
    } catch (err) {
      console.error('failed to create routine', err);
      toast.error('failed to create routine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-96 max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm lowercase text-white">create routine</p>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="routine name"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30"
          />

          <div className="flex gap-2">
            {(['morning', 'evening', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs lowercase',
                  type === t ? 'bg-blue-600' : 'bg-white/10'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs text-white/40 lowercase mb-2">items</p>
            <div className="space-y-2 mb-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm lowercase text-white/70">{item.label}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemLabel}
                onChange={e => setNewItemLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="add item"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30"
              />
              <button
                onClick={addItem}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || items.length === 0}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white lowercase"
          >
            {loading ? 'creating...' : 'create routine'}
          </button>
        </div>
      </div>
    </div>
  );
}
