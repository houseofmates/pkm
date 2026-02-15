
import { useState, useEffect } from 'react';
import type { ViewProps } from './registry';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';

interface KanbanViewProps extends ViewProps { }

// Helper for Sortable Item (Card)
function SortableItem({ id, record, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange }: { id: string | number, record: any, collection: any, onUpdateRecord?: any, onDelete?: any, titleField: any, visibleFields: any[], config?: any, onConfigChange?: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <RecordContextMenu
            record={record}
            collection={collection}
            onUpdate={onUpdateRecord}
            onDelete={onDelete}
            titleField={titleField}
            config={config}
            onConfigChange={onConfigChange}
            className="contents" // Ensure it doesn't break layout if context menu adds wrapper
        >
            <Card ref={setNodeRef} style={style} className="cursor-grab active:cursor-grabbing mb-2 shadow-sm bg-card hover:bg-accent/50 group border-muted">
                <CardHeader className="p-3 space-y-0">
                    <div className="flex items-center justify-between gap-2 h-7 min-h-0">
                        <div className="flex-1 min-w-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                            <SmartField
                                value={record[titleField.name]}
                                field={titleField}
                                record={record}
                                collectionName={collection.name}
                                size="sm"
                                onChange={(val) => {
                                    if (onUpdateRecord) {
                                        onUpdateRecord(record.id, { [titleField.name]: val });
                                    }
                                }}
                                className="h-auto p-0 border-none bg-transparent hover:bg-muted/50 rounded px-1 font-black leading-tight text-base w-full block text-center"
                            />
                        </div>
                        <div {...attributes} {...listeners} className="opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-move flex items-center h-full">
                            <GripVertical className="h-4 w-4 shrink-0" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-1 text-xs text-muted-foreground">
                    {visibleFields.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                            {visibleFields.slice(0, 3).map((f: any) => (
                                <div key={f.name} className="flex flex-col items-center gap-0.5 min-w-0 opacity-80 text-center">
                                    <span className="text-[9px] uppercase tracking-wider shrink-0 opacity-50">{f.uiSchema?.title || f.name}:</span>
                                    <SmartField
                                        value={record[f.name]}
                                        field={f}
                                        record={record}
                                        collectionName={collection.name}
                                        size="sm"
                                        onChange={(val) => onUpdateRecord?.(record.id, { [f.name]: val })}
                                        className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 truncate flex-1 text-center"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </RecordContextMenu>
    );
}

// Helper for Droppable/Sortable Column
function KanbanColumn({ id, title, items, children }: { id: string, title: string, items: any[], children: React.ReactNode }) {
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'Column',
            columnId: id
        }
    });

    return (
        <div ref={setNodeRef} className="w-72 flex-shrink-0 flex flex-col h-full max-h-full rounded-lg bg-muted/40 border ml-4 first:ml-0">
            <div className="p-3 font-semibold text-sm flex items-center justify-between border-b bg-muted/20">
                <span className="lowercase">{title}</span>
                <span className="text-xs text-muted-foreground font-normal bg-background px-2 py-0.5 rounded-full border">
                    {items.length}
                </span>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="flex flex-col min-h-[100px]">
                    {children}
                </div>
            </ScrollArea>
        </div>
    );
}


export function KanbanView({ data, collection, config, onUpdateRecord, onDelete, onConfigChange }: KanbanViewProps) {
    if (!collection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-muted/20 rounded-lg border">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm">loading kanban metadata...</p>
                </div>
            </div>
        );
    }
    const { client } = useAuth();
    const [columns, setColumns] = useState<Record<string, any[]>>({});
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | number | null>(null);
    const [draggedRecord, setDraggedRecord] = useState<any>(null);

    // Identify title and visible fields
    const titleField = config?.titleField
        ? collection.fields?.find((f: any) => f.name === config.titleField)
        : collection.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

    const visibleFieldNames = config?.visibleFields || [];
    const visibleFields = collection?.fields?.filter((f: any) => visibleFieldNames.includes(f.name)) || [];

    // Default to first select field if not configured
    const groupByField = config?.groupByField;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Grouping Logic
    useEffect(() => {
        if (!groupByField) {
            // Fallback: If no group field, maybe just one "All" column or suggest configuring?
            setColumns({ 'uncategorized': data });
            setColumnOrder(['uncategorized']);
            return;
        }

        const fieldSchema = collection.fields?.find((f: any) => f.name === groupByField);
        const newColumns: Record<string, any[]> = {};
        const newOrder: string[] = [];

        // Pre-fill columns from Schema Options if available (Select/Radio)
        if (fieldSchema?.uiSchema?.enum) {
            fieldSchema.uiSchema.enum.forEach((opt: any) => {
                const val = opt.value;
                newColumns[val] = [];
                newOrder.push(val);
            });
        }

        // Always add Uncategorized if not present or for safety
        if (!newColumns['uncategorized']) {
            newColumns['uncategorized'] = [];
            newOrder.push('uncategorized');
        }

        // Distribute Data
        data.forEach(record => {
            const val = record[groupByField];
            // Normalize value: check if it matches an enum value, else uncat
            // Handle array values (multiple select) -> just pick first for kanban? or duplicate?
            // Simple string matching for now
            let colKey = 'uncategorized';
            if (val && newColumns[val]) {
                colKey = val;
            } else if (val) {
                // Value exists but column doesnt (e.g. not in enum or open text)
                // Dynamically add column?
                if (!newColumns[val]) {
                    newColumns[val] = [];
                    newOrder.push(val);
                }
                colKey = val;
            }
            newColumns[colKey].push(record);
        });

        setColumns(newColumns);
        setColumnOrder(newOrder);

    }, [data, groupByField, collection]);


    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id);
        const record = data.find(r => r.id === active.id);
        setDraggedRecord(record);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        // Find containers
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id) || (columns[over.id] ? over.id : null);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Optimistic update for UI fluidity during drag is complex, 
        // usually strictly needed for reordering *within* lists. 
        // For moving between lists, relying on DragEnd might be enough for V1 if simple.
        // But dnd-kit recommends updating items state during dragOver for smooth visual transfer.

        setColumns((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex(i => i.id === active.id);
            const overIndex = over.data.current?.sortable?.index ?? overItems.length + 1;

            let newIndex;
            if (over.id in prev) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowLastItem =
                    over &&
                    overIndex === overItems.length - 1 &&
                    // checking rect intersection logic omitted for brevity, assuming append
                    true;
                const modifier = isBelowLastItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return {
                ...prev,
                [activeContainer]: [
                    ...prev[activeContainer].filter((item) => item.id !== active.id)
                ],
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length)
                ]
            };
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id);
        const overContainer = over ? (findContainer(over.id) || (columns[over.id] ? over.id : null)) : null;

        if (activeContainer && overContainer && activeContainer !== overContainer) {
            // Moved to new column -> Update API
            const recordId = active.id;
            const newValue = overContainer === 'uncategorized' ? null : overContainer; // Assuming undefined/null for uncat

            try {
                await client.updateRecord(collection.name, recordId, {
                    [groupByField]: newValue
                });
                toast.success("Record updated");
            } catch (e) {
                console.error("Failed to update kanban status", e);
                toast.error("Failed to update status");
                // Revert? (requires tracking original state)
            }
        }

        // Handle reorder within same column if we supported sort field
        // if (activeContainer === overContainer) { ... }

        setActiveId(null);
        setDraggedRecord(null);
    };

    function findContainer(id: string | number) {
        if (id in columns) return id;
        return Object.keys(columns).find((key) => columns[key].find((item) => item.id === id));
    }

    if (!groupByField) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <div className="text-center">
                    <p>no group by field selected.</p>
                    <p className="text-sm">open view settings to configure.</p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full overflow-x-auto pb-4">
                {/* Sortable Context for Column Order - Optional, for now just static columns */}
                {columnOrder.map(colId => (
                    <KanbanColumn key={colId} id={colId} title={colId} items={columns[colId]}>
                        <SortableContext items={columns[colId].map(i => i.id)} strategy={verticalListSortingStrategy}>
                            {columns[colId].map(record => (
                                <SortableItem
                                    key={record.id}
                                    id={record.id}
                                    record={record}
                                    collection={collection}
                                    onUpdateRecord={onUpdateRecord}
                                    onDelete={onDelete}
                                    titleField={titleField}
                                    visibleFields={visibleFields}
                                    config={config}
                                    onConfigChange={onConfigChange}
                                />
                            ))}
                        </SortableContext>
                    </KanbanColumn>
                ))}
            </div>

            <DragOverlay>
                {activeId && draggedRecord ? (
                    <Card className="w-72 shadow-xl opacity-80 cursor-grabbing bg-card">
                        <CardHeader className="p-3">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-medium leading-tight line-clamp-2">
                                    {draggedRecord.title || draggedRecord.name || draggedRecord.id}
                                </span>
                                <GripVertical className="h-4 w-4" />
                            </div>
                        </CardHeader>
                    </Card>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
