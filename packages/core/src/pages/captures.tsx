import { useRecords } from '@/hooks/use-records';
import { useCollection } from '@/hooks/use-collections';
import { RecordGallery } from '@/features/records/components/record-gallery';
import { Loader2, Plus } from 'lucide-react';
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
        <p className="text-xl mb-4 lowercase">no captures yet</p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-amber-500 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-black transition-all lowercase font-medium"
        >
          <Plus className="h-5 w-5" />
          new capture
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
        <p className="text-xl mb-4 lowercase">no captures yet</p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-amber-500 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-black transition-all lowercase font-medium"
        >
          <Plus className="h-5 w-5" />
          new capture
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

