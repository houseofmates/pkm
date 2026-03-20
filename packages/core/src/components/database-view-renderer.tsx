import { useState, useEffect } from 'react';
import { Calendar, BarChart2, List, Grid } from 'lucide-react';
import api from '@/api/nocobase-client';
import { cn } from '@/lib/utils';

interface DatabaseViewProps {
  collection: string;
  view: 'table' | 'cards' | 'calendar' | 'chart' | 'kanban' | 'list';
  filter?: Record<string, any>;
  limit?: number;
  groupBy?: string;
  chartType?: 'bar' | 'line' | 'pie';
}

export function DatabaseView({ 
  collection, 
  view, 
  filter, 
  limit = 50,
  groupBy,
  chartType = 'bar'
}: DatabaseViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [collection, filter, limit]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await api.listRecords(collection, {
        filter,
        pageSize: limit,
        sort: '-createdAt'
      });
      setData(res?.data || []);
    } catch (err) {
      console.error(`failed to load ${collection}`, err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse">
        <div className="h-32 bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <p className="text-center text-white/30 text-sm lowercase py-4">
          no data in {collection}
        </p>
      </div>
    );
  }

  switch (view) {
    case 'table':
      return <TableView data={data} />;
    case 'cards':
      return <CardsView data={data} />;
    case 'calendar':
      return <CalendarView data={data} />;
    case 'chart':
      return <ChartView data={data} groupBy={groupBy} chartType={chartType} />;
    case 'kanban':
      return <KanbanView data={data} groupBy={groupBy || 'status'} />;
    case 'list':
      return <ListView data={data} />;
    default:
      return <ListView data={data} />;
  }
}

function TableView({ data }: { data: any[] }) {
  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'id') : [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map(col => (
              <th key={col} className="px-3 py-2 text-left text-xs text-white/40 lowercase">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
              {columns.map(col => (
                <td key={col} className="px-3 py-2 text-white/70 lowercase">
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardsView({ data }: { data: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {data.map((item, i) => (
        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
          {Object.entries(item)
            .filter(([key]) => key !== 'id')
            .slice(0, 3)
            .map(([key, value]) => (
              <div key={key} className="mb-1">
                <span className="text-xs text-white/40 lowercase">{key}: </span>
                <span className="text-sm text-white/70">{formatValue(value)}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function CalendarView({ data }: { data: any[] }) {
  const dateField = Object.keys(data[0] || {}).find(k => 
    k.includes('date') || k.includes('timestamp') || k.includes('created')
  ) || 'createdAt';

  const eventsByDate: Record<string, any[]> = {};
  data.forEach(item => {
    const date = item[dateField]?.split('T')[0];
    if (date) {
      if (!eventsByDate[date]) eventsByDate[date] = [];
      eventsByDate[date].push(item);
    }
  });

  const dates = Object.keys(eventsByDate).sort().reverse();

  return (
    <div className="space-y-2">
      {dates.slice(0, 10).map(date => (
        <div key={date} className="p-3 rounded-lg bg-white/[0.02]">
          <p className="text-xs text-white/40 lowercase mb-2">{date}</p>
          <div className="space-y-1">
            {eventsByDate[date].map((item, i) => (
              <div key={i} className="text-sm text-white/70 lowercase">
                • {Object.values(item).slice(1, 2).join(', ')}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartView({ 
  data, 
  groupBy, 
  chartType 
}: { 
  data: any[]; 
  groupBy?: string; 
  chartType: 'bar' | 'line' | 'pie';
}) {
  if (!groupBy) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <p className="text-center text-white/30 text-sm lowercase">
          groupBy parameter required for chart view
        </p>
      </div>
    );
  }

  const grouped: Record<string, number> = {};
  data.forEach(item => {
    const key = item[groupBy] || 'unknown';
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const chartData = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxValue = Math.max(...chartData.map(([, v]) => v));

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <p className="text-xs text-white/40 lowercase mb-3">{groupBy} distribution</p>
      <div className="space-y-2">
        {chartData.map(([label, value]) => {
          const percentage = (value / maxValue) * 100;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="w-24 text-xs text-white/60 lowercase truncate">{label}</div>
              <div className="flex-1 h-6 bg-white/5 rounded-lg relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-blue-500/40 transition-all"
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
                  {value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanView({ data, groupBy }: { data: any[]; groupBy: string }) {
  const grouped: Record<string, any[]> = {};
  data.forEach(item => {
    const key = item[groupBy] || 'uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Object.entries(grouped).map(([status, items]) => (
        <div key={status} className="flex-shrink-0 w-64">
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm lowercase text-white">{status}</span>
              <span className="text-xs text-white/40">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  {Object.entries(item)
                    .filter(([key]) => key !== 'id' && key !== groupBy)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div key={key} className="text-xs text-white/60 lowercase">
                        {formatValue(value)}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ data }: { data: any[] }) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
          {Object.entries(item)
            .filter(([key]) => key !== 'id')
            .map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 mb-1">
                <span className="text-xs text-white/40 lowercase min-w-[80px]">{key}:</span>
                <span className="text-sm text-white/70 flex-1">{formatValue(value)}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && value.length > 100) return value.slice(0, 100) + '...';
  return String(value);
}

// markdown parser for {{database:name view:type}} syntax
export function parseDatabaseTags(content: string): Array<{ tag: string; props: DatabaseViewProps }> {
  const regex = /\{\{database:(\w+)\s+view:(\w+)(?:\s+filter:(\w+))?(?:\s+limit:(\d+))?(?:\s+groupBy:(\w+))?(?:\s+type:(\w+))?\}\}/g;
  const matches: Array<{ tag: string; props: DatabaseViewProps }> = [];
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push({
      tag: match[0],
      props: {
        collection: match[1],
        view: match[2] as any,
        filter: match[3] ? { [match[3]]: true } : undefined,
        limit: match[4] ? parseInt(match[4]) : undefined,
        groupBy: match[5],
        chartType: match[6] as any
      }
    });
  }
  
  return matches;
}
