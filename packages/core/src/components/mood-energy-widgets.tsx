import { useState, useEffect } from 'react';
import { Battery, Heart, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secure-logger';

const MOODS = [
  { id: 1, emoji: '😢', label: 'terrible', color: '#ef4444' },
  { id: 2, emoji: '😕', label: 'bad', color: '#f97316' },
  { id: 3, emoji: '😐', label: 'okay', color: '#eab308' },
  { id: 4, emoji: '🙂', label: 'good', color: '#22c55e' },
  { id: 5, emoji: '😄', label: 'amazing', color: '#06b6d4' }
];

export function MoodLogger({ onLogged }: { onLogged?: () => void }) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);

  const handleLog = async () => {
    if (!selectedMood) return;

    setLogging(true);
    try {
      const now = new Date();
      await api.createRecord('mood_logs', {
        mood: selectedMood,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        notes,
        context: {}
      });

      toast.success(`mood logged: ${MOODS.find(m => m.id === selectedMood)?.label}`);
      setSelectedMood(null);
      setNotes('');
      onLogged?.();
    } catch (err) {
      secureLogger.error('failed to log mood', err);
      toast.error('failed to log mood');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-3">
        <Heart size={16} className="text-pink-400" />
        <p className="text-xs text-white/40 lowercase">how are you feeling?</p>
      </div>

      <div className="flex gap-3 justify-center mb-3">
        {MOODS.map(mood => (
          <button
            key={mood.id}
            onClick={() => setSelectedMood(mood.id)}
            className={cn(
              'w-12 h-12 rounded-full transition-all flex items-center justify-center text-2xl',
              selectedMood === mood.id 
                ? 'scale-110 ring-2' 
                : 'hover:scale-105'
            )}
            style={{
              backgroundColor: selectedMood === mood.id ? `${mood.color}33` : '#000',
              borderColor: mood.color,
              borderWidth: '2px',
              borderStyle: 'solid',
              boxShadow: selectedMood === mood.id ? `0 0 0 2px ${mood.color}` : 'none',
            }}
          >
            {mood.emoji}
          </button>
        ))}
      </div>

      {selectedMood && (
        <>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="notes (optional)"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 mb-3 resize-none"
            rows={2}
          />
          <button
            onClick={handleLog}
            disabled={logging}
            className="w-full py-2 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white lowercase"
          >
            {logging ? 'logging...' : 'log mood'}
          </button>
        </>
      )}
    </div>
  );
}

export function EnergyBattery({ onLogged }: { onLogged?: () => void }) {
  const [physicalEnergy, setPhysicalEnergy] = useState(50);
  const [mentalEnergy, setMentalEnergy] = useState(50);
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);

  const handleLog = async () => {
    setLogging(true);
    try {
      const now = new Date();
      await api.createRecord('energy_logs', {
        physical_energy: physicalEnergy,
        mental_energy: mentalEnergy,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        notes
      });

      toast.success('energy logged');
      setNotes('');
      onLogged?.();
    } catch (err) {
      secureLogger.error('failed to log energy', err);
      toast.error('failed to log energy');
    } finally {
      setLogging(false);
    }
  };

  const getBatteryColor = (level: number) => {
    if (level >= 70) return '#22c55e';
    if (level >= 40) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-3">
        <Battery size={16} className="text-blue-400" />
        <p className="text-xs text-white/40 lowercase">energy levels</p>
      </div>

      <div className="space-y-4 mb-3">
        {/* physical energy */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60 lowercase">physical</span>
            <span className="text-sm font-medium" style={{ color: getBatteryColor(physicalEnergy) }}>
              {physicalEnergy}%
            </span>
          </div>
          <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 transition-all duration-300"
              style={{ 
                width: `${physicalEnergy}%`,
                backgroundColor: getBatteryColor(physicalEnergy)
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={physicalEnergy}
              onChange={e => setPhysicalEnergy(parseInt(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* mental energy */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60 lowercase">mental</span>
            <span className="text-sm font-medium" style={{ color: getBatteryColor(mentalEnergy) }}>
              {mentalEnergy}%
            </span>
          </div>
          <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 transition-all duration-300"
              style={{ 
                width: `${mentalEnergy}%`,
                backgroundColor: getBatteryColor(mentalEnergy)
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={mentalEnergy}
              onChange={e => setMentalEnergy(parseInt(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="notes (optional)"
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 mb-3 resize-none"
        rows={2}
      />

      <button
        onClick={handleLog}
        disabled={logging}
        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white lowercase"
      >
        {logging ? 'logging...' : 'log energy'}
      </button>
    </div>
  );
}

export function EnergyCorrelations() {
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCorrelations();
  }, []);

  const loadCorrelations = async () => {
    setLoading(true);
    try {
      // get last 30 days of energy logs
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const [energyRes, activityRes]: any[] = await Promise.all([
        api.listRecords('energy_logs', { 
          filter: { date: { $gte: cutoffStr } },
          pageSize: 500 
        }),
        api.listRecords('activity_logs', { 
          filter: { date: { $gte: cutoffStr } },
          pageSize: 500 
        })
      ]);

      const energyLogs = energyRes?.data || [];
      const activityLogs = activityRes?.data || [];

      // group by date
      const dateMap: Record<string, { energy: any; activities: any[] }> = {};
      
      energyLogs.forEach((log: any) => {
        if (!dateMap[log.date]) dateMap[log.date] = { energy: null, activities: [] };
        dateMap[log.date].energy = log;
      });

      activityLogs.forEach((log: any) => {
        if (!dateMap[log.date]) dateMap[log.date] = { energy: null, activities: [] };
        dateMap[log.date].activities.push(log);
      });

      // calculate correlations
      const activityImpact: Record<string, { physical: number[]; mental: number[] }> = {};

      Object.values(dateMap).forEach(day => {
        if (!day.energy) return;
        
        day.activities.forEach(activity => {
          if (!activityImpact[activity.activity_name]) {
            activityImpact[activity.activity_name] = { physical: [], mental: [] };
          }
          activityImpact[activity.activity_name].physical.push(day.energy.physical_energy);
          activityImpact[activity.activity_name].mental.push(day.energy.mental_energy);
        });
      });

      const results = Object.entries(activityImpact)
        .map(([name, data]) => ({
          activity: name,
          avgPhysical: data.physical.reduce((a, b) => a + b, 0) / data.physical.length,
          avgMental: data.mental.reduce((a, b) => a + b, 0) / data.mental.length,
          count: data.physical.length
        }))
        .filter(r => r.count >= 3)
        .sort((a, b) => (b.avgPhysical + b.avgMental) - (a.avgPhysical + a.avgMental));

      setCorrelations(results);
    } catch (err) {
      secureLogger.error('failed to load correlations', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse">
        <div className="h-24 bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (correlations.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <p className="text-center text-white/30 text-sm lowercase py-4">
          log more activities and energy to see patterns
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-green-400" />
        <p className="text-xs text-white/40 lowercase">energy correlations</p>
      </div>

      <div className="space-y-2">
        {correlations.slice(0, 5).map(corr => (
          <div key={corr.activity} className="p-2 rounded-lg bg-white/[0.02]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm lowercase text-white/70">{corr.activity}</span>
              <span className="text-xs text-white/40">{corr.count}×</span>
            </div>
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-yellow-400" />
                <span className="text-white/60">physical: {corr.avgPhysical.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-blue-400" />
                <span className="text-white/60">mental: {corr.avgMental.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
