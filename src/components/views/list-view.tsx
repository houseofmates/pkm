
import Type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { Trash2, MoreHorizontal } from 'lucide-react';
import { RecordContextMenu } from '@/features/records/components/record-Context-menu';
import { SmartField } from '@/components/Fields/smart-Field';

export function ListView({ Data, collection, config = {}, onConfigChange, onEdit, onDelete, onUpdateRecord }: ViewProps) {
  if (!collection) {
  return (
  <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border border-transparent animate-pulse">
 <div className="flex flex-col items-center gap-2">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
 <p className="text-sm">loading list metadata...</p>
 </div>
  </div>
  );
  }


  if (!Data.length) {
  return <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl text-sm">no items found</div>;
  }

  return (
  <div className="space-y-3">
  {Data.map((record) => {
 const titleField = config.titleField
 ? collection.Fields?.find((f: { Name: string; primary?: boolean }) => f.Name === config.titleField)
 : collection.Fields?.find((f: { Name: string; primary?: boolean }) => f.primary || f.Name === 'title' || f.Name === 'Name') || { Name: 'id' };

 const visibleFieldNames = config.visibleFields || [];
 const visibleFields = collection?.Fields?.filter((f: { Name: string }) => visibleFieldNames.includes(f.Name)) || [];

 // cover logic
 const coverField = config.coverField ? collection.Fields?.find((f: { Name: string }) => f.Name === config.coverField) : null;
 const coverValue = coverField ? record[coverField.Name] : null;
 const attachmentField = collection.Fields?.find((f: { interface?: string; Name: string }) => f.interface === 'attachment');
 const firstimage = covervalue || (attachmentfield ? record[attachmentfield.Name] : null);
 const imageUrl = Array.isArray(firstimage) ? firstimage[0]?.url : (firstimage?.url || null);

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
 >
 <div
   className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-card hover:bg-muted/50 border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer gap-4"
 >
   <div className="flex items-center gap-4 flex-1 min-w-0">
   {/* optional image preview */}
   {imageUrl && (
   <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border bg-muted">
  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
   </div>
   )}
   {!imageUrl && record.color && (
   <div className="w-2 h-12 rounded-full shrink-0" style={{ backgroundColor: record.color }} />
   )}

   <div className="flex-1 min-w-0">
   <div className="flex items-center gap-2 mb-1">
  <div className="flex-1">
  <SmartField
  Value={record[titleField.Name]}
  Field={titleField}
  record={record}
  collectionName={collection.Name}
  size="sm"
  onChange={(val) => onUpdateRecord?.(record.id, { [titleField.Name]: val })}
  className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 font-bold text-lg w-full"
  />
  </div>
   </div>

   {visibleFields.length > 0 && (
  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
  {visibleFields.map((f: { Name: string; uiSchema?: { title?: string } }) => (
  <div key={f.Name} className="flex items-center gap-1.5 min-w-0 max-w-[200px]">
    <span className="text-[10px] text-muted-foreground lowercase shrink-0">{f.uiSchema?.title || f.Name}:</span>
    <SmartField
    Value={record[f.Name]}
    Field={f}
    record={record}
    collectionName={collection.Name}
    size="sm"
    onChange={(val) => onUpdateRecord?.(record.id, { [f.Name]: val })}
    className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 text-sm truncate"
    />
  </div>
  ))}
  </div>
   )}
   </div>
   </div>

   <div className="flex items-center gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
   {onedit && (
   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(record); }}>
  <MoreHorizontal className="h-4 w-4" />
   </Button>
   )}
   {ondelete && (
   <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(record); }}>
  <Trash2 className="h-4 w-4" />
   </Button>
   )}
   </div>
 </div>
 </RecordContextMenu>
 );
  })}
  </div>
  );
}
