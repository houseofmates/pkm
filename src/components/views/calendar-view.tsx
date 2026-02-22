import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Repeat, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';
import { Label } from '@/components/ui/label';
import { format, toZonedTime } from 'date-fns-tz';

// utcToZonedTime may be missing or non-function in some test environments (see vitest),
// so we will check before calling it to avoid runtime errors.


type CalendarViewProps = ViewProps;

type ViewMode = 'year' | 'month' | 'week' | 'day';

export function CalendarView({ data, config, collection, onUpdateRecord, onDelete, onConfigChange, onCreate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!collection) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border border-transparent animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm">loading calendar metadata...</p>
        </div>
      </div>
    );
  }

  const titleField = config?.titleField
    ? collection.fields?.find((f: { name: string; primary?: boolean }) => f.name === config.titleField)
    : collection.fields?.find((f: { name: string; primary?: boolean }) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

  const visibleFieldNames = config?.visibleFields || [];
  const visibleFields = collection?.fields?.filter((f: { name: string }) => visibleFieldNames.includes(f.name)) || [];

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
    if (!dateField) return {};
    const map: Record<string, any[]> = {};

    data.forEach(record => {
      const rawDate = record[dateField];
      if (!rawDate) return;
      // if the helper isn't available, just use the raw date
      const zonedDate = typeof toZonedTime === 'function'
        ? toZonedTime(new Date(rawDate), timeZone)
        : new Date(rawDate);
      const dateStr = format(zonedDate, 'yyyy-MM-dd');
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(record);
    });
    return map;
  }, [data, dateField, timeZone]);

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const newDateStr = String(over.id);
      const recordId = active.id;
      const newDate = typeof toZonedTime === 'function'
        ? toZonedTime(new Date(newDateStr), timeZone)
        : new Date(newDateStr);

      if (onUpdateRecord && dateField) {
        onUpdateRecord(recordId, { [dateField]: newDate.toISOString() });
        toast.success(`rescheduled to ${format(newDate, 'PP', { timeZone })}`);
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
    if (viewMode === 'year') return format(currentDate, 'yyyy');
    if (viewMode === 'month') return format(currentDate, 'LLLL yyyy');
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${format(start, 'PP')} - ${format(end, 'PP')}`;
    }
    if (viewMode === 'day') return format(currentDate, 'PPPP');
    return '';
  }, [currentDate, viewMode]);

  const draggedRecord = data.find(r => r.id === activeId);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          {viewMode === 'year' && <YearView currentDate={currentDate} recordsByDate={recordsByDate} onMonthClick={(date) => { setCurrentDate(date); setViewMode('month'); }} timeZone={timeZone} />}
          {viewMode === 'month' && <MonthView currentDate={currentDate} recordsByDate={recordsByDate} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} timeZone={timeZone} allDayField={allDayField} recurringField={recurringField} />}
          {viewMode === 'week' && <WeekView currentDate={currentDate} recordsByDate={recordsByDate} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} timeZone={timeZone} allDayField={allDayField} recurringField={recurringField} />}
          {viewMode === 'day' && <DayView currentDate={currentDate} recordsByDate={recordsByDate} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} timeZone={timeZone} allDayField={allDayField} recurringField={recurringField} />}
        </div>
      </div>
      <DragOverlay>{activeId && draggedRecord ? <div className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded shadow-lg opacity-80 rotate-3 cursor-grabbing whitespace-nowrap">{draggedRecord.title || draggedRecord.name || 'untitled'}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function DraggableEvent({ record, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange, allDayField, recurringField }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: record.id });
  const isAllDay = allDayField && record[allDayField];
  const isRecurring = recurringField && record[recurringField];

  return (
    <RecordContextMenu record={record} collection={collection} onUpdate={onUpdateRecord} onDelete={onDelete} titleField={titleField} config={config} onConfigChange={onConfigChange}>
      <div ref={setNodeRef} {...listeners} {...attributes} className={cn("text-[10px] bg-primary/10 text-primary px-1.5 py-1 rounded truncate cursor-grab hover:bg-primary/20 transition-colors shadow-sm", isDragging && "opacity-50", isAllDay && "bg-green-500/10 text-green-500")} title={String(record[titleField.name] || '')}>
        <div className="truncate font-bold mb-0.5 flex items-center gap-1">
          {isRecurring && <Repeat className="h-3 w-3" />}
          {isAllDay && <CalendarIcon className="h-3 w-3" />}
          {String(record[titleField.name] || 'untitled')}
        </div>
        {visibleFields.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-1 opacity-90">
            {visibleFields.slice(0, 3).map((f: any) => (
              <div key={f.name} className="text-[8px] flex flex-col gap-0">
                <span className="opacity-50 lowercase">{f.uiSchema?.title || f.name}:</span>
                <SmartField value={record[f.name]} field={f} record={record} collectionName={collection.name} size="sm" className="h-auto p-0 border-none bg-transparent text-[8px] leading-tight" onChange={() => { }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </RecordContextMenu>
  )
}

function DroppableDateCell({ date, children, className }: { date: Date, children: React.ReactNode, className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: format(date, 'yyyy-MM-dd') });
  return <div ref={setNodeRef} className={cn(className, isOver && "bg-accent/30 ring-2 ring-primary/20 z-10")}>{children}</div>;
}

function MonthView({ currentDate, recordsByDate, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange, timeZone, allDayField, recurringField }: any) {
  const monthStart =
    typeof utcToZonedTime === 'function'
      ? utcToZonedTime(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), timeZone)
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDayOfWeek = monthStart.getDay();
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(utcToZonedTime(new Date(currentDate.getFullYear(), currentDate.getMonth(), i), timeZone));
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
          const isToday = format(utcToZonedTime(new Date(), timeZone), 'yyyy-MM-dd') === dateKey;
          return (
            <DroppableDateCell key={dateKey} date={date} className={cn("border-b border-r p-1 md:p-2 flex flex-col gap-1 min-h-[60px] md:min-h-[80px] hover:bg-muted/10 transition-colors group relative overflow-hidden", isToday && "bg-primary/5")}>
              <span className={cn("text-[10px] md:text-xs font-medium w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full mb-1", isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{date.getDate()}</span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayRecords.slice(0, 3).map((rec: any) => <DraggableEvent key={rec.id} record={rec} collection={collection} onUpdateRecord={onUpdateRecord} onDelete={onDelete} titleField={titleField} visibleFields={visibleFields} config={config} onConfigChange={onConfigChange} allDayField={allDayField} recurringField={recurringField} />)}
                {dayRecords.length > 3 && <div className="text-[9px] text-muted-foreground pl-1">+{dayRecords.length - 3} more</div>}
              </div>
            </DroppableDateCell>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, recordsByDate, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange, timeZone, allDayField, recurringField }: any) {
  const weekStart = utcToZonedTime(new Date(currentDate), timeZone);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30 flex-shrink-0">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = utcToZonedTime(new Date(weekStart), timeZone);
          d.setDate(weekStart.getDate() + i);
          const isToday = format(utcToZonedTime(new Date(), timeZone), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
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
            const d = utcToZonedTime(new Date(weekStart), timeZone);
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

function DayView({ currentDate, recordsByDate, collection, onUpdateRecord, onDelete, titleField, visibleFields, config, onConfigChange, timeZone, allDayField, recurringField }: any) {
  const dateKey = format(toZonedTime(currentDate, timeZone), 'yyyy-MM-dd');
  const records = recordsByDate[dateKey] || [];
  return (
    <div className="h-full w-full p-4 overflow-y-auto">
      <h3 className="text-xl font-bold mb-4">{format(currentDate, 'PPPP')}</h3>
      {records.length === 0 ? <div className="text-muted-foreground text-sm">no events</div> : (
        <div className="space-y-4">
          {records.map((rec: any) => (
            <RecordContextMenu key={rec.id} record={rec} collection={collection} onUpdate={onUpdateRecord} onDelete={onDelete} titleField={titleField} config={config} onConfigChange={onConfigChange}>
              <div className="p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: String(rec.color || 'var(--primary)') }} />
                  <div className="flex-1 font-bold text-lg"><SmartField value={rec[titleField.name]} field={titleField} record={rec} collectionName={collection.name} onChange={(val) => onUpdateRecord?.(rec.id, { [titleField.name]: val })} className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 bg-muted/20 p-3 rounded-lg">
                  {visibleFields.map((f: any) => (
                    <div key={f.name} className="flex flex-col gap-1">
                      <Label className="text-[10px] text-muted-foreground ">{f.uiSchema?.title || f.name}</Label>
                      <SmartField value={rec[f.name]} field={f} record={rec} collectionName={collection.name} onChange={(val) => onUpdateRecord?.(rec.id, { [f.name]: val })} className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 text-sm text-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </RecordContextMenu>
          ))}
        </div>
      )}
    </div>
  )
}

function YearView({ currentDate, recordsByDate, onMonthClick, timeZone }: any) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {months.map(month => {
          const monthDate = utcToZonedTime(new Date(year, month, 1), timeZone);
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const startDay = monthDate.getDay();
          const hasActivity = Array.from({ length: daysInMonth }, (_, i) => format(utcToZonedTime(new Date(year, month, i + 1), timeZone), 'yyyy-MM-dd')).some(d => recordsByDate[d]?.length > 0);
          return (
            <div key={month} onClick={() => onMonthClick(monthDate)} className={cn("border rounded-md p-2 hover:bg-accent/50 cursor-pointer transition-colors", hasActivity ? "bg-accent/10" : "bg-card")}>
              <div className="text-sm font-bold mb-2 text-center lowercase">{format(monthDate, 'LLLL')}</div>
              <div className="grid grid-cols-7 gap-1 text-[8px] text-center text-muted-foreground">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <span key={d}>{d}</span>)}
                {Array.from({ length: startDay }).map((_, i) => <span key={`pad-${i}`}>&nbsp;</span>)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dStr = format(utcToZonedTime(new Date(year, month, day), timeZone), 'yyyy-MM-dd');
                  const count = recordsByDate[dStr]?.length || 0;
                  return <div key={day} className={cn("aspect-square flex items-center justify-center rounded-sm", count > 0 ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted")}>{day}</div>
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
