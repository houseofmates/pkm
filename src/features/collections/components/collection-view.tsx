

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RecordTable } from '@/features/records/components/record-table';
import { useRecords } from '@/hooks/use-records';
import { useAuth } from '@/contexts/auth-context';
import type { Collection } from '@/hooks/use-collections';
import { ArrowLeft, Loader2, RotateCcw, Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RecordForm } from '@/features/records/components/record-form';
import { Input } from '@/components/ui/input';
import { toast } from "sonner"

import { useLLMStore } from '@/stores/llm-store';

interface CollectionViewProps {
  collection: Collection;
  onBack: () => void;
}

export function CollectionView({ collection, onBack }: CollectionViewProps) {
  const { client } = useAuth();
  const { records, loading, error, refresh } = useRecords(collection.name);
  const { setContext } = useLLMStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // context stuffing: push current data to llm
  useEffect(() => {
  if (!loading && records) {
  setContext({
 type: 'collection',
 name: collection.name,
 title: collection.title,
 fields: collection.fields?.map((f: any) => f.name), // Simplify schema
 records: records.slice(0, 10) // Limit to top 10 for context window
  });
  }
  return () => setContext(null);
  }, [collection, records, loading, setContext]);

  const handleCreate = async (data: any) => {
  try {
  await client.createRecord(collection.name, data);
  setIsCreateOpen(false);
  refresh();
  toast.success("record created successfully");
  } catch (err) {
  console.error("Failed to create record", err);
  toast.error("failed to create record");
  }
  };

  const handleUpdate = async (data: any) => {
  if (!editingRecord) return;
  try {
  // assume 'id' is the primary key for now
  await client.updateRecord(collection.name, editingRecord.id, data);
  setEditingRecord(null);
  refresh();
  toast.success("record updated successfully");
  } catch (err) {
  console.error("Failed to update record", err);
  toast.error("failed to update record");
  }
  };

  const handleDelete = async (record: any) => {
  if (!confirm('Are you sure you want to delete this record?')) return;
  try {
  await client.deleteRecord(collection.name, record.id);
  refresh();
  toast.success("record deleted successfully");
  } catch (err) {
  console.error("Failed to delete record", err);
  toast.error("failed to delete record");
  }
  };

  const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  // basic search on 'title' or 'name' or first field?
  // nocobase filter: { title: { $includes: searchterm } }
  // we need to guess a field to search on if schema is generic.
  // or just search on 'id' if numeric?
  // for now, let's try searching on 'title' if it exists, or 'name'.

  const searchField = collection.fields?.find((f: any) => f.name === 'title' || f.name === 'name' || f.type === 'string')?.name || 'id';

  const filter = searchTerm ? { [searchField]: { $includes: searchTerm } } : undefined;
  refresh({ filter });
  };

  return (
  <div className="space-y-4">
  <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Button variant="ghost" size="sm" onClick={onBack}>
 <ArrowLeft className="mr-2 h-4 w-4" />
 Back
 </Button>
 <h2 className="text-2xl font-bold ">{collection.title || collection.displayName || collection.name}</h2>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
 <RotateCcw className={`mr - 2 h - 4 w - 4 ${loading ? 'animate-spin' : ''} `} />
 Refresh
 </Button>
 <Button size="sm" onClick={() => setIsCreateOpen(true)}>
 <Plus className="mr-2 h-4 w-4" />
 Create New
 </Button>
 </div>
  </div>

  <form onSubmit={handleSearch} className="flex gap-2">
 <Input
 placeholder="Search..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="max-w-xs"
 />
 <Button type="submit" variant="secondary" size="icon">
 <Search className="h-4 w-4" />
 </Button>
  </form>

  {error && (
 <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200">
 Error: {error}
 </div>
  )}

  {loading && records.length === 0 ? (
 <div className="flex items-center justify-center h-64">
 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
  ) : (
 <RecordTable
 data={records}
 collection={collection}
 onEdit={setEditingRecord}
 onDelete={handleDelete}
 />
  )}

  {/* create dialog */}
  <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>create new record</DialogTitle>
 </DialogHeader>
 <RecordForm
 collection={collection}
 onSubmit={handleCreate}
 onCancel={() => setIsCreateOpen(false)}
 />
 </DialogContent>
  </Dialog>

  {/* edit dialog */}
  <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>edit record</DialogTitle>
 </DialogHeader>
 {editingRecord && (
 <RecordForm
   collection={collection}
   initialData={editingRecord}
   onSubmit={handleUpdate}
   onCancel={() => setEditingRecord(null)}
 />
 )}
 </DialogContent>
  </Dialog>
  </div>
  );
}
