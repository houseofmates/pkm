import { useState } from 'react';
import { Activity, DollarSign, Heart, Battery, CheckSquare, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityLogWidget } from './activity-log-widget';
import { StreakCounter } from './streak-counter';
import { FinancialHub } from './financial-hub';
import { MoodLogger, EnergyBattery, EnergyCorrelations } from './mood-energy-widgets';
import { RoutineChecklist } from './routine-checklist';

type DashboardView = 'activities' | 'financial' | 'mood' | 'energy' | 'routines' | 'overview';

export function UnifiedDashboard() {
  const [view, setView] = useState<DashboardView>('overview');
  const [showDashboard, setShowDashboard] = useState(false);

  if (!showDashboard) {
    return (
      <button
        onClick={() => setShowDashboard(true)}
        className="fixed bottom-4 right-4 p-3 rounded-full bg-gradient-to-r from-yellow-500 to-blue-500 text-black shadow-lg hover:scale-105 transition-transform z-40"
      >
        <TrendingUp size={20} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowDashboard(false)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative bg-[#050505] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-yellow-400" />
            <h2 className="text-lg font-bold lowercase">dashboard</h2>
          </div>
          <button 
            onClick={() => setShowDashboard(false)}
            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* view selector */}
        <div className="flex gap-2 p-4 border-b border-white/10 overflow-x-auto">
          {[
            { id: 'overview', label: 'overview', icon: TrendingUp },
            { id: 'activities', label: 'activities', icon: Activity },
            { id: 'financial', label: 'financial', icon: DollarSign },
            { id: 'mood', label: 'mood', icon: Heart },
            { id: 'energy', label: 'energy', icon: Battery },
            { id: 'routines', label: 'routines', icon: CheckSquare }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id as DashboardView)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm lowercase whitespace-nowrap',
                view === id ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {view === 'overview' && <OverviewView />}
          {view === 'activities' && <ActivityLogWidget />}
          {view === 'financial' && <FinancialHub />}
          {view === 'mood' && <MoodLogger />}
          {view === 'energy' && (
            <div className="space-y-4">
              <EnergyBattery />
              <EnergyCorrelations />
            </div>
          )}
          {view === 'routines' && <RoutineChecklist />}
        </div>
      </div>
    </div>
  );
}

function OverviewView() {
  return (
    <div className="space-y-4">
      {/* quick stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Activity}
          label="activities today"
          value="0"
          color="#f5af12"
        />
        <StatCard
          icon={TrendingUp}
          label="current streak"
          value="0"
          color="#22c55e"
        />
        <StatCard
          icon={Heart}
          label="mood"
          value="-"
          color="#ec4899"
        />
        <StatCard
          icon={Battery}
          label="energy"
          value="-"
          color="#3c9fdd"
        />
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          icon={Activity}
          label="log activity"
          description="track what you've done"
          color="#f5af12"
        />
        <QuickActionCard
          icon={Heart}
          label="log mood"
          description="how are you feeling?"
          color="#ec4899"
        />
        <QuickActionCard
          icon={Battery}
          label="log energy"
          description="physical & mental levels"
          color="#3c9fdd"
        />
        <QuickActionCard
          icon={DollarSign}
          label="add transaction"
          description="track spending"
          color="#22c55e"
        />
      </div>

      {/* today's routines */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare size={16} className="text-blue-400" />
          <p className="text-xs text-white/40 lowercase">today's routines</p>
        </div>
        <p className="text-sm text-white/60 lowercase text-center py-4">
          configure routines to see them here
        </p>
      </div>

      {/* recent activity */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-green-400" />
          <p className="text-xs text-white/40 lowercase">recent activity</p>
        </div>
        <p className="text-sm text-white/60 lowercase text-center py-4">
          start logging to see your activity here
        </p>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-xs text-white/40 lowercase">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function QuickActionCard({ 
  icon: Icon, 
  label, 
  description, 
  color 
}: { 
  icon: any; 
  label: string; 
  description: string; 
  color: string;
}) {
  return (
    <button className="p-3 rounded-lg bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors text-left">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} style={{ color }} />
        <span className="text-sm lowercase text-white">{label}</span>
      </div>
      <p className="text-xs text-white/40 lowercase">{description}</p>
    </button>
  );
}
