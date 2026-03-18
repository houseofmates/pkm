import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/api/nocobase-client';
import { Loader2 } from 'lucide-react';
import { secureLogger } from '@/lib/secure-logger';

interface DashboardCardProps {
  collectionName: string;
  filter?: unknown;
  title?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = React.memo(({ collectionName, filter, title }) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // moved early return check to useEffect to avoid conditional hooks
  const isValidCollection = Boolean(collectionName);

  const handleClick = useCallback((item: Record<string, unknown>) => {
    // ideally open a drawer or navigate
    secureLogger.info('Clicked item', item);
  }, []);

  useEffect(() => {
  const fetchData = async () => {
  if (!isValidCollection) return;
  setLoading(true);
  try {
 // parse filter if it's a string (coming from tiptap attributes)
 let queryFilter = filter;
 if (typeof filter === 'string') {
 try {
 queryFilter = JSON.parse(filter);
 } catch {
 secureLogger.warn('Invalid filter JSON:', filter);
 }
 }

 const res = await api.listRecords(collectionName, {
 filter: queryFilter,
 pageSize: 12, // Limit for dashboard view
 sort: '-createdAt'
 });

 const items = Array.isArray(res?.data) ? res.data : (res?.data as { data?: unknown[] })?.data || [];
 setData(items);
  } catch (err) {
 secureLogger.error('Dashboard fetching error:', err);
 setError('Failed to load data');
  } finally {
 setLoading(false);
  }
  };

  fetchData();

  // refresh every minute
  const interval = setInterval(fetchData, 60000);
  return () => clearInterval(interval);
  }, [collectionName, filter, isValidCollection]);

  if (!isValidCollection) return null;

  return (
  <div className="dashboard-card my-4 p-4 border rounded-xl bg-card text-card-foreground shadow-sm overflow-hidden isolate relative">
  <h3 className="text-lg font-bold mb-4 font-['Varela_Round'] flex items-center justify-between">
 <span>{title || collectionName}</span>
 {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
  </h3>

  {error && <div className="text-red-500 text-sm">{error}</div>}

  {!loading && data.length === 0 && (
 <div className="text-muted-foreground text-sm italic">no items found.</div>
  )}

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {data.map((item: Record<string, unknown>) => (
 <div
 key={String(item.id ?? '')}
 className="p-3 border rounded-md bg-background hover:bg-accent/50 transition-colors cursor-pointer"
 style={{ fontFamily: '"Varela Round", sans-serif' }}
 onClick={() => handleClick(item)}
 >
 <div className="font-semibold truncate">
   {String(item.title ?? item.name ?? item.id ?? '')}
 </div>
 {Boolean(item.status) && (
   <div className="text-xs text-muted-foreground mt-1">
   {String(item.status)}
   </div>
 )}
 <div className="text-xs text-muted-foreground mt-2 truncate opacity-70">
   {new Date(String(item.createdAt ?? item.created_at ?? Date.now())).toLocaleDateString()}
 </div>
 </div>
 ))}
  </div>
  </div>
  );
});
