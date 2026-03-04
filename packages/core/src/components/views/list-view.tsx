import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { Trash2, MoreHorizontal, Plus } from 'lucide-react';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';
import { useAppSetting } from '@/hooks/use-app-setting';
import { getLucideIcon } from '@/lib/field-meta';
import { List as _List } from 'react-window';
import { AutoSizer as _AutoSizer } from 'react-virtualized-auto-sizer';

// react-window v2 ships its own types that conflict with @types/react-window v1 API.
// The v1 API (itemCount, itemSize, etc) works at runtime; cast to bypass the type mismatch.
const List = _List as any;
const AutoSizer = _AutoSizer as any;

// Row component for react-window List
const RowComponent = ({ index, style, data }: { index: number; style: React.CSSProperties; data: any }): React.ReactElement | null => {
  const { rows, collection, config, onConfigChange, onEdit, onDelete, onUpdateRecord } = data;
  const record = rows[index];

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
                  {visibleFields.map((f: { name: string; uiSchema?: { title?: string } }) => {
                    const collMeta = metadata[collection.name] || {};
                    const fieldColor = collMeta.fieldColors?.[f.name];
                    const iconInfo = collMeta.fieldIcons?.[f.name] || {};
                    const labelText = f.uiSchema?.title || f.name;
                    return (
                      <div key={f.name} className="flex items-center gap-1.5 min-w-0 max-w-[200px]">
                        <span className="text-[10px] text-muted-foreground lowercase shrink-0 flex items-center gap-1" style={{ color: fieldColor || undefined }}>
                          {iconInfo.icon && iconInfo.iconType === 'emoji' && (
                            <span style={{ color: iconInfo.iconColor || fieldColor }}>{iconInfo.icon}</span>
                          )}
                          {iconInfo.icon && iconInfo.iconType === 'lucide' && (() => {
                            const Icon = getLucideIcon(iconInfo.icon);
                            return Icon ? <Icon className="h-3 w-3" style={{ color: iconInfo.iconColor || fieldColor }} /> : null;
                          })()}
                          {labelText}:
                        </span>
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
};

export function ListView({ data, collection, config = {}, onConfigChange, onEdit, onDelete, onUpdateRecord, onCreate }: ViewProps) {
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
    <div className="h-full w-full flex flex-col">
      {onCreate && (
        <div className="p-2">
          <Button onClick={() => onCreate({})} aria-label="add record">
            <Plus className="h-4 w-4" /> add
          </Button>
        </div>
      )}
      <div className="flex-1">
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              itemCount={data.length}
              itemSize={100}
              height={height}
              width={width}
              itemData={{ rows: data, collection, config, onConfigChange, onEdit, onDelete, onUpdateRecord }}
            >
              {RowComponent as any}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

