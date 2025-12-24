
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Settings2 } from 'lucide-react';
import { RecordTable } from '@/components/record-table';
import { CreateFieldDialog } from '@/components/create-field-dialog';
import { toast } from 'sonner';

interface CollectionDetailPageProps {
    collectionName: string;
    onBack: () => void;
}

export function CollectionDetailPage({ collectionName, onBack }: CollectionDetailPageProps) {
    const { client } = useAuth();
    const [collection, setCollection] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Collection Schema (to get latest fields)
            const colRes = await client.getCollection(collectionName);
            setCollection(colRes.data);

            // 2. Fetch Records
            const recRes = await client.listRecords(collectionName);
            // NocoBase response structure handling
            const recData = Array.isArray(recRes.data) ? recRes.data : (recRes.data as any)?.data || [];
            setRecords(recData);

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to load collection data");
        } finally {
            setLoading(false);
        }
    }, [client, collectionName]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !collection) {
        return <div className="p-10 text-center animate-pulse">Loading {collectionName}...</div>;
    }

    if (!collection) {
        return <div className="p-10 text-center text-destructive">Collection not found</div>;
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold lowercase tracking-tight">
                            {collection.title || collection.displayName || collection.name}
                        </h2>
                        <p className="text-xs text-muted-foreground lowercase opacity-70">
                            {collection.name} &bull; {records.length} records
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <CreateFieldDialog collectionName={collectionName} onFieldCreated={fetchData} />
                    <Button variant="ghost" size="icon">
                        <Settings2 className="h-5 w-5 opacity-50" />
                    </Button>
                </div>
            </div>

            {/* Content (Infinite Canvas style - but Table for now) */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <RecordTable
                    data={records}
                    collection={collection}
                    loading={loading}
                // Implement these later
                // onEdit={(rec) => console.log('edit', rec)}
                // onDelete={(rec) => console.log('delete', rec)}
                />
            </div>
        </div>
    );
}
