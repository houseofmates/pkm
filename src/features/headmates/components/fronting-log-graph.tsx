import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useFronter } from '@/contexts/fronter-context';
import { useMemo } from 'react';
import { format } from 'date-fns';

export function FrontingLogGraph() {
  const { history, members } = useFronter();

  const data = useMemo(() => {
  // Transform history into graph data
  // We want a timeline.
  // For simple bar chart: show duration per day?
  // Or Gantt? Recharts is hard for Gantt.
  // Let's do a Stacked Bar Chart by Day for "Time Fronted".

  // 1. Group by Day
  const days: Record<string, Record<string, number>> = {};

  history.forEach(entry => {
  if (!entry.endTime) return; // Skip active or calculate partial? Skip for now.
  const date = entry.startTime.split('T')[0];
  const start = new Date(entry.startTime).getTime();
  const end = new Date(entry.endTime).getTime();
  const durationHours = (end - start) / (1000 * 60 * 60);

  if (!days[date]) days[date] = { date: new Date(date).getTime() } as any;

  entry.members.forEach(m => {
 days[date][m.id] = (days[date][m.id] || 0) + durationHours;
  });
  });

  // Convert to array and sort
  return Object.entries(days)
  .map(([k, v]) => ({ date: k, ...v }))
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(-14); // Last 14 days
  }, [history]);

  // Get unique members in this period
  const activeMemberIds = useMemo(() => {
  const ids = new Set<string>();
  data.forEach(d => {
  Object.keys(d).forEach(k => {
 if (k !== 'date') ids.add(k);
  });
  });
  return Array.from(ids);
  }, [data]);

  return (
  <div className="w-full h-[300px] bg-background/50 border border-primary/20 rounded-lg p-4">
  <h3 className="text-sm font-bold text-primary mb-4 ">Fronting History (Last 14 Days)</h3>
  <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data} stackOffset="sign">
 <XAxis
 dataKey="date"
 tickFormatter={(val) => format(new Date(val), 'MM/dd')}
 stroke="#666"
 fontSize={10}
 />
 <YAxis stroke="#666" fontSize={10} />
 <Tooltip
 contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
 labelStyle={{ color: '#fff' }}
 />
 <Legend wrapperStyle={{ fontSize: '10px' }} />
 {activeMemberIds.map((id) => {
 const m = members.find(mem => mem.id === id);
 return (
   <Bar
   key={id}
   dataKey={id}
   name={m?.name || 'Unknown'}
   stackId="a"
   fill={m?.color || '#8884d8'}
   />
 );
 })}
 </BarChart>
  </ResponsiveContainer>
  </div>
  );
}
