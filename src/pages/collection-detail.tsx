
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { RecordTable } from '@/components/record-table';
import { CreateFieldDialog } from '@/components/create-field-dialog';
import { toast } from 'sonner';

interface CollectionDetailPageProps {
    collectionName: string;
    onBack: () => void;
}

import { CreateRecordDialog } from '@/components/create-record-dialog';

export function CollectionDetailPage({ collectionName, onBack }: CollectionDetailPageProps) {
    const { client } = useAuth();
    const [collection, setCollection] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Collection Schema
            const colRes = await client.getCollection(collectionName);
            const colData = colRes.data;
            setCollection(colData);

            // Auto-Create 'fronter' field if missing
            if (colData && colData.fields) {
                const hasFronter = colData.fields.some((f: any) => f.name === 'fronter');
                if (!hasFronter) {
                    try {
                        console.log("Auto-creating 'fronter' field for", collectionName);
                        await client.createField(collectionName, {
                            name: 'fronter',
                            interface: 'input',
                            uiSchema: { title: 'Fronter' }
                        });
                        // Don't await refetch, just let it happen on next load or manual refresh to avoid loops
                    } catch (e) {
                        console.warn("Failed to auto-create fronter field", e);
                    }
                }
            }

            // 2. Fetch Records
            const recRes = await client.listRecords(collectionName);
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
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
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
                    <CreateRecordDialog
                        collectionName={collectionName}
                        fields={collection.fields || []}
                        onRecordCreated={fetchData}
                    />
                    <CreateFieldDialog collectionName={collectionName} onFieldCreated={fetchData} />
                    <Button variant="ghost" size="icon">
                        <Settings2 className="h-5 w-5 opacity-50" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <RecordTable
                    data={records}
                    collection={collection}
                    loading={loading}
                />
            </div>
        </div>
    );
}
