
import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils'; // Assuming utils
import { SmartField } from '@/components/fields/smart-field';

interface GanttViewProps extends ViewProps { }

export function GanttView({ data, config, collection }: GanttViewProps) {
    // We need start/end dates.
    // Config should select which fields are start/end.
    // For now, auto-detect or default to first date field.

    const dateFields = collection.fields?.filter((f: any) => f.interface === 'datetime' || f.interface === 'date') || [];
    const startField = config?.ganttStartField || dateFields[0]?.name;
    const endField = config?.ganttEndField || dateFields[1]?.name || startField; // Fallback to single point if no end

    // Generate timeline (Month based for now)
    const timeline = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i - 5); // Start 5 days ago
        return d;
    });

    if (!startField) {
        return <div className="p-10 text-center opacity-50">No date fields found for Gantt view.</div>;
    }

    return (
        <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="flex border-b bg-muted/20">
                <div className="w-48 p-2 border-r font-bold text-xs sticky left-0 bg-background z-10 shrink-0">
                    Record
                </div>
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <div className="flex" style={{ width: `${timeline.length * 40}px` }}>
                        {timeline.map((d, i) => (
                            <div key={i} className="w-10 border-r p-1 text-[10px] text-center shrink-0">
                                {d.getDate()} <br /> <span className="opacity-50">{d.toLocaleDateString('default', { weekday: 'narrow' })}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="relative">
                    {data.map(record => {
                        // Calculate position
                        const start = new Date(record[startField]);
                        const end = record[endField] ? new Date(record[endField]) : start;

                        // Simple Mock Position logic relative to timeline[0]
                        // In real app, complex diff calculation needed.

                        return (
                            <div key={record.id} className="flex border-b hover:bg-muted/10 items-center h-10">
                                <div className="w-48 p-2 border-r text-xs font-medium sticky left-0 bg-background z-10 shrink-0 truncate">
                                    {record.title || record.name || 'Untitled'}
                                </div>
                                <div className="flex-1 relative h-full">
                                    {/* Bar - Mocked for visual verification for now */}
                                    <div className="absolute top-2 bottom-2 bg-primary/20 border border-primary rounded-md flex items-center px-2 text-[10px] whitespace-nowrap overflow-hidden"
                                        style={{ left: '100px', width: '200px' }}>
                                        {record.title || record.name}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
