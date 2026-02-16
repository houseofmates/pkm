import { useMemo } from 'react';
import type { ViewProps } from './registry';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { SmartField } from '@/components/fields/smart-field';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';

interface GanttViewProps extends ViewProps { }

export function GanttView({ data, config, collection, onUpdateRecord, onDelete, onConfigChange }: GanttViewProps) {
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

  // Unified Property Logic
  const titleField = config?.titleField
  ? collection.fields?.find((f: any) => f.name === config.titleField)
  : collection.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

  const visibleFieldNames = config?.visibleFields || [];
  const visibleFields = collection?.fields?.filter((f: any) => visibleFieldNames.includes(f.name)) || [];

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
  window.dispatchEvent(new CustomEvent('pkm:edit-record', {
  detail: { record: record, collectionName: collection.name }
  }));
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
   <span className="opacity-50 text-[9px] ">{format(d, 'EEE')}</span>
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
   <RecordContextMenu
   key={record.id}
   record={record}
   collection={collection}
   onUpdate={onUpdateRecord}
   onDelete={onDelete}
   titleField={titleField}
   config={config}
   onConfigChange={onConfigChange}
   className="contents"
   >
   <div className="flex border-b hover:bg-muted/10 items-center min-h-[40px] py-1 group relative">
   <div className="w-48 p-2 border-r text-xs font-medium sticky left-0 bg-background z-10 shrink-0 truncate flex items-center gap-2">
  {/* Status Indicator */}
  <div className="w-2 h-2 rounded-full bg-primary/50 shrink-0" />
  <div className="flex-1 min-w-0">
  <SmartField
  value={record[titleField.name]}
  field={titleField}
  record={record}
  collectionName={collection.name}
  size="sm"
  onChange={(val) => onUpdateRecord?.(record.id, { [titleField.name]: val })}
  className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 font-black text-sm w-full"
  />

  {/* Universal Property Visibility */}
  {visibleFields.length > 0 && (
  <div className="flex flex-col gap-0.5 mt-1">
    {visibleFields.slice(0, 3).map((f: any) => (
    <div key={f.name} className="flex items-center gap-1 min-w-0">
    <span className="text-[9px] text-muted-foreground lowercase shrink-0 opacity-50">{f.uiSchema?.title || f.name}:</span>
    <SmartField
   value={record[f.name]}
   field={f}
   record={record}
   collectionName={collection.name}
   size="sm"
   onChange={(val) => onUpdateRecord?.(record.id, { [f.name]: val })}
   className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 text-[10px] truncate"
    />
    </div>
    ))}
  </div>
  )}
  </div>
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
  <div className="truncate w-full font-black opacity-80 group-hover:opacity-100">
    {record[titleField.name]}
  </div>
  <div className="absolute left-0 w-1 h-full cursor-w-resize bg-blue-600/30 opacity-0 group-hover:opacity-100" />
  <div className="absolute right-0 w-1 h-full cursor-e-resize bg-blue-600/30 opacity-0 group-hover:opacity-100" />
  </div>
  )}
   </div>
   </div>
   </RecordContextMenu>
 );
 })}
 </div>
  </ScrollArea>
  </div>
  );
}
