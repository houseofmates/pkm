
import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { SmartField } from '@/components/fields/smart-field';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { Trash2, Edit } from 'lucide-react';

interface GanttViewProps extends ViewProps { }

// Simple Edit Dialog wrapper
function EditRecordModal({ record, open, onOpenChange, onUpdate, collection }: any) {
    // In a real app we'd reuse the Form logic from CreateRecordDialog but populated
    // For now, we mock an "Edit Properties" card by listing fields
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">edit {record.title || 'record'}</h3>
                    <div className="grid gap-4 py-4">
                        {collection.fields?.map((f: any) => (
                            <div key={f.name} className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium text-muted-foreground">{f.uiSchema?.title || f.name}</label>
                                <div className="col-span-3">
                                    <SmartField
                                        value={record[f.name]}
                                        field={f}
                                        onChange={(val) => onUpdate(record.id, { [f.name]: val })}
                                        className="border rounded px-2 min-h-[32px]"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function GanttView({ data, config, collection, onUpdateRecord, onDelete }: GanttViewProps) {
    if (!collection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border border-transparent animate-pulse">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm">loading gantt metadata...</p>
                </div>
            </div>
        );
    }
    const dateFields = collection.fields?.filter((f: any) => f.interface === 'datetime' || f.interface === 'date') || [];

    // Configurable start/end fields
    const startField = config?.ganttStartField || dateFields[0]?.name;
    const endField = config?.ganttEndField || dateFields[1]?.name || startField;

    // State for interactions
    const [editingRecord, setEditingRecord] = useState<any>(null);

    // Determine Timeline Range based on data
    const { startDate, timelineDays } = useMemo(() => {
        if (!data.length || !startField) {
            const now = new Date();
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            return {
                startDate: start,
                endDate: end,
                timelineDays: eachDayOfInterval({ start, end })
            };
        }

        // Find min start and max end
        let min = new Date();
        let max = new Date();
        let hasDates = false;

        data.forEach(r => {
            if (r[startField]) {
                const s = new Date(r[startField]);
                if (!hasDates || s < min) min = s;
                hasDates = true;
            }
            if (r[endField]) {
                const e = new Date(r[endField]);
                if (e > max) max = e;
            }
        });

        // Add buffer
        const start = addDays(min, -5);
        const end = addDays(max, 10);

        return {
            startDate: start,
            endDate: end,
            timelineDays: eachDayOfInterval({ start, end })
        };
    }, [data, startField, endField]);

    if (!startField) {
        return <div className="p-10 text-center opacity-50">no date fields found. please add a date field to use gantt view.</div>;
    }

    const colWidth = 40; // px per day

    // Interaction Handlers
    const handleBarClick = (record: any) => {
        setEditingRecord(record);
    }

    return (
        <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden select-none">
            {/* Header Timeline */}
            <div className="flex border-b bg-muted/20">
                <div className="w-48 p-2 border-r font-bold text-xs sticky left-0 bg-background z-20 shrink-0 shadow-sm flex items-center">
                    task name
                </div>
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <div className="flex" style={{ width: `${timelineDays.length * colWidth}px` }}>
                        {timelineDays.map((d, i) => (
                            <div key={i} className={cn("border-r p-1 text-[10px] text-center shrink-0 h-10 flex flex-col justify-center",
                                d.getDay() === 0 || d.getDay() === 6 ? "bg-muted/30" : "")}
                                style={{ width: `${colWidth}px` }}
                            >
                                <span className="font-bold">{d.getDate()}</span>
                                <span className="opacity-50 text-[9px] uppercase">{format(d, 'EEE')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="relative min-w-full">
                    {data.map(record => {
                        const sDate = record[startField] ? new Date(record[startField]) : null;
                        const eDate = record[endField] ? new Date(record[endField]) : sDate;

                        // Calculate position
                        let left = 0;
                        let width = 0;
                        let visible = false;

                        if (sDate && eDate) {
                            const diffStart = differenceInDays(sDate, startDate);
                            const duration = differenceInDays(eDate, sDate) + 1; // inclusive

                            left = diffStart * colWidth;
                            width = duration * colWidth;
                            visible = true;
                        }

                        return (
                            <ContextMenu key={record.id}>
                                <ContextMenuTrigger>
                                    <div className="flex border-b hover:bg-muted/10 items-center h-10 group relative">
                                        <div className="w-48 p-2 border-r text-xs font-medium sticky left-0 bg-background z-10 shrink-0 truncate flex items-center gap-2">
                                            {/* Status Indicator (Mock) or Checkbox */}
                                            <div className="w-2 h-2 rounded-full bg-primary/50" />
                                            {record.title || record.name || <span className="italic opacity-50">untitled</span>}
                                        </div>
                                        <div className="flex-1 relative h-full">
                                            {/* Background Grid Lines */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {timelineDays.map((d, i) => (
                                                    <div key={i} className={cn("border-r shrink-0 h-full", d.getDay() === 0 || d.getDay() === 6 ? "bg-muted/10" : "")} style={{ width: `${colWidth}px` }} />
                                                ))}
                                            </div>

                                            {/* Task Bar */}
                                            {visible && (
                                                <div
                                                    className="absolute top-2 bottom-2 bg-blue-500/20 border border-blue-500 text-blue-700 dark:text-blue-300 rounded-md flex items-center px-2 text-[10px] whitespace-nowrap overflow-hidden shadow-sm hover:brightness-110 cursor-pointer transition-all hover:scale-[1.01]"
                                                    style={{ left: `${left}px`, width: `${Math.max(width, colWidth)}px` }}
                                                    title={`${format(sDate!, 'PP')} - ${format(eDate!, 'PP')}`}
                                                    onDoubleClick={() => handleBarClick(record)}
                                                >
                                                    <div className="truncate w-full font-semibold opacity-80 group-hover:opacity-100">
                                                        {record.title || record.name}
                                                    </div>
                                                    {/* Drag Handles (Visual Only for now, implementation of drag resize is huge) */}
                                                    <div className="absolute left-0 w-1 h-full cursor-w-resize bg-blue-600/30 opacity-0 group-hover:opacity-100" />
                                                    <div className="absolute right-0 w-1 h-full cursor-e-resize bg-blue-600/30 opacity-0 group-hover:opacity-100" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={() => handleBarClick(record)}>
                                        <Edit className="mr-2 h-4 w-4" /> edit record
                                    </ContextMenuItem>
                                    <ContextMenuItem className="text-red-500" onClick={() => onDelete && onDelete(record)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        )
                    })}
                </div>
            </ScrollArea>

            {/* Edit Dialog */}
            {editingRecord && (
                <EditRecordModal
                    record={editingRecord}
                    open={!!editingRecord}
                    onOpenChange={(open: boolean) => !open && setEditingRecord(null)}
                    collection={collection}
                    onUpdate={onUpdateRecord}
                />
            )}
        </div>
    );
}
