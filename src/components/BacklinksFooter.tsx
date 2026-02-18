import { useEffect, useState } from 'react';
import { api } from '@/api/nocobase-client';
import { Link } from 'react-router-dom';

interface Backlink {
  id: string;
  title: string;
  collection: string;
  snippet?: string;
}

export function BacklinksFooter({ recordId, collectionName }: { recordId: string, collectionName: string }) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  if (!recordId) return;

  const fetchBacklinks = async () => {
  setLoading(true);
  try {
 // Search for mentions of this record's ID in common collections
 // We assume links are stored as hrefs containing the ID
 const collections = ['notes', 'tasks'];
 const found: Backlink[] = [];

 for (const col of collections) {
 // Skip self-collection if needed, but cross-refs are possible
 const res = await api.listRecords(col, {
 filter: {
   // This is a naive text search for the ID.
   // Robustness depends on NocoBase's ability to search the content field.
   // Assuming 'content' field exists.
   content: { $includes: recordId }
 },
 pageSize: 5
 });

 // Handle both array response and { data: { data: [] } } response
 const records = Array.isArray(res) ? res : ((res as { data?: { data?: unknown[] } })?.data?.data || []);
 if (records.length > 0) {
 found.push(...(records as Array<{ id: string; title?: string }>).map((r) => ({
   id: r.id,
   title: r.title || 'untitled',
   collection: col
 })));
 }
 }

 // Filter out self
 const filtered = found.filter(b => b.id !== recordId);
 setBacklinks(filtered);
  } catch (e) {
 console.error("Failed to fetch backlinks", e);
  } finally {
 setLoading(false);
  }
  };

  fetchBacklinks();
  }, [recordId, collectionName]);

  if (loading) return <div className="text-muted-foreground text-xs mt-8 pl-4">loading mentions...</div>; 
  if (backlinks.length === 0) return null;

  return (
  <div className="mt-12 pt-6 border-t border-border">
  <h3 className="text-sm font-bold text-muted-foreground mb-4 ">linked mentions</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {backlinks.map(link => (
 <Link
 key={`${link.collection}-${link.id}`}
 to={`/databases/${link.collection}/${link.id}`}
 className="block p-3 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all"
 >
 <div className="text-sm font-medium">{link.title}</div>
 <div className="text-xs text-muted-foreground ">{link.collection}</div>
 </Link>
 ))}
  </div>
  </div>
  );
}
