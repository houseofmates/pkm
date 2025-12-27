
import { useState, useEffect } from 'react';
import type { Collection } from '@/types/nocobase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { X, RotateCw } from "lucide-react";
import { useRecords } from '@/hooks/use-records';
import { cn } from "@/lib/utils";
import { type ViewType, VIEW_REGISTRY } from '@/components/views/registry';


interface DatabaseWidgetProps {
    collection: Collection;
    onRemove: () => void;
    className?: string;
    initialView: ViewType;
}

export function DatabaseWidget({ collection, onRemove, className, initialView }: DatabaseWidgetProps) {
    const { records, loading, refresh } = useRecords(collection.name);
    // View config state could be local or shared. 
    // To share it, we'd need to lift it or load from localStorage using the same key convention.
    // Let's load generic config for now.
    const [viewConfig, setViewConfig] = useState<Record<string, any>>({});

    useEffect(() => {
        const key = `view_config_${collection.name}_${initialView}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) setViewConfig(JSON.parse(saved));
        } catch (e) {
            console.error(e);
        }
    }, [collection.name, initialView]);

    const CurrentViewComponent = VIEW_REGISTRY[initialView] || VIEW_REGISTRY['table'];

    return (
        <Card className={cn("w-[600px] h-[400px] flex flex-col shadow-lg border-2 border-border/50", className)}>
            <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/20 handle cursor-move">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold lowercase">
                        {collection.title || collection.name} <span className="text-muted-foreground opacity-50 font-normal">/ {initialView}</span>
                    </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refresh()} title="Refresh Data">
                        <RotateCw className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground" onClick={onRemove} title="Remove Widget">
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden relative bg-background">
                <CurrentViewComponent
                    data={records}
                    collection={collection}
                    loading={loading}
                    config={viewConfig} // Pass config so calendar/kanban works if configured in Details page
                    onConfigChange={() => { }} // Read-only config in widget for now
                />
            </CardContent>
        </Card>
    );
}
