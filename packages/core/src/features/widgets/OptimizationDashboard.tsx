import { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollections, useCollection } from '@/hooks/use-collections';
import { useRecords } from '@/hooks/use-records';

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  } catch {
    return dateStr;
  }
}

export function OptimizationDashboard({ data, onUpdate }: { data?: any; onUpdate?: (patch: any) => void }) {
  const [configOpen, setConfigOpen] = useState(false);
  const { collections, loading: collectionsLoading } = useCollections();

  const collectionName = data?.collectionName || collections?.[0]?.name || 'captures';
  const { data: collection, loading: collectionLoading } = useCollection(collectionName);
  const { records, loading: recordsLoading } = useRecords(collectionName, { sort: '-createdAt', pageSize: 30 });

  const numericFields = useMemo(() => {
    const fields = collection?.fields || [];
    return fields.filter((f: any) => {
      const type = String(f.type || '').toLowerCase();
      const iface = String(f.interface || '').toLowerCase();
      return ['integer', 'double', 'number'].includes(type) || iface === 'number' || iface === 'input';
    });
  }, [collection]);

  const outputField = data?.outputField || numericFields[0]?.name || '';
  const frictionField = data?.frictionField || numericFields[1]?.name || numericFields[0]?.name || '';

  const chartData = useMemo(() => {
    if (!records || records.length === 0) return [];

    return records.slice(0, 14).map((rec) => {
      const dateStr = (rec as any).createdAt || (rec as any).date || ''; // try common fields
      const day = formatDay(dateStr);
      return {
        day,
        efficiency: Number((rec as any)[outputField]) || 0,
        friction: Number((rec as any)[frictionField]) || 0,
      };
    }).reverse();
  }, [records, outputField, frictionField]);

  const isLoading = collectionsLoading || collectionLoading || recordsLoading;

  const handleConfigChange = (patch: any) => {
    onUpdate?.(patch);
  };

  const currentCollectionName = data?.collectionName || collectionName;
  const currentOutputField = data?.outputField || outputField;
  const currentFrictionField = data?.frictionField || frictionField;

  return (
    <div className="w-full h-full bg-[#050505] border border-white/10 rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-bold lowercase tracking-widest">system efficiency</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-green-500"><div className="w-2 h-2 rounded-full bg-green-500" /> output</span>
            <span className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500" /> friction</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setConfigOpen((v) => !v)}
            title="configure"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {configOpen && (
        <div className="mb-4 p-3 border border-white/10 rounded-lg bg-black/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">collection</div>
              <Select value={currentCollectionName} onValueChange={(value) => handleConfigChange({ collectionName: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="select" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((col: any) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.title || col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">output field</div>
              <Select value={currentOutputField} onValueChange={(value) => handleConfigChange({ outputField: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="select" />
                </SelectTrigger>
                <SelectContent>
                  {numericFields.map((field: any) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.title || field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">friction field</div>
              <Select value={currentFrictionField} onValueChange={(value) => handleConfigChange({ frictionField: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="select" />
                </SelectTrigger>
                <SelectContent>
                  {numericFields.map((field: any) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.title || field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">data sourced from <span className="text-primary lowercase">{currentCollectionName}</span></div>
        </div>
      )}

      <div className="flex-1 min-h-[150px]">
        {isLoading && (
          <div className="text-xs text-primary/60 text-center py-4">loading data…</div>
        )}

        {!isLoading && chartData.length === 0 && (
          <div className="text-xs text-primary/60 text-center py-4">no data available</div>
        )}

        {!isLoading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
        )}
      </div>
    </div>
  );
}
