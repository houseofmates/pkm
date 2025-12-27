
import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import { toast } from 'sonner';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';

interface CalendarViewProps extends ViewProps { }

type ViewMode = 'year' | 'month' | 'week' | 'day';

export function CalendarView({ data, config, collection: _collection, onUpdateRecord }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [activeId, setActiveId] = useState<string | number | null>(null);

    const dateField = config?.dateField;

    const navDate = (dir: 1 | -1) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'year') {
            newDate.setFullYear(newDate.getFullYear() + dir);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + dir);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + (dir * 7));
        } else if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + dir);
        }
        setCurrentDate(newDate);
    };

    const recordsByDate = useMemo(() => {
        if (!dateField) return {};
        const map: Record<string, any[]> = {};

        data.forEach(record => {
            const rawDate = record[dateField];
            if (!rawDate) return;
            const dateStr = new Date(rawDate).toDateString();
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(record);
        });
        return map;
    }, [data, dateField]);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            // over.id is the date string we dropped onto
            const newDateStr = over.id;
            const recordId = active.id;

            // Optimistic / API update
            // We need to match the format expected by the API. key is Date string.
            // Convert to ISO string or whatever the field expects. 
            // NocoBase usually likes ISO/UTC.
            const newDate = new Date(newDateStr);
            // Preserve time? For now, just set date (calendar view usually implies date change)

            if (onUpdateRecord && dateField) {
                onUpdateRecord(recordId, { [dateField]: newDate.toISOString() });
                toast.success(`Rescheduled to ${newDate.toLocaleDateString()}`);
            }
        }
    };

    if (!dateField) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <div className="text-center">
                    <p>No Date field selected.</p>
                    <p className="text-sm">Open View Settings to configure.</p>
                </div>
            </div>
        );
    }

    const headerTitle = useMemo(() => {
        if (viewMode === 'year') return currentDate.getFullYear().toString();
        if (viewMode === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (viewMode === 'week') {
            const start = new Date(currentDate);
            start.setDate(currentDate.getDate() - currentDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        }
        if (viewMode === 'day') return currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        return '';
    }, [currentDate, viewMode]);

    const draggedRecord = data.find(r => r.id === activeId);

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between p-2 md:p-4 border-b gap-2">
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navDate(-1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navDate(1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <h3 className="text-lg font-semibold lowercase min-w-[150px] text-center md:text-left">
                            {headerTitle}
                        </h3>
                    </div>

                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full md:w-auto">
                        <TabsList className="grid w-full grid-cols-4 md:w-auto">
                            <TabsTrigger value="year" className="text-xs md:text-sm">Year</TabsTrigger>
                            <TabsTrigger value="month" className="text-xs md:text-sm">Month</TabsTrigger>
                            <TabsTrigger value="week" className="text-xs md:text-sm">Week</TabsTrigger>
                            <TabsTrigger value="day" className="text-xs md:text-sm">Day</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'year' && <YearView currentDate={currentDate} recordsByDate={recordsByDate} onMonthClick={(date) => { setCurrentDate(date); setViewMode('month'); }} />}
                    {viewMode === 'month' && <MonthView currentDate={currentDate} recordsByDate={recordsByDate} />}
                    {viewMode === 'week' && <WeekView currentDate={currentDate} recordsByDate={recordsByDate} />}
                    {viewMode === 'day' && <DayView currentDate={currentDate} recordsByDate={recordsByDate} />}
                </div>
            </div>

            <DragOverlay>
                {activeId && draggedRecord ? (
                    <div className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded shadow-lg opacity-80 rotate-3 cursor-grabbing whitespace-nowrap">
                        {draggedRecord.title || draggedRecord.name || 'Untitled'}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// --- Helpers with DND ---

function DraggableEvent({ record }: { record: any }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: record.id });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "text-[9px] md:text-[10px] bg-primary/10 text-primary px-1 md:px-1.5 py-0.5 rounded truncate cursor-grab hover:bg-primary/20",
                isDragging && "opacity-50"
            )}
            title={record.title || record.name}
        >
            {record.title || record.name || 'Untitled'}
        </div>
    )
}

function DroppableDateCell({ date, children, className }: { date: Date, children: React.ReactNode, className?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id: date.toDateString() });

    return (
        <div
            ref={setNodeRef}
            className={cn(className, isOver && "bg-accent/30 ring-2 ring-primary/20 z-10")}
        >
            {children}
        </div>
    )
}


function MonthView({ currentDate, recordsByDate }: { currentDate: Date, recordsByDate: Record<string, any[]> }) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startDayOfWeek = monthStart.getDay();

    const calendarDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < startDayOfWeek; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        return days;
    }, [currentDate, startDayOfWeek, daysInMonth]);

    return (
        <div className="h-full flex flex-col">
            <div className="grid grid-cols-7 border-b bg-muted/30 flex-shrink-0">
                {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground lowercase">
                        {day}
                    </div>
                ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6 auto-rows-fr overflow-y-auto">
                {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="bg-muted/10 border-b border-r p-2 opacity-50" />;

                    const dateKey = date.toDateString();
                    const dayRecords = recordsByDate[dateKey] || [];
                    const isToday = new Date().toDateString() === dateKey;

                    return (
                        <DroppableDateCell
                            key={dateKey}
                            date={date}
                            className={cn(
                                "border-b border-r p-1 md:p-2 flex flex-col gap-1 min-h-[60px] md:min-h-[80px] hover:bg-muted/10 transition-colors group relative overflow-hidden",
                                isToday && "bg-primary/5"
                            )}
                        >
                            <span className={cn(
                                "text-[10px] md:text-xs font-medium w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full mb-1",
                                isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                            )}>
                                {date.getDate()}
                            </span>

                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                {dayRecords.slice(0, 3).map(rec => (
                                    <DraggableEvent key={rec.id} record={rec} />
                                ))}
                                {dayRecords.length > 3 && (
                                    <div className="text-[9px] text-muted-foreground pl-1">
                                        +{dayRecords.length - 3} more
                                    </div>
                                )}
                            </div>
                        </DroppableDateCell>
                    );
                })}
            </div>
        </div>
    );
}

function WeekView({ currentDate, recordsByDate }: { currentDate: Date, recordsByDate: Record<string, any[]> }) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/30 flex-shrink-0">
                {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(weekStart);
                    d.setDate(weekStart.getDate() + i);
                    const isToday = new Date().toDateString() === d.toDateString();
                    return (
                        <div key={i} className={cn("p-2 text-center border-r last:border-r-0", isToday && "bg-primary/5")}>
                            <div className="text-xs text-muted-foreground lowercase">{d.toLocaleDateString('default', { weekday: 'short' })}</div>
                            <div className={cn("text-sm font-semibold w-7 h-7 mx-auto rounded-full flex items-center justify-center mt-1", isToday && "bg-primary text-primary-foreground")}>
                                {d.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-7 min-h-full">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date(weekStart);
                        d.setDate(weekStart.getDate() + i);
                        const dateKey = d.toDateString();
                        const records = recordsByDate[dateKey] || [];

                        return (
                            <DroppableDateCell key={i} date={d} className="border-r last:border-r-0 min-h-[200px] p-2 space-y-2">
                                {records.map(rec => (
                                    <div key={rec.id} className="relative z-0">
                                        <DraggableEvent record={rec} />
                                    </div>
                                ))}
                            </DroppableDateCell>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

function DayView({ currentDate, recordsByDate }: { currentDate: Date, recordsByDate: Record<string, any[]> }) {
    const dateKey = currentDate.toDateString();
    const records = recordsByDate[dateKey] || [];

    return (
        <div className="h-full w-full p-4 overflow-y-auto">
            {/* Day View Dragging is less common for "Rescheduling to another day" unless we show sidebar. 
                 For now, just list items. Detailed time dragging is complex. */}
            <h3 className="text-xl font-bold mb-4">{currentDate.toDateString()}</h3>
            {records.length === 0 ? (
                <div className="text-muted-foreground text-sm">No events</div>
            ) : (
                <div className="space-y-2">
                    {records.map(rec => (
                        <div key={rec.id} className="p-3 border rounded-lg bg-card shadow-sm">
                            <div className="font-bold">{rec.title || rec.name}</div>
                            {/* Draggable logic disabled here as there are no other drop targets visible */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function YearView({ currentDate, recordsByDate, onMonthClick }: { currentDate: Date, recordsByDate: Record<string, any[]>, onMonthClick: (d: Date) => void }) {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);

    return (
        <ScrollArea className="h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {months.map(month => {
                    const monthDate = new Date(year, month, 1);
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const startDay = monthDate.getDay();

                    // Check activity
                    const hasActivity = Array.from({ length: daysInMonth }, (_, i) => {
                        const d = new Date(year, month, i + 1).toDateString();
                        return recordsByDate[d]?.length > 0;
                    }).some(Boolean);

                    return (
                        <div
                            key={month}
                            onClick={() => onMonthClick(monthDate)}
                            className={cn(
                                "border rounded-md p-2 hover:bg-accent/50 cursor-pointer transition-colors",
                                hasActivity ? "bg-accent/10" : "bg-card"
                            )}
                        >
                            <div className="text-sm font-bold mb-2 text-center lowercase">
                                {monthDate.toLocaleString('default', { month: 'long' })}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-[8px] text-center text-muted-foreground">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <span key={d}>{d}</span>)}
                                {Array.from({ length: startDay }).map((_, i) => <span key={`pad-${i}`} />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const dStr = new Date(year, month, day).toDateString();
                                    const count = recordsByDate[dStr]?.length || 0;
                                    return (
                                        <div
                                            key={day}
                                            className={cn(
                                                "aspect-square flex items-center justify-center rounded-sm",
                                                count > 0 ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted"
                                            )}
                                        >
                                            {day}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
