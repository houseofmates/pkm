import { useMemo, useState, useRef } from 'react';
import type { ViewProps } from './registry';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { SmartField } from '@/components/fields/smart-field';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { toast } from 'sonner';
import { Diamond } from 'lucide-react';

type GanttViewProps = ViewProps;

export function GanttView({ data, config, collection, onUpdateRecord, onDelete, onConfigChange }: GanttViewProps) {
  const dateFields = collection?.fields?.filter((f: { interface?: string }) => f.interface === 'datetime' || f.interface === 'date') || [];
  const [dragging, setDragging] = useState<any>(null);

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

  const startField = config?.ganttStartField || dateFields[0]?.name;
  const endField = config?.ganttEndField || dateFields[1]?.name || startField;
  const dependenciesField = config?.ganttDependenciesField;
  const progressField = config?.ganttProgressField;
  const milestoneField = config?.ganttMilestoneField;

  const titleField = config?.titleField
    ? collection.fields?.find((f: { name: string; primary?: boolean }) => f.name === config.titleField)
    : collection.fields?.find((f: { name: string; primary?: boolean }) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

  const visibleFieldNames = config?.visibleFields || [];
  const visibleFields = collection?.fields?.filter((f: { name: string }) => visibleFieldNames.includes(f.name)) || [];

  const { startDate, timelineDays } = useMemo(() => {
    if (!data.length || !startField) {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return { startDate: start, endDate: end, timelineDays: eachDayOfInterval({ start, end }) };
    }

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

    const start = addDays(min, -5);
    const end = addDays(max, 10);

    return { startDate: start, endDate: end, timelineDays: eachDayOfInterval({ start, end }) };
  }, [data, startField, endField]);

  const recordPositions = useMemo(() => {
    const positions: any = {};
    data.forEach((record, index) => {
      const sDate = record[startField] ? new Date(record[startField]) : null;
      if (sDate) {
        const left = differenceInDays(sDate, startDate) * 40;
        const eDate = record[endField] ? new Date(record[endField]) : sDate;
        const width = (differenceInDays(eDate, sDate) + 1) * 40;
        positions[record.id] = { top: index * 40, left, width };
      }
    });
    return positions;
  }, [data, startField, endField, startDate]);

  if (!startField) {
    return <div className="p-10 text-center opacity-50">no date fields found. please add a date field to use gantt view.</div>;
  }

  const colWidth = 40;

  const handleBarClick = (record: any) => {
    window.dispatchEvent(new CustomEvent('pkm:edit-record', { detail: { record, collectionName: collection.name } }));
  };

  const handleDragEnd = (event: any) => {
    const { active, delta } = event;
    const { id, type } = active.data.current;
    const record = data.find(r => r.id === id);
    if (!record) return;

    const days = Math.round(delta.x / colWidth);
    const sDate = record[startField] ? new Date(record[startField]) : new Date();
    const eDate = record[endField] ? new Date(record[endField]) : sDate;

    if (type === 'move') {
      const newStartDate = addDays(sDate, days);
      const newEndDate = addDays(eDate, days);
      onUpdateRecord?.(id, { [startField]: newStartDate, [endField]: newEndDate });
      toast.success('task moved');
    } else if (type === 'resize-end') {
      const newEndDate = addDays(eDate, days);
      onUpdateRecord?.(id, { [endField]: newEndDate });
      toast.success('task duration changed');
    }
    setDragging(null);
  };

  return (
    <DndContext onDragStart={({ active }) => setDragging(active.data.current)} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden select-none">
        <div className="flex border-b bg-muted/20">
          <div className="w-48 p-2 border-r font-bold text-xs sticky left-0 bg-background z-20 shrink-0 shadow-sm flex items-center">
            task name
          </div>
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <div className="flex" style={{ width: `${timelineDays.length * colWidth}px` }}>
              {timelineDays.map((d, i) => (
                <div key={i} className={cn("border-r p-1 text-[10px] text-center shrink-0 h-10 flex flex-col justify-center", d.getDay() === 0 || d.getDay() === 6 ? "bg-muted/30" : "")} style={{ width: `${colWidth}px` }}>
                  <span className="font-bold">{d.getDate()}</span>
                  <span className="opacity-50 text-[9px] ">{format(d, 'EEE')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="relative min-w-full" style={{ height: data.length * 40 }}>
            {dependenciesField && data.map(record => {
              const deps = record[dependenciesField] || [];
              const sourcePos = recordPositions[record.id];
              if (!sourcePos) return null;

              return deps.map((dep: any) => {
                const targetId = typeof dep === 'object' ? dep.id : dep;
                const targetPos = recordPositions[targetId];
                if (!targetPos) return null;

                const startX = sourcePos.left + sourcePos.width;
                const startY = sourcePos.top + 20;
                const endX = targetPos.left;
                const endY = targetPos.top + 20;

                return (
                  <svg key={`${record.id}-${targetId}`} className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
                    <path d={`M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`} stroke="currentColor" strokeWidth="1" fill="none" className="text-primary/50" markerEnd="url(#arrow)" />
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="text-primary/50" />
                      </marker>
                    </defs>
                  </svg>
                );
              });
            })}

            {data.map((record, index) => {
              const sDate = record[startField] ? new Date(record[startField]) : null;
              const eDate = record[endField] ? new Date(record[endField]) : sDate;
              let left = 0, width = 0, visible = false;

              if (sDate && eDate) {
                const diffStart = differenceInDays(sDate, startDate);
                const duration = differenceInDays(eDate, sDate) + 1;
                left = diffStart * colWidth;
                width = duration * colWidth;
                visible = true;
              }
              
              const isMilestone = milestoneField && record[milestoneField];
              const progress = progressField ? record[progressField] || 0 : 0;

              return (
                <RecordContextMenu key={record.id} record={record} collection={collection} onUpdate={onUpdateRecord} onDelete={onDelete} titleField={titleField} config={config} onConfigChange={onConfigChange} className="contents">
                  <div className="flex border-b hover:bg-muted/10 items-center h-[40px] py-1 group absolute" style={{ width: '100%', top: index * 40 }}>
                    <div className="w-48 p-2 border-r text-xs font-medium sticky left-0 bg-background z-10 shrink-0 truncate flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <SmartField value={record[titleField.name]} field={titleField} record={record} collectionName={collection.name} size="sm" onChange={(val) => onUpdateRecord?.(record.id, { [titleField.name]: val })} className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 font-black text-sm w-full" />
                      </div>
                    </div>
                    <div className="flex-1 relative h-full">
                      <div className="absolute inset-0 flex pointer-events-none">
                        {timelineDays.map((d, i) => <div key={i} className={cn("border-r shrink-0 h-full", d.getDay() === 0 || d.getDay() === 6 ? "bg-muted/10" : "")} style={{ width: `${colWidth}px` }} />)}
                      </div>
                      {visible && !isMilestone && <TaskBar record={record} left={left} width={width} sDate={sDate} eDate={eDate} onDoubleClick={() => handleBarClick(record)} progress={progress} colWidth={colWidth} />}
                      {visible && isMilestone && <Milestone record={record} left={left} sDate={sDate} />}
                    </div>
                  </div>
                </RecordContextMenu>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </DndContext>
  );
}

function TaskBar({ record, left, width, sDate, eDate, onDoubleClick, progress, colWidth }: any) {
  const { attributes: move_attr, listeners: move_listeners, setNodeRef: move_ref } = useDraggable({ id: `move-${record.id}`, data: { id: record.id, type: 'move' } });
  const { attributes: resize_attr, listeners: resize_listeners, setNodeRef: resize_ref } = useDraggable({ id: `resize-${record.id}`, data: { id: record.id, type: 'resize-end' } });

  return (
    <div ref={move_ref} {...move_attr} {...move_listeners} className="absolute top-2 bottom-2 bg-blue-500/20 border border-blue-500 text-blue-700 dark:text-blue-300 rounded-md flex items-center px-2 text-[10px] whitespace-nowrap overflow-hidden shadow-sm hover:brightness-110 cursor-move transition-all" style={{ left: `${left}px`, width: `${Math.max(width, colWidth)}px` }} title={`${format(sDate!, 'PP')} - ${format(eDate!, 'PP')}`} onDoubleClick={onDoubleClick}>
      <div className="absolute top-0 left-0 h-full bg-blue-500/40 rounded-md" style={{ width: `${progress}%` }} />
      <div className="truncate w-full font-black opacity-80 group-hover:opacity-100 relative">
        {record.title || record.name}
      </div>
      <div ref={resize_ref} {...resize_attr} {...resize_listeners} className="absolute right-0 w-2 h-full cursor-e-resize bg-blue-600/30 opacity-0 hover:opacity-100" />
    </div>
  )
}

function Milestone({ record, left, sDate }: any) {
  return (
    <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${left}px` }} title={format(sDate!, 'PP')}>
      <Diamond className="w-4 h-4 text-primary" />
    </div>
  )
}
