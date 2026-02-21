import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { Trash2, MoreHorizontal } from 'lucide-react';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { memo } from 'react';

// Memoized row to prevent re-renders
const Row = memo(({ index, style, data }: any) => {
  const { items, collection, config, onConfigChange, onEdit, onDelete, onUpdateRecord } = data;
  const record = items[index];

  const titleField = config.titleField
    ? collection.fields?.find((f: { name: string; primary?: boolean }) => f.name === config.titleField)
    : collection.fields?.find((f: { name: string; primary?: boolean }) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

  const visibleFieldNames = config.visibleFields || [];
  const visibleFields = collection?.fields?.filter((f: { name: string }) => visibleFieldNames.includes(f.name)) || [];

  // cover logic
  const coverField = config.coverField ? collection.fields?.find((f: { name: string }) => f.name === config.coverField) : null;
  const coverValue = coverField ? record[coverField.name] : null;
  const attachmentField = collection.fields?.find((f: { interface?: string; name: string }) => f.interface === 'attachment');
  const firstImage = coverValue || (attachmentField ? record[attachmentField.name] : null);
  const imageUrl = Array.isArray(firstImage) ? firstImage[0]?.url : (firstImage?.url || null);

  return (
    <div style={style} className="px-1 pb-2">
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
          className="group flex flex-col md:flex-row md:items-center justify-between p-3 bg-card hover:bg-muted/50 border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer gap-4 h-full overflow-hidden"
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
                    value={record[titleField.name]}
                    field={titleField}
                    record={record}
                    collectionName={collection.name}
                    size="sm"
                    onChange={(val) => onUpdateRecord?.(record.id, { [titleField.name]: val })}
                    className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 font-bold text-lg w-full truncate"
                  />
                </div>
              </div>

              {visibleFields.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 h-6 overflow-hidden">
                  {visibleFields.map((f: { name: string; uiSchema?: { title?: string } }) => (
                    <div key={f.name} className="flex items-center gap-1.5 min-w-0 max-w-[200px]">
                      <span className="text-[10px] text-muted-foreground lowercase shrink-0">{f.uiSchema?.title || f.name}:</span>
                      <SmartField
                        value={record[f.name]}
                        field={f}
                        record={record}
                        collectionName={collection.name}
                        size="sm"
                        onChange={(val) => onUpdateRecord?.(record.id, { [f.name]: val })}
                        className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 text-sm truncate"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(record); }}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(record); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </RecordContextMenu>
    </div>
  );
});

export function ListView({ data, collection, config = {}, onConfigChange, onEdit, onDelete, onUpdateRecord }: ViewProps) {
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

  if (!data.length) {
    return <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl text-sm">no items found</div>;
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={data.length}
            itemSize={100}
            width={width}
            itemData={{ items: data, collection, config, onConfigChange, onEdit, onDelete, onUpdateRecord }}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}
