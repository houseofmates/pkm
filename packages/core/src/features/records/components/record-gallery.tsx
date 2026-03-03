import { cn } from '@/lib/utils';
import { RecordContextMenu } from './record-context-menu';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface RecordGalleryProps {
  data: any[];
  collection: any;
  onUpdateRecord?: (id: string | number, data: any) => void;
  onDelete?: (rec: any) => void;
}

function GalleryItem({ record, collection, onUpdate, onDelete }: { record: any, collection: any, onUpdate?: any, onDelete?: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `gallery-record-${record.id}`,
    data: {
      type: 'pkm-record',
      id: record.id,
      collection: collection.name,
      title: record.title || record.name || 'Untitled'
    }
  });

  // color from record or collection
  const itemColor = record.color || collection.metadata?.color || 'var(--primary)';

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
    borderColor: itemColor,
    boxShadow: isDragging ? `0 0 20px ${itemColor}40` : undefined,
  };

  // extract image if any
  const imageUrl = record.image || record.url || (record.content && record.content.match(/\.(jpeg|jpg|gif|png|webp)$/) ? record.content : null);

  return (
    <RecordContextMenu
      record={record}
      collection={collection}
      onUpdate={onUpdate}
      onDelete={onDelete}
      className="h-full"
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "relative aspect-square rounded-xl border bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col group transition-all",
          "cursor-grab active:cursor-grabbing hover:scale-[1.02]"
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <span className="text-xs text-muted-foreground line-clamp-3 lowercase font-medium">
              {record.title || record.name || record.content || 'untitled'}
            </span>
          </div>
        )}

        {/* visual indicator of source/type if needed */}
        <div
          className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: itemColor }}
        />
      </div>
    </RecordContextMenu>
  );
}

export function RecordGallery({ data, collection, onUpdateRecord, onDelete }: RecordGalleryProps) {
  const validRecords = data?.filter((r: any) => { \n    if (!r || !r.id) return false; \n    if (!r.title && !r.name && !r.content && !r.image && !r.url && !r.file) return false; \n    return true; \n }) || [];

  if (validRecords.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[50vh] text-primary/60">
        <span className="text-sm font-medium lowercase">no entries in {collection?.title || collection?.name || 'this collection'}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-2">
      {validRecords.map((record) => (
        <GalleryItem
          key={record.id}
          record={record}
          collection={collection}
          onUpdate={onUpdateRecord}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}