import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';

const mockData = [
  { day: 'Mon', efficiency: 65, friction: 40 },
  { day: 'Tue', efficiency: 55, friction: 60 },
  { day: 'Wed', efficiency: 80, friction: 30 },
  { day: 'Thu', efficiency: 70, friction: 45 },
  { day: 'Fri', efficiency: 90, friction: 20 },
  { day: 'Sat', efficiency: 85, friction: 25 },
  { day: 'Sun', efficiency: 60, friction: 50 },
];

export function OptimizationDashboard() {
  return (
    <div className="w-full h-full bg-[#050505] border border-white/10 rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">System Efficiency</span>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-green-500"><div className="w-2 h-2 rounded-full bg-green-500" /> Output</span>
          <span className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500" /> Friction</span>
        </div>
      </div>

      <div className="flex-1 min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px', textTransform: 'lowercase' }}
            />
            <Line type="monotone" dataKey="efficiency" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="friction" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
