import { useState, useEffect } from 'react';
import { Plus, X, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secure-logger';

interface Activity {
  id: number;
  name: string;
  category?: string;
  icon?: string;
  color?: string;
  default_fields?: Record<string, any>;
}

interface ActivityLogWidgetProps {
  onClose?: () => void;
  onLogged?: () => void;
}

export function ActivityLogWidget({ onClose, onLogged }: ActivityLogWidgetProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaks, setStreaks] = useState<Record<number, { current: number; longest: number }>>({});

  useEffect(() => {
    loadActivities();
    loadStreaks();
  }, []);

  const loadActivities = async () => {
    try {
      const res: any = await api.listRecords('activities', { 
        filter: { loggable: true },
        pageSize: 100 
      });
      setActivities(res?.data || []);
    } catch (err) {
      secureLogger.error('failed to load activities', err);
    }
  };

  const loadStreaks = async () => {
    try {
      const token = localStorage.getItem('nocobase_token');
      const res = await fetch('/api/activities/streaks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const map: Record<number, { current: number; longest: number }> = {};
      data.forEach((s: any) => {
        map[s.activity_id] = { current: s.current_streak, longest: s.longest_streak };
      });
      setStreaks(map);
    } catch (err) {
      secureLogger.error('failed to load streaks', err);
    }
  };

  const handleLog = async () => {
    if (!selectedActivity) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('nocobase_token');
      const res = await fetch('/api/activities/log', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          activity_name: selectedActivity.name,
          values,
          notes
        })
      });

      const result = await res.json();
      
      if (result.logged) {
        const streakMsg = result.streak_increased 
          ? `🔥 ${result.streak} day streak!` 
          : result.already_logged_today 
            ? 'already logged today' 
            : `logged (${result.streak} day streak)`;
        
        toast.success(`${selectedActivity.name} ${streakMsg}`);
        
        setSelectedActivity(null);
        setValues({});
        setNotes('');
        loadStreaks();
        onLogged?.();
      } else {
        toast.error('failed to log activity');
      }
    } catch (err) {
      secureLogger.error('log failed', err);
      toast.error('failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  if (selectedActivity) {
    const fields = selectedActivity.default_fields || {};
    
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {selectedActivity.icon && <span className="text-xl">{selectedActivity.icon}</span>}
            <p className="text-sm lowercase text-white">{selectedActivity.name}</p>
          </div>
          <button onClick={() => setSelectedActivity(null)} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* dynamic fields based on activity schema */}
        {Object.keys(fields).length > 0 && (
          <div className="space-y-2 mb-3">
            {Object.entries(fields).map(([key, config]: [string, any]) => (
              <div key={key}>
                <label className="text-xs text-white/40 lowercase block mb-1">{key}</label>
                {config.type === 'number' ? (
                  <input
                    type="number"
                    value={values[key] || ''}
                    onChange={e => setValues({ ...values, [key]: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                  />
                ) : config.type === 'boolean' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={values[key] || false}
                      onChange={e => setValues({ ...values, [key]: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-xs text-white/60 lowercase">{config.label || key}</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={values[key] || ''}
                    onChange={e => setValues({ ...values, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="notes (optional)"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 mb-3 resize-none"
          rows={2}
        />

        <button
          onClick={handleLog}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white lowercase"
        >
          {loading ? 'logging...' : 'log activity'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 lowercase">log activity</p>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {activities.map(activity => {
          const streak = streaks[activity.id];
          return (
            <button
              key={activity.id}
              onClick={() => setSelectedActivity(activity)}
              className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
              style={{ borderLeft: `3px solid ${activity.color || '#ffffff'}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                {activity.icon && <span>{activity.icon}</span>}
                <span className="text-sm lowercase text-white">{activity.name}</span>
              </div>
              {streak && streak.current > 0 && (
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <span>🔥</span>
                  <span>{streak.current}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {activities.length === 0 && (
        <p className="text-center text-white/30 text-xs lowercase py-4">
          no activities configured yet
        </p>
      )}
    </div>
  );
}
