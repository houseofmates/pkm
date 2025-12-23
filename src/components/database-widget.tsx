
import { useState } from 'react';
import type { Collection } from '@/types/nocobase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { RecordTable } from "@/components/record-table";
import { useRecords } from '@/hooks/use-records';
import { cn } from "@/lib/utils";

interface DatabaseWidgetProps {
    collection: Collection;
    onRemove: () => void;
    className?: string;
}

export function DatabaseWidget({ collection, onRemove, className }: DatabaseWidgetProps) {
    const [view, setView] = useState<'table' | 'calendar' | 'gantt'>('table');
    const { records, loading, deleteRecord } = useRecords(collection.name);

    return (
        <Card className={cn("w-[600px] h-[400px] flex flex-col shadow-lg border-2 border-border/50", className)}>
            <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/20">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold lowercase">{collection.title || collection.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                    <Tabs value={view} onValueChange={(v: any) => setView(v)} className="h-6">
                        <TabsList className="h-6 p-0 bg-transparent">
                            <TabsTrigger value="table" className="h-6 text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">table</TabsTrigger>
                            <TabsTrigger value="calendar" className="h-6 text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">calendar</TabsTrigger>
                            <TabsTrigger value="gantt" className="h-6 text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">gantt</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden relative">
                {view === 'table' && (
                    <div className="h-full w-full overflow-auto">
                        <RecordTable
                            data={records}
                            collection={collection}
                            loading={loading}
                            onEdit={() => { }} // TODO: Add edit modal
                            onDelete={(id) => deleteRecord(id)}
                        />
                    </div>
                )}
                {view === 'calendar' && (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                        calendar view placeholder
                    </div>
                )}
                {view === 'gantt' && (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                        gantt view placeholder
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
