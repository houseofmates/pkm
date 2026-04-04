import { useRecords } from '@/hooks/use-records';
import { useCollection } from '@/hooks/use-collections';
import { RecordGallery } from '@/features/records/components/record-gallery';
import { Loader2, Plus, Camera } from 'lucide-react';
import { useState } from 'react';

export function CapturesPage() {
  const { data: collection, loading: colLoading } = useCollection('captures');
  const { records, loading: recLoading, error, updateRecord, deleteRecord } = useRecords('captures', {
    sort: '-createdAt',
    pageSize: 50
  });
  const [showForm, setShowForm] = useState(false);

  const loading = colLoading || recLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-primary">
        <Loader2 className="animate-spin mr-2" />
        <span>loading feed...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500">
        <h2 className="text-xl font-bold mb-2">signal loss</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!collection) {
    return <div className="p-8">collection 'captures' not found. please create it in nocobase.</div>;
  }

  if (records.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Camera className="w-12 h-12 text-amber-500/50 mb-4" />
        <h3 className="text-lg font-medium text-zinc-200 mb-2">
          No captures yet
        </h3>
        <p className="text-sm text-zinc-500 mb-6">
          Capture ideas, links, and content from anywhere
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Capture
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex-1 overflow-auto no-scrollbar">
        <RecordGallery
          data={records}
          collection={collection}
          onUpdateRecord={updateRecord}
          onDelete={(rec) => deleteRecord(rec.id)}
        />
      </div>
    </div>
  );
}
