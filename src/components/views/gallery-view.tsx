import type { ViewProps } from './registry';
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from 'lucide-react';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';

export function GalleryView({ data, loading, collection, config = {}, onUpdateRecord, onDelete, onConfigChange, onCreate }: ViewProps) {
  if (loading || !collection) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border border-transparent animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm">loading gallery...</p>
        </div>
      </div>
    );
  }

  // helper to get image url from a record field
  const getImageUrl = (record: Record<string, any>, field: { name: string } | null) => {
    if (!field) return null;
    const value = record[field.name];
    if (!value) return null;

    // handle nocobase attachment array
    if (Array.isArray(value) && value.length > 0) {
      return value[0].url || value[0].url_thumbnail || null;
    }
    // handle string url
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/'))) {
      return value;
    }
    return null;
  };

  // detect fields if not configured
  // priority: config -> explicit 'attachment' interface -> name includes 'image'/'cover'
  const imageField = config.coverField
    ? collection?.fields?.find((f: { name: string; interface?: string }) => f.name === config.coverField)
    : (collection?.fields?.find((f: { name: string; interface?: string }) => f.interface === 'attachment')
      || collection?.fields?.find((f: { name: string }) => f.name.toLowerCase().includes('image') || f.name.toLowerCase().includes('cover')));

  // priority: config -> 'title'/'name' -> first input field
  const titleField = config.titleField
    ? collection?.fields?.find((f: { name: string; interface?: string }) => f.name === config.titleField)
    : (collection?.fields?.find((f: { name: string }) => f.name === 'title' || f.name === 'name')
      || collection?.fields?.find((f: { interface?: string }) => f.interface === 'input'));

  const visibleFieldNames = config.visibleFields || [];
  const visibleFields = collection?.fields?.filter((f: { name: string }) => visibleFieldNames.includes(f.name)) || [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {onCreate && (
        <div className="flex items-center justify-center border border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/20" onClick={() => onCreate({})} aria-label="add item">
          <Plus className="h-6 w-6" />
        </div>
      )}
      {data.map((record, i) => {
        const imageUrl = getImageUrl(record, imageField);
        const title = titleField ? record[titleField.name] : (record.id || 'untitled');

        return (
          <RecordContextMenu
            key={record.id || i}
            record={record}
            collection={collection}
            onUpdate={onUpdateRecord}
            onDelete={onDelete}
            titleField={titleField}
            config={config}
            onConfigChange={onConfigChange}
          >
            <Card className="rounded-xl shadow-lg border-2 border-transparent p-0 relative hover:scale-[1.02] transition-all bg-card overflow-hidden flex flex-col group/card">
              {/* inner content vessel */}
              <div className="flex flex-col h-full w-full rounded-[inherit] overflow-hidden">
                {imageUrl && (
                  <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden rounded-t-[inherit]">
                    <img
                      src={imageUrl}
                      alt="cover"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 rounded-t-[inherit]"
                    />

                    {/* hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-[inherit]">
                      <span className="text-white text-xs font-bold px-2 py-1 border border-primary bg-primary/20 rounded-full lowercase">
                        view details
                      </span>
                    </div>
                  </div>
                )}
                <CardContent className="p-3 bg-card/95 rounded-b-[inherit]">
                  {/* editable title */}
                  <div className="font-black text-xl mb-1 text-center" onClick={(e) => e.stopPropagation()}>
                    {titleField ? (
                      <SmartField
                        value={record[titleField.name]}
                        field={titleField}
                        record={record}
                        collectionName={collection.name}
                        size="sm"
                        onChange={(val) => {
                          if (onUpdateRecord) {
                            onUpdateRecord(record.id, { [titleField.name]: val });
                          }
                        }}
                        className="h-auto p-0 border-none bg-transparent hover:bg-muted/50 rounded px-1 w-full font-bold text-center"
                      />
                    ) : (
                      <span className="px-1 truncate block">{typeof title === 'string' ? title : String(title)}</span>
                    )}
                  </div>
                  {/* editable properties (max 3) */}
                  {visibleFields.length > 0 && (
                    <div className="mt-2 space-y-1 text-center" onClick={(e) => e.stopPropagation()}>
                      {visibleFields.slice(0, 3).map((f: { name: string; uiSchema?: { title?: string } }) => (
                        <div key={f.name} className="text-xs text-muted-foreground truncate flex flex-col items-center gap-0.5">
                          <span className="opacity-50 lowercase text-[10px] ">{f.uiSchema?.title || f.name}:</span>
                          <div className="w-full">
                            <SmartField
                              value={record[f.name]}
                              field={f}
                              record={record}
                              size="sm"
                              onChange={(val) => {
                                if (onUpdateRecord) {
                                  onUpdateRecord(record.id, { [f.name]: val });
                                }
                              }}
                              className="h-auto p-0 border-none bg-transparent hover:bg-muted/50 rounded px-1 text-center"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          </RecordContextMenu>
        );
      })}
      {data.length === 0 && <div className="col-span-full text-center p-10">no items found.</div>}
    </div>
  );
}
