import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { CreateFieldDialog } from '@/components/create-field-dialog';
import { toast } from 'sonner';

interface CollectionDetailPageProps {
    collectionName: string;
    onBack: () => void;
}

import { CreateRecordDialog } from '@/components/create-record-dialog';
import { type ViewType, VIEW_REGISTRY, VIEW_OPTIONS } from '@/components/views/registry';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CollectionDetailPage({ collectionName, onBack }: CollectionDetailPageProps) {
    const { client } = useAuth();
    const [collection, setCollection] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState<ViewType>('table');
    const [viewConfig, setViewConfig] = useState<Record<string, any>>({});

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

    // Load view config on view change or collection load
    useEffect(() => {
        const key = `view_config_${collectionName}_${currentView}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) setViewConfig(JSON.parse(saved));
            else setViewConfig({});
        } catch (e) {
            console.error("Failed to load view config", e);
        }
    }, [collectionName, currentView]);

    const handleConfigChange = (key: string, value: any) => {
        const newConfig = { ...viewConfig, [key]: value };
        setViewConfig(newConfig);
        localStorage.setItem(`view_config_${collectionName}_${currentView}`, JSON.stringify(newConfig));
    };

    if (loading && !collection) {
        return <div className="p-10 text-center animate-pulse">Loading {collectionName}...</div>;
    }

    if (!collection) {
        return <div className="p-10 text-center text-destructive">Collection not found</div>;
    }

    const CurrentViewComponent = VIEW_REGISTRY[currentView] || VIEW_REGISTRY['table'];

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between p-4 pb-2">
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

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Settings2 className="h-5 w-5 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-4">
                                    <h4 className="font-medium leading-none border-b pb-2 mb-2">View Settings</h4>

                                    {/* Gallery Settings */}
                                    {currentView === 'gallery' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Cover Image Field</Label>
                                                <Select
                                                    value={viewConfig.coverField || '_auto'}
                                                    onValueChange={(val) => handleConfigChange('coverField', val === '_auto' ? undefined : val)}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="_auto">Auto-detect</SelectItem>
                                                        {collection.fields
                                                            ?.filter((f: any) => f.interface === 'attachment' || f.name.includes('image'))
                                                            .map((f: any) => (
                                                                <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Title Field</Label>
                                                <Select
                                                    value={viewConfig.titleField || '_auto'}
                                                    onValueChange={(val) => handleConfigChange('titleField', val === '_auto' ? undefined : val)}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="_auto">Auto-detect</SelectItem>
                                                        {collection.fields
                                                            ?.filter((f: any) => f.interface === 'input' || f.type === 'string')
                                                            .map((f: any) => (
                                                                <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Kanban Settings */}
                                    {currentView === 'kanban' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Group By Field</Label>
                                                <Select
                                                    value={viewConfig.groupByField}
                                                    onValueChange={(val) => handleConfigChange('groupByField', val)}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                                                    <SelectContent>
                                                        {collection.fields
                                                            ?.filter((f: any) => f.interface === 'select' || f.interface === 'radioGroup' || f.type === 'string')
                                                            .map((f: any) => (
                                                                <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Calendar Settings */}
                                    {currentView === 'calendar' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Date Field</Label>
                                                <Select
                                                    value={viewConfig.dateField}
                                                    onValueChange={(val) => handleConfigChange('dateField', val)}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Select date field" /></SelectTrigger>
                                                    <SelectContent>
                                                        {collection.fields
                                                            ?.filter((f: any) => f.interface === 'datetime' || f.interface === 'date' || f.type === 'date')
                                                            .map((f: any) => (
                                                                <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Placeholder for other views */}
                                    {currentView !== 'gallery' && currentView !== 'kanban' && currentView !== 'calendar' && (
                                        <p className="text-sm text-muted-foreground">No specific settings for this view yet.</p>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* View Selector */}
                <div className="px-4 pb-2 overflow-x-auto">
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as ViewType)} className="w-full">
                        <TabsList className="bg-transparent p-0 h-auto justify-start border-b border-transparent w-full">
                            {VIEW_OPTIONS.map(view => (
                                <TabsTrigger
                                    key={view.id}
                                    value={view.id}
                                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 lowercase"
                                >
                                    {view.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <CurrentViewComponent
                    data={records}
                    collection={collection}
                    loading={loading}
                    config={viewConfig}
                    onConfigChange={handleConfigChange}
                />
            </div>
        </div>
    );
}
