import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Hash } from 'lucide-react';
import { usePluralSystem } from '../../stores/use-plural-system';
import { formatDuration } from '../../utils/time-utils';
import { differenceInSeconds, parseISO, startOfDay, format } from 'date-fns';

export function AnalyticsPanel() {
  const { members, frontSessions } = usePluralSystem();
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const now = new Date();
  const cutoff = useMemo(() => {
    if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (range === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return new Date(0);
  }, [range]);

  const filteredSessions = useMemo(() =>
    frontSessions.filter(s => new Date(s.startedAt) >= cutoff),
    [frontSessions, cutoff]
  );

  // per-member stats
  const memberStats = useMemo(() => {
    const stats: Record<string, { totalSeconds: number; sessions: number; memberName: string; color: string }> = {};
    for (const session of filteredSessions) {
      const durationSec = session.endedAt
        ? differenceInSeconds(parseISO(session.endedAt), parseISO(session.startedAt))
        : differenceInSeconds(now, parseISO(session.startedAt));
      for (const entry of session.entries) {
        const m = members.find(mem => mem.id === entry.memberId);
        if (!m) continue;
        if (!stats[m.id]) {
          stats[m.id] = { totalSeconds: 0, sessions: 0, memberName: m.displayName || m.name, color: m.color };
        }
        stats[m.id].totalSeconds += durationSec;
        stats[m.id].sessions += 1;
      }
    }
    return Object.values(stats).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [filteredSessions, members]);

  // pie chart data
  const pieData = useMemo(() =>
    memberStats.map(s => ({ name: s.memberName, value: Math.round(s.totalSeconds / 3600), color: s.color })),
    [memberStats]
  );

  // daily bar chart
  const dailyData = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    for (const session of filteredSessions) {
      if (!session.endedAt) continue;
      const day = format(startOfDay(parseISO(session.startedAt)), 'yyyy-MM-dd');
      const durationSec = differenceInSeconds(parseISO(session.endedAt), parseISO(session.startedAt));
      if (!days[day]) days[day] = {};
      for (const entry of session.entries) {
        const m = members.find(mem => mem.id === entry.memberId);
        if (!m) continue;
        days[day][m.id] = (days[day][m.id] || 0) + durationSec / 3600;
      }
    }
    return Object.entries(days)
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
  }, [filteredSessions, members]);

  // calendar heatmap data
  const heatmapData = useMemo(() => {
    const days: Record<string, number> = {};
    for (const session of filteredSessions) {
      const day = format(startOfDay(parseISO(session.startedAt)), 'yyyy-MM-dd');
      const durationSec = session.endedAt
        ? differenceInSeconds(parseISO(session.endedAt), parseISO(session.startedAt))
        : differenceInSeconds(now, parseISO(session.startedAt));
      days[day] = (days[day] || 0) + durationSec;
    }
    return Object.entries(days)
      .map(([date, seconds]) => ({ date, hours: seconds / 3600 }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 90);
  }, [filteredSessions]);

  const maxHours = heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.hours)) : 1;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* range selector */}
      <div className="flex gap-1">
        {(['7d', '30d', '90d', 'all'] as const).map(r => (
          <Button
            key={r}
            variant={range === r ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setRange(r)}
            className={`text-xs lowercase ${range === r ? 'bg-[#f6b012] text-black hover:bg-[#f6b012]/90' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            {r === 'all' ? 'all time' : `last ${r}`}
          </Button>
        ))}
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Hash} label="total sessions" value={filteredSessions.length} />
        <StatCard icon={Clock} label="total hours" value={Math.round(memberStats.reduce((a, s) => a + s.totalSeconds, 0) / 3600)} />
        <StatCard icon={Calendar} label="active members" value={memberStats.length} />
        <StatCard icon={Hash} label="avg session" value={filteredSessions.length > 0
          ? formatDuration(
            new Date(now.getTime() - (memberStats.reduce((a, s) => a + s.totalSeconds, 0) / filteredSessions.length) * 1000).toISOString(),
            now.toISOString()
          )
          : '0s'
        } />
      </div>

      {/* per-member stats list */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
        <h3 className="text-sm text-white/60 lowercase mb-2">per-member stats</h3>
        <div className="space-y-1.5">
          {memberStats.map(s => (
            <div key={s.memberName} className="flex items-center gap-3 text-sm">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="lowercase truncate w-24" style={{ color: s.color }}>{s.memberName}</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (s.totalSeconds / (memberStats[0]?.totalSeconds || 1)) * 100)}%`,
                    backgroundColor: s.color,
                  }}
                />
              </div>
              <span className="text-xs text-white/40 lowercase w-16 text-right">
                {formatDuration(new Date(now.getTime() - s.totalSeconds * 1000).toISOString(), now.toISOString())}
              </span>
              <span className="text-xs text-white/30 lowercase w-10 text-right">{s.sessions}s</span>
            </div>
          ))}
          {memberStats.length === 0 && (
            <p className="text-sm text-white/30 lowercase">no front data for this period</p>
          )}
        </div>
      </div>

      {/* pie chart */}
      {pieData.length > 0 && (
        <div className="bg-white/5 rounded-lg p-3 border border-white/5 h-64">
          <h3 className="text-sm text-white/60 lowercase mb-2">time distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={d => `${d.name}: ${d.value}h`}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* daily bar chart */}
      {dailyData.length > 0 && (
        <div className="bg-white/5 rounded-lg p-3 border border-white/5 h-64">
          <h3 className="text-sm text-white/60 lowercase mb-2">daily fronting (hours)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tickFormatter={v => format(new Date(v), 'MM/dd')} stroke="#666" fontSize={10} />
              <YAxis stroke="#666" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }} />
              {Array.from(new Set(memberStats.map(s => s.memberName))).map((name, i) => {
                const m = members.find(mem => (mem.displayName || mem.name) === name);
                return <Bar key={name} dataKey={m?.id} name={name} stackId="a" fill={m?.color || '#888'} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* calendar heatmap */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
        <h3 className="text-sm text-white/60 lowercase mb-2">activity heatmap</h3>
        <div className="flex flex-wrap gap-1">
          {heatmapData.map(d => {
            const intensity = Math.min(1, d.hours / Math.max(1, maxHours * 0.5));
            const bg = `rgba(246, 176, 18, ${0.1 + intensity * 0.9})`;
            return (
              <div
                key={d.date}
                className="w-5 h-5 rounded-sm"
                style={{ backgroundColor: bg }}
                title={`${d.date}: ${Math.round(d.hours * 10) / 10}h`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-white/30">
          <span>less</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(a => (
              <div key={a} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(246,176,18,${a})` }} />
            ))}
          </div>
          <span>more</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
      <Icon className="h-4 w-4 text-[#f6b012] mb-1.5" />
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/40 lowercase">{label}</div>
    </div>
  );
}
