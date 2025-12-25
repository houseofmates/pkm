
import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarViewProps extends ViewProps { }

export function CalendarView({ data, config }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const dateField = config?.dateField;

    const navMonth = (dir: 1 | -1) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + dir);
        setCurrentDate(newDate);
    };

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startDayOfWeek = monthStart.getDay(); // 0 = Sunday

    // Generate Calendar Grid
    const calendarDays = useMemo(() => {
        const days = [];
        // Padding for previous month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        return days;
    }, [currentDate, startDayOfWeek, daysInMonth]);

    // Group Records by Date
    const recordsByDate = useMemo(() => {
        if (!dateField) return {};
        const map: Record<string, any[]> = {};

        data.forEach(record => {
            const rawDate = record[dateField];
            if (!rawDate) return;

            // Normalize NocoBase date/datetime string to YYYY-MM-DD
            // Assuming simple string matching for now
            const dateStr = new Date(rawDate).toDateString();
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(record);
        });
        return map;
    }, [data, dateField]);

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

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    return (
        <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold lowercase">
                    {monthName} {year}
                </h3>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navMonth(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navMonth(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
                {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground lowercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6 auto-rows-fr">
                {calendarDays.map((date, idx) => {
                    if (!date) {
                        return <div key={`empty-${idx}`} className="bg-muted/10 border-b border-r p-2 opacity-50" />;
                    }

                    const dateKey = date.toDateString();
                    const dayRecords = recordsByDate[dateKey] || [];
                    const isToday = new Date().toDateString() === dateKey;

                    return (
                        <div
                            key={dateKey}
                            className={cn(
                                "border-b border-r p-2 flex flex-col gap-1 min-h-[80px] hover:bg-muted/10 transition-colors group relative",
                                isToday && "bg-primary/5"
                            )}
                        >
                            <span className={cn(
                                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                            )}>
                                {date.getDate()}
                            </span>

                            {/* Render Records */}
                            {dayRecords.slice(0, 3).map(rec => (
                                <div
                                    key={rec.id}
                                    className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate cursor-context-menu hover:bg-primary/20"
                                    title={rec.title || rec.name}
                                >
                                    {rec.title || rec.name || 'Untitled'}
                                </div>
                            ))}

                            {dayRecords.length > 3 && (
                                <div className="text-[10px] text-muted-foreground pl-1">
                                    +{dayRecords.length - 3} more
                                </div>
                            )}

                            {/* Optional: Add record button on hover */}
                            {/* This would be a nice to have later */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
