import React, { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Repeat, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { DndContext, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';
import { Label } from '@/components/ui/label';
import { format, toZonedTime } from 'date-fns-tz';

// toZonedTime may be missing or non-function in some test environments (see vitest),
// so we will check before calling it to avoid runtime errors.

// Safe date formatting helper - returns null if date is invalid
function safeDateFormat(date: Date | string | number | null | undefined, formatStr: string, timeZone?: string): string | null {
  if (!date) return null;
  const d = typeof date === 'object' ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  
  // Apply timezone conversion if requested and available
  let finalDate = d;
  if (timeZone && typeof toZonedTime === 'function') {
    finalDate = toZonedTime(d, timeZone);
  }
  
  try {
    return format(finalDate, formatStr);
  } catch {
    return null;
  }
}

// Safe zoned date creation - returns null if input is invalid
function safeZonedDate(date: Date | string | number | null | undefined, timeZone: string): Date | null {
  if (!date) return null;
  const d = typeof date === 'object' ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  
  if (typeof toZonedTime === 'function') {
    return toZonedTime(d, timeZone);
  }
  return d;
}

type CalendarViewProps = ViewProps;

type ViewMode = 'year' | 'month' | 'week' | 'day';

export function CalendarView({ data, config, collection, onUpdateRecord, onDelete, onConfigChange, onCreate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // moved early return check after hooks to avoid conditional hooks
  const hasCollection = Boolean(collection);

  const titleField = useMemo(() => {
    if (!collection) return { name: 'id' };
    const field = config?.titleField
      ? collection.fields?.find((f: { name: string; primary?: boolean }) => f.name === config.titleField)
      : collection.fields?.find((f: { name: string; primary?: boolean }) => f.primary || f.name === 'title' || f.name === 'name');
    return field || { name: config?.titleField || 'title' };
  }, [collection, config?.titleField]);

  const visibleFieldNames = config?.visibleFields || [];
  const visibleFields = useMemo(() => {
    if (!collection) return [];
    return collection?.fields?.filter((f: { name: string }) => visibleFieldNames.includes(f.name)) || [];
  }, [collection, visibleFieldNames]);

  const dateField = config?.dateField;
  const endDateField = config?.endDateField;
  const recurringField = config?.recurringField;
  const allDayField = config?.allDayField;

  const navDate = (dir: 1 | -1) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() + dir);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + dir);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (dir * 7));
    else if (viewMode === 'day') newDate.setDate(newDate.getDate() + dir);
    setCurrentDate(newDate);
  };

  const recordsByDate = useMemo(() => {
    if (!hasCollection || !dateField) return {};
    const map: Record<string, any[]> = {};

    data.forEach(record => {
      const rawDate = (dateField && record[dateField]) || record['start-time'] || record['start_time'] || record['date'];
      if (!rawDate) return;
      
      // Validate the date before formatting
      const dateStr = safeDateFormat(rawDate, 'yyyy-MM-dd', timeZone);
      if (!dateStr) return; // Skip invalid dates silently
      
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(record);
    });
    return map;
  }, [data, dateField, timeZone, hasCollection]);

  if (!hasCollection) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border border-transparent animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm">loading calendar metadata...</p>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const newDateStr = String(over.id); // "YYYY-MM-DD"
      const recordId = active.id;
      const record = data.find(r => String(r.id) === String(recordId));

      if (onUpdateRecord && dateField && record) {
        const originalIso = record[dateField] || record['start-time'] || record['start_time'] || record['date'];
        
        if (originalIso && String(originalIso).length >= 10) {
          let newIso;
          if (newDateStr.includes('T')) {
            // Drop target has time info (e.g., from DayView)
            // Preserve seconds/timezone if possible but update hour/min
            const datePart = newDateStr.split('T')[0];
            const timePart = newDateStr.split('T')[1]; // "HH:mm:ss"
            newIso = datePart + 'T' + timePart + String(originalIso).substring(19);
          } else {
            // Replace YYYY-MM-DD part while preserving time/timezone
            newIso = newDateStr + String(originalIso).substring(10);
          }
          onUpdateRecord(recordId, { [dateField]: newIso });
          toast.success(`moved to ${newDateStr.replace('T', ' ')}`);
        } else {
          // Fallback for missing or short date strings
          const fallbackDate = new Date(newDateStr);
          onUpdateRecord(recordId, { [dateField]: fallbackDate.toISOString() });
          toast.success(`moved to ${newDateStr}`);
        }
      }
    }
  };

  if (!dateField) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
        <div className="text-center">
          <p>no date field selected.</p>
          <p className="text-sm">open view settings to configure.</p>
        </div>
      </div>
    );
  }

  const headerTitle = useMemo(() => {
    let title = '';
    if (viewMode === 'year') title = format(currentDate, 'yyyy');
    else if (viewMode === 'month') title = format(currentDate, 'LLLL yyyy');
    else if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      title = `${format(start, 'PP')} - ${format(end, 'PP')}`;
    } else if (viewMode === 'day') {
      title = format(currentDate, 'PPPP');
    }
    return title.toLowerCase();
  }, [currentDate, viewMode]);

  const draggedRecord = data.find(r => r.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between p-2 md:p-4 border-b gap-2">
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            {onCreate && dateField && (
              <Button variant="outline" size="sm" onClick={() => {
                const payload: any = { [dateField]: currentDate.toISOString() };
                onCreate(payload);
              }} title="add" aria-label="add record">
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => navDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => navDate(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <h3 className="text-lg font-semibold lowercase min-w-[150px] text-center md:text-left">{headerTitle}</h3>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-4 md:w-auto">
              <TabsTrigger value="year" className="text-xs md:text-sm">year</TabsTrigger>
              <TabsTrigger value="month" className="text-xs md:text-sm">month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs md:text-sm">week</TabsTrigger>
              <TabsTrigger value="day" className="text-xs md:text-sm">day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-hidden relative">
          {viewMode === 'year' && <YearView currentDate={currentDate} recordsByDate={recordsByDate} onMonthClick={(date: Date) => { setCurrentDate(date); setViewMode('month'); }} timeZone={timeZone} />}
          {viewMode === 'month' && <MonthView currentDate={currentDate} recordsByDate={recordsByDate} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} timeZone={timeZone} allDayField={allDayField} recurringField={recurringField} onDayClick={(date: Date) => { setCurrentDate(date); setViewMode('day'); }} />}
          {viewMode === 'week' && <WeekView currentDate={currentDate} recordsByDate={recordsByDate} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} timeZone={timeZone} allDayField={allDayField} recurringField={recurringField} />}
          {viewMode === 'day' && <DayView currentDate={currentDate} recordsByDate={recordsByDate} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} timeZone={timeZone} allDayField={allDayField} recurringField={recurringField} onCreate={onCreate} />}
        </div>
      </div>
      <DragOverlay>{activeId && draggedRecord ? <div className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded shadow-lg opacity-80 rotate-3 cursor-grabbing whitespace-nowrap">{draggedRecord.title || draggedRecord.name || draggedRecord[titleField?.name || 'title'] || 'untitled'}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function DraggableEvent({
  record,
  collection,
  onUpdateRecord,
  onDelete,
  titleField,
  visibleFields,
  config,
  onConfigChange,
  allDayField,
  recurringField,
  dateField,
  endDateField,
  rowHeight,
  start,
  end,
}: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: record.id ?? `event-${JSON.stringify(record)}`,
  });
  const isAllDay = allDayField && record[allDayField];
  const isRecurring = recurringField && record[recurringField];
  const color = record.color || (record.item_id && record.item_type === 'collection' ? '#ffbf35' : undefined);

  const openRecordEditor = () => {
    window.dispatchEvent(new CustomEvent('pkm:edit-record', {
      detail: {
        record,
        collectionName: collection?.name || 'events',
        onSave: (updated: any) => {
          if (onUpdateRecord) {
            onUpdateRecord(record.id, updated);
          }
        }
      }
    }));
  };

  const [resizeHeight, setResizeHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = React.useRef<{ startY: number; startHeight: number; startEnd: Date | null; pointerId?: number; target?: HTMLElement }>({ startY: 0, startHeight: 0, startEnd: end || null });

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const applyEndTime = (newEnd: Date) => {
    if (!onUpdateRecord) return;
    if (!endDateField) return;
    if (!dateField) return;
    onUpdateRecord(record.id, { [endDateField]: newEnd.toISOString() });
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isResizing) return;
    const deltaY = e.clientY - resizeStartRef.current.startY;
    const newHeight = clamp(resizeStartRef.current.startHeight + deltaY, rowHeight / 4, rowHeight * 24);
    setResizeHeight(newHeight);

    const minutes = Math.round((newHeight / rowHeight) * 60 / 5) * 5;
    const baseStart = start ? new Date(start.getTime()) : new Date();
    const newEnd = new Date(baseStart.getTime() + minutes * 60000);
    applyEndTime(newEnd);
  };

  const onPointerUp = () => {
    if (!isResizing) return;
    setIsResizing(false);
    setResizeHeight(null);
    const ptrId = (resizeStartRef.current as any).pointerId;
    const target = (resizeStartRef.current as any).target as HTMLElement | undefined;
    if (ptrId && target?.releasePointerCapture) {
      target.releasePointerCapture(ptrId);
    }
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    setIsResizing(true);
    resizeStartRef.current = {
      startY: e.clientY,
      startHeight: (resizeHeight ?? (end && start ? (end.getTime() - start.getTime()) / 60000 / 60 * rowHeight : rowHeight)) ?? rowHeight,
      startEnd: end || null,
      pointerId: e.pointerId,
      target: e.currentTarget as HTMLElement,
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <RecordContextMenu record={record} collection={collection} onUpdate={onUpdateRecord} onDelete={onDelete} titleField={titleField} config={config} onConfigChange={onConfigChange}>
      <div 
        ref={setNodeRef} 
        {...listeners} 
        {...attributes} 
        onClick={(e) => {
          e.stopPropagation();
          openRecordEditor();
        }}
        className={cn(
          "text-[10px] bg-[#050505]/80 text-white px-1 py-0 rounded truncate cursor-grab hover:bg-[#050505]/90 transition-colors shadow-sm border border-primary/40",
          isDragging && "opacity-50",
          isAllDay && "bg-green-500/15 text-green-200 border-green-400/30"
        )} 
        title={String(record[titleField.name] || '')} 
        style={{ 
          backgroundColor: color ? `${color}20` : undefined, 
          borderColor: color ? `${color}40` : undefined, 
          color: color || undefined,
          ...record.style 
        }}
      >
        <div className="truncate font-bold flex items-center gap-1 leading-tight">
          {isRecurring && <Repeat className="h-2.5 w-2.5" />}
          {isAllDay && <CalendarIcon className="h-2.5 w-2.5" />}
          {String(record[titleField.name] || 'untitled')}
        </div>
        {visibleFields.length > 0 && (
          <div className="flex flex-col gap-0 mt-0.5 opacity-90">
            {visibleFields.slice(0, 2).map((f: any) => (
              <div key={f.name} className="text-[8px] flex items-center gap-1">
                <span className="opacity-50 lowercase shrink-0">{f.uiSchema?.title || f.name}:</span>
                <SmartField value={record[f.name]} field={f} record={record} collectionName={collection.name} size="sm" className="h-auto p-0 border-none bg-transparent text-[8px] leading-tight truncate" onChange={() => { }} />
              </div>
            ))}
          </div>
        )}
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize"
          onPointerDown={onResizePointerDown}
        />
        {isResizing && resizeHeight && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-primary/40" style={{ height: 4 }} />
        )}
      </div>
    </RecordContextMenu>
  )
}

function DroppableDateCell({ date, children, className, onClick, style }: { date: Date, children: React.ReactNode, className?: string, onClick?: () => void, style?: React.CSSProperties }) {
  const dateKey = safeDateFormat(date, 'yyyy-MM-dd') ?? 'invalid-date';
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return <div ref={setNodeRef} className={cn(className, isOver && "bg-accent/30 ring-2 ring-primary/20 z-10")} onClick={onClick} style={style}>{children}</div>;
}

function MonthView({ currentDate, recordsByDate, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange, timeZone, allDayField, recurringField, onDayClick }: any) {
  const normalizeName = (s: string) => String(s || '').toLowerCase().replace(/[-_\s]+/g, '');
  const monthVisibleFields = visibleFields?.filter((f: any) => {
    const norm = normalizeName(f.name);
    return norm !== 'url' && norm !== 'notes';
  }) ?? visibleFields;

  const monthStart = safeZonedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), timeZone)
    ?? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDayOfWeek = monthStart.getDay();
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = safeZonedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), i), timeZone);
      if (d) days.push(d);
    }
    return days;
  }, [currentDate, startDayOfWeek, daysInMonth, timeZone]);

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b bg-muted/30 flex-shrink-0">
        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground lowercase">{day}</div>)}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6 auto-rows-fr overflow-y-auto">
        {calendarDays.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="bg-muted/10 border-b border-r p-2 opacity-50" />;
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayRecords = recordsByDate[dateKey] || [];
          const isToday = format(toZonedTime(new Date(), timeZone), 'yyyy-MM-dd') === dateKey;
          return (
            <DroppableDateCell
              key={dateKey}
              date={date}
              className={cn("border-b border-r p-0.5 flex flex-col gap-0 min-h-[60px] md:min-h-[80px] hover:bg-muted/10 transition-colors group relative overflow-hidden items-start justify-start", isToday && "bg-primary/5")}
              onClick={() => onDayClick?.(new Date(date.getFullYear(), date.getMonth(), date.getDate()))}
            >
              <div className="flex items-start justify-between w-full mb-0 gap-1">
                <span className={cn("text-[10px] md:text-xs font-medium w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full flex-shrink-0", isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{date.getDate()}</span>
                {dayRecords.length > 0 && (
                <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <DraggableEvent record={dayRecords[0]} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={monthVisibleFields} config={config} onConfigChange={onConfigChange} allDayField={allDayField} recurringField={recurringField} />
                </div>
                )}
              </div>
              <div className="flex flex-col gap-0 w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {dayRecords.slice(1, 4).map((rec: any) => <DraggableEvent key={rec.id} record={rec} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={monthVisibleFields} config={config} onConfigChange={onConfigChange} allDayField={allDayField} recurringField={recurringField} />)}
                {dayRecords.length > 4 && <div className="text-[8px] text-muted-foreground pl-1 opacity-70">+{dayRecords.length - 4} more</div>}
              </div>
            </DroppableDateCell>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, recordsByDate, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange, timeZone, allDayField, recurringField }: any) {
  const weekStart = toZonedTime(new Date(currentDate), timeZone);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30 flex-shrink-0">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = toZonedTime(new Date(weekStart), timeZone);
          d.setDate(weekStart.getDate() + i);
          const isToday = format(toZonedTime(new Date(), timeZone), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
          return (
            <div key={i} className={cn("p-2 text-center border-r last:border-r-0", isToday && "bg-primary/5")}>
              <div className="text-xs text-muted-foreground lowercase">{format(d, 'EEE')}</div>
              <div className={cn("text-sm font-semibold w-7 h-7 mx-auto rounded-full flex items-center justify-center mt-1", isToday && "bg-primary text-primary-foreground")}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 min-h-full">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = toZonedTime(new Date(weekStart), timeZone);
            d.setDate(weekStart.getDate() + i);
            const dateKey = format(d, 'yyyy-MM-dd');
            const records = recordsByDate[dateKey] || [];
            return (
              <DroppableDateCell key={i} date={d} className="border-r last:border-r-0 min-h-[200px] p-2 space-y-2">
                {records.map((rec: any) => <div key={rec.id} className="relative z-0"><DraggableEvent record={rec} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} allDayField={allDayField} recurringField={recurringField} /></div>)}
              </DroppableDateCell>
            )
          })}
        </div>
      </div>
    </div>
  );
}
function DayView({ currentDate, recordsByDate, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange, timeZone, allDayField, recurringField, onCreate }: any) {
  const headerDate = toZonedTime(currentDate, timeZone);
  const dateKey = format(headerDate, 'yyyy-MM-dd');
  
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = format(toZonedTime(tomorrow, timeZone), 'yyyy-MM-dd');

  const todayRecords = recordsByDate[dateKey] || [];
  const tomorrowRecords = recordsByDate[tomorrowKey] || [];

  const dateFieldStr = config?.dateField || 'start-time';
  const endDateFieldStr = config?.endDateField || 'end-time';

  const rowHeight = 60; // 60px per hour
  const startHour = 0;
  const endHour = 24; // midnight to midnight
  
  // Hours array from 0 to 24
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  const getPosition = (rec: any, isTomorrow: boolean) => {
    const startStr = rec[dateFieldStr] || rec['start-time'] || rec['start_time'];
    if (!startStr) return null;
    const start = typeof toZonedTime === 'function' ? toZonedTime(new Date(startStr), timeZone) : new Date(startStr);
    
    let hour = start.getHours();
    if (isTomorrow) hour += 24;
    
    const min = start.getMinutes();
    const top = (hour - startHour) * rowHeight + (min / 60) * rowHeight;

    const endStr = rec[endDateFieldStr] || rec['end-time'] || rec['end_time'];
    let end = undefined;
    let durationHours = 1;
    if (endStr) {
        end = typeof toZonedTime === 'function' ? toZonedTime(new Date(endStr), timeZone) : new Date(endStr);
        let endH = end.getHours();
        if (isTomorrow) endH += 24;
        else if (end.getDate() !== start.getDate()) endH += 24;
        
        durationHours = (endH + end.getMinutes() / 60) - (hour + min / 60);
        if (durationHours <= 0) durationHours = 1;
    }
    
    const height = durationHours * rowHeight;
    return { top, height, start, end };
  };

  const displayRecords = [
    ...todayRecords.map((r: any) => ({ rec: r, pos: getPosition(r, false) })),
    ...tomorrowRecords.map((r: any) => ({ rec: r, pos: getPosition(r, true) }))
  ].filter((x: any) => x.pos !== null && x.pos.top + x.pos.height > 0 && x.pos.top < hours.length * rowHeight);

  // Group overlapping records to calculate width/left offsets
  displayRecords.sort((a, b) => a.pos.top - b.pos.top);
  for (let i = 0; i < displayRecords.length; i++) {
    let overlapCount = 0;
    for (let j = 0; j < i; j++) {
      const a = displayRecords[j].pos;
      const b = displayRecords[i].pos;
      if (a.top < b.top + b.height && a.top + a.height > b.top) {
        overlapCount++;
      }
    }
    displayRecords[i].overlapIndex = overlapCount;
  }

  return (
    <ScrollArea className="h-full w-full bg-card">
      <div className="p-4 relative">
        <h3 className="text-xl font-bold mb-4 sticky top-0 bg-card z-20 pb-2 border-b">{format(headerDate, 'PPPP').toLowerCase()}</h3>
        
        <div className="relative mt-4 ml-12" style={{ height: hours.length * rowHeight }}>
          {hours.map(h => {
            let displayH = h % 12;
            let ampm = h >= 12 && h < 24 ? 'pm' : 'am';
            if (displayH === 0) displayH = 12;
            
            const rowDate = new Date(headerDate);
            rowDate.setHours(h, 0, 0, 0);
            const rowId = format(rowDate, "yyyy-MM-dd'T'HH:00:00");

            return (
              <DroppableDateCell 
                key={rowId} 
                date={rowDate} 
                className="absolute w-full border-t border-muted/50 flex flex-col pt-1 group cursor-crosshair hover:bg-accent/10 transition-colors" 
                style={{ top: (h - startHour) * rowHeight, height: rowHeight }}
                onClick={() => {
                   if (onCreate && dateFieldStr) {
                      onCreate({ [dateFieldStr]: rowDate.toISOString() });
                   }
                }}
              >
                <div className="absolute right-full mr-2 -top-2.5 flex items-center justify-end gap-0.5 text-[10px] font-bold text-muted-foreground bg-card whitespace-nowrap" style={{ minWidth: '40px' }}>
                  <span>{displayH}</span>
                  <span className="text-[8px] opacity-70 uppercase tracking-tighter">{ampm}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 pointer-events-none">
                  <Plus className="w-4 h-4" />
                </div>
              </DroppableDateCell>
            );
          })}

          {displayRecords.map(({ rec, pos, overlapIndex }: any) => {
            const leftOffset = Math.min(overlapIndex * 15, 60); // visually stack them without losing them entirely
            return (
              <div 
                key={rec.id}
                className="absolute transition-all z-10" 
                style={{ 
                  top: pos.top, 
                  height: Math.max(pos.height - 1, 22), 
                  left: `${leftOffset}px`,
                  right: `2px`,
                  zIndex: 20 + overlapIndex
                }}
              >
                  <DraggableEvent 
                      record={rec} 
                      collection={collection} 
                      onUpdateRecord={onUpdateRecord} 
                      onDelete={onDelete} 
                      titleField={titleField} 
                      visibleFields={visibleFields} 
                      config={config} 
                      onConfigChange={onConfigChange} 
                      allDayField={allDayField} 
                      recurringField={recurringField} 
                      dateField={dateFieldStr}
                      endDateField={endDateFieldStr}
                      rowHeight={rowHeight}
                      start={pos.start}
                      end={pos.end}
                  />
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

function YearView({ currentDate, recordsByDate, onMonthClick, timeZone }: any) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {months.map(month => {
          const monthDate = toZonedTime(new Date(year, month, 1), timeZone);
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const startDay = monthDate.getDay();
          const hasActivity = Array.from({ length: daysInMonth }, (_, i) => format(toZonedTime(new Date(year, month, i + 1), timeZone), 'yyyy-MM-dd')).some(d => recordsByDate[d]?.length > 0);
          return (
            <div key={month} onClick={() => onMonthClick(new Date(monthDate.getFullYear(), monthDate.getMonth(), monthDate.getDate()))} className={cn("border rounded-md p-2 hover:bg-accent/50 cursor-pointer transition-colors", hasActivity ? "bg-accent/10" : "bg-card")}>
              <div className="text-sm font-bold mb-2 text-center lowercase">{format(monthDate, 'LLLL')}</div>
              <div className="grid grid-cols-7 gap-1 text-[8px] text-center text-muted-foreground">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                {Array.from({ length: startDay }).map((_, i) => <span key={`pad-${i}`}>&nbsp;</span>)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dStr = format(toZonedTime(new Date(year, month, day), timeZone), 'yyyy-MM-dd');
                  const todayKey = format(toZonedTime(new Date(), timeZone), 'yyyy-MM-dd');
                  const isToday = dStr === todayKey;
                  const hasRecords = (recordsByDate[dStr]?.length || 0) > 0;

                  return (
                    <div
                      key={day}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-sm",
                        "bg-[#050505]/20", // base background for all days
                        isToday
                          ? "bg-primary text-primary-foreground font-bold ring-1 ring-primary/50"
                          : "hover:bg-[#050505]/40"
                      )}
                    >
                      <span>{day}</span>
                      {hasRecords && (
                        <span className="mt-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                          {String(recordsByDate[dStr]?.length || 0).padStart(1, '0')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
