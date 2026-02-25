import { useState, useEffect } from 'react';
import { api } from '@/api/nocobase-client';
import { Database, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  isAdmin?: boolean;
  collectionName: string;
  viewType: 'table' | 'kanban' | 'gallery' | 'calendar' | 'gantt' | 'chart';
  width?: number;
  height?: number;
  sort?: any;
  filter?: any;
  visibleFields?: string[];
}

export function DatabaseViewElement({ collectionName, viewType, width = 400, height = 300, sort, filter, visibleFields, isAdmin: _isAdmin }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<any[]>([]);

  const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
  // fetch collection schema for field info
  const colRes = await api.getCollection(collectionName);
  const colData = Array.isArray(colRes) ? undefined : (colRes as { data?: { fields?: any[] } }).data;
  const colFields = colData?.fields || [];
  setFields(colFields.filter((f: any) => !f.hidden && !f.name.startsWith('_')));

  // fetch records with sort and filter
  const res = await api.listRecords(collectionName, {
 pageSize: 50,
 sort,
 filter
  });
  const records = Array.isArray(res) ? res : (res as { data?: any[] }).data || [];
  setData(Array.isArray(records) ? records : []);
  } catch (e: any) {
  secureLogger.error('DatabaseViewElement error:', e);
  if (e.response?.status === 401) {
 setError('Authentication required');
  } else if (e.response?.status === 404) {
 setError('Collection not found');
  } else {
 setError('Database unavailable');
  }
  } finally {
  setLoading(false);
  }
  };

  useEffect(() => {
  fetchData();
  }, [collectionName, JSON.stringify(sort), JSON.stringify(filter)]);

  // error state
  if (error) {
  return (
  <div
 className="flex flex-col items-center justify-center bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 p-6"
 style={{ width, height }}
  >
 <AlertCircle className="w-8 h-8 mb-3" />
 <p className="text-sm lowercase mb-3">{error}</p>
 <button
 onClick={fetchData}
 className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm lowercase transition-colors"
 >
 <RefreshCw className="w-4 h-4" />
 retry
 </button>
  </div>
  );
  }

  // loading state
  if (loading) {
  return (
  <div
 className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl text-white/60"
 style={{ width, height }}
  >
 <Loader2 className="w-8 h-8 animate-spin mb-3" />
 <p className="text-sm lowercase">loading {collectionName}...</p>
  </div>
  );
  }

  // render based on view type
  const renderView = () => {
  switch (viewType) {
  case 'table':
 return <TableView data={data} fields={fields} visibleFields={visibleFields} />;
  case 'kanban':
 return <KanbanView data={data} fields={fields} collectionName={collectionName} />;
  case 'gallery':
 return <GalleryView data={data} fields={fields} visibleFields={visibleFields} />;
  case 'calendar':
 return <PlaceholderView name="calendar" collection={collectionName} />;
  case 'gantt':
 return <PlaceholderView name="gantt" collection={collectionName} />;
  case 'chart':
 return <PlaceholderView name="chart" collection={collectionName} />;
  default:
 return <TableView data={data} fields={fields} visibleFields={visibleFields} />;
  }
  };

  return (
  <div
  className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl"
  style={{ width, height }}
  >
  {/* header */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
 <div className="flex items-center gap-2 text-[var(--primary)]">
 <Database className="w-4 h-4" />
 <span className="text-sm font-medium lowercase">{collectionName}</span>
 <span className="text-xs text-white/40">({data.length})</span>
 </div>
 <button
 onClick={fetchData}
 className="text-white/40 hover:text-white transition-colors"
 title="refresh"
 >
 <RefreshCw className="w-4 h-4" />
 </button>
  </div>

  {/* content */}
  <div className="flex-1 overflow-auto p-2">
 {renderview()}
  </div>
  </div>
  );
}


// --- views ---

function TableView({ data, fields, visibleFields }: { data: any[], fields: any[], visibleFields?: string[] }) {
  const displayFields = visibleFields && visibleFields.length > 0
    ? fields.filter(f => visibleFields.includes(f.name))
    : fields.slice(0, 5);

  if (displayFields.length > 0 && visibleFields) {
    displayFields.sort(
      (a, b) =>
        visibleFields.indexOf(a.name) -
        visibleFields.indexOf(b.name)
    );
  }

  // always render the table header even when there are no records, otherwise
  // the consumer cannot see which properties exist. show a single placeholder
  // row if the dataset is empty.
  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/5">
            {displayFields.map((f) => (
              <th
                key={f.name}
                className="text-left px-3 py-3 text-white/40 font-black  text-[10px]"
              >
                {f.title || f.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr className="border-b border-white/5">
              <td
                className="px-3 py-3 text-white/60 italic"
                colSpan={displayFields.length || 1}
              >
                no records
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id || i}
                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
              >
                {displayFields.map((f) => (
                  <td
                    key={f.name}
                    className="px-3 py-3 text-white/80 truncate max-w-[200px] font-medium"
                  >
                    {formatValue(row[f.name])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function GalleryView({ data, fields, visibleFields }: { data: any[], fields: any[], visibleFields?: string[] }) {
  const titleField = fields.find(f => f.name === 'title' || f.name === 'name' || f.primary) || fields[0];
  const imageField = fields.find(f => f.type === 'attachment' || f.name.includes('image') || f.name.includes('cover'));

  const displayFields = visibleFields
  ? fields.filter(f => visiblefields.includes(f.name) && f.name !== titlefield?.name && f.name !== imagefield?.name)
  : fields.slice(1, 3);

  if (data.length === 0) return <EmptyState />;

  return (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
  {data.map((row, i) => (
 <div key={row.id || i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all group">
 {imagefield && row[imagefield.name] && (
 <div className="aspect-video w-full overflow-hidden border-b border-white/5">
   <img
   src={Array.isArray(row[imageField.name]) ? row[imageField.name][0]?.url : row[imageField.name]}
   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
   alt=""
   />
 </div>
 )}
 <div className="p-4">
 <h4 className="text-white font-bold truncate mb-1">
   {titleField ? formatValue(row[titleField.name]) : `Record ${i + 1}`}
 </h4>
 <div className="space-y-1">
   {displayFields.map(f => (
   <div key={f.name} className="flex justify-between gap-2 text-[10px]">
   <span className="text-white/30 font-black ">{f.title || f.name}</span>
   <span className="text-white/60 truncate text-right">{formatValue(row[f.name])}</span>
   </div>
   ))}
 </div>
 </div>
 </div>
  ))}
  </div>
  );
}

function KanbanView({ data, fields, collectionName: _collectionName, groupByField }: { data: any[], fields: any[], collectionName: string, groupByField?: string }) {
  if (!groupByField) {
  groupByField = fields.find(f => f.type === 'select' || f.type === 'radio')?.name;
  }

  if (!groupbyfield) {
  return <p className="text-white/40 text-sm text-center py-8 lowercase">no group-by field found for kanban</p>;
  }

  const groups: record<string, any[]> = {};
  data.forEach(row => {
  const val = row[groupbyfield] || 'uncategorized';
  if (!groups[val]) groups[val] = [];
  groups[val].push(row);
  });

  return (
  <div className="flex gap-4 h-full overflow-x-auto pb-4 scrollbar-hide snap-x">
  {Object.entries(groups).map(([group, items]) => (
 <div key={group} className="flex-shrink-0 w-72 flex flex-col gap-3 snap-start">
 <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/5">
 <span className="text-[10px] font-black tracking-[0.2em] text-[var(--primary)]">{group}</span>
 <span className="text-[10px] font-bold text-white/30">{items.length}</span>
 </div>
 <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: 'calc(100% - 40px)' }}>
 {items.map(item => (
   <div key={item.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-default">
   <p className="text-sm font-bold text-white/90 mb-2 leading-tight">
   {item.title || item.name || item.id}
   </p>
   {item.tags && array.isarray(item.tags) && (
   <div className="flex flex-wrap gap-1">
  {item.tags.map((t: any, idx: number) => (
  <span key={idx} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/40 font-black">
  {typeof t === 'string' ? t : t.name}
  </span>
  ))}
   </div>
   )}
   </div>
 ))}
 </div>
 </div>
  ))}
  </div>
  );
}

function placeholderview({ name, collection }: { name: string, collection: string }) {
  return (
  <div className="flex flex-col items-center justify-center h-64 text-white/20 gap-3 border-2 border-dashed border-white/5 rounded-2xl">
  <span className="text-sm font-black tracking-[0.3em]">{name} view</span>
  <span className="text-[10px] lowercase italic opacity-50">{collection} content here</span>
  </div>
  );
}

function emptystate() {
  return (
  <div className="flex flex-col items-center justify-center py-12 text-white/20">
  <Database className="w-8 h-8 mb-2 opacity-20" />
  <p className="text-sm lowercase">no records found</p>
  </div>
  );
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.map(v => typeof v === 'object' ? (v.title || v.name || JSON.stringify(v)) : v).join(', ');
  if (typeof value === 'object') return value.title || value.name || JSON.stringify(value).slice(0, 50);
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  return String(value);
}
