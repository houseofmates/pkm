import { useRecords } from '@/hooks/use-records';
import { useCollection } from '@/hooks/use-collections';
import { RecordGallery } from '@/features/records/components/record-gallery';
import { Loader2 } from 'lucide-react';

export function CapturesPage() {
    const { data: collection, loading: colLoading } = useCollection('captures');
    const { records, loading: recLoading, error, updateRecord, deleteRecord } = useRecords('captures', {
        sort: ['-createdAt'], // Newest first
        pageSize: 50
    });

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

    return (
        <div className="h-full flex flex-col p-4 overflow-hidden">
            <div className="flex-1 overflow-auto no-scrollbar">
                <RecordGallery
                    data={records}
                    collection={collection}
                    onUpdateRecord={updateRecord}
                    onDelete={deleteRecord}
                />
            </div>
        </div>
    );
}

