import type { ViewProps } from './registry';
import { CardContent } from "@/components/ui/card";
import { Plus } from 'lucide-react';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { RecordEditContent } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

export function GalleryView({ data, loading, collection, config = {}, onUpdateRecord, onDelete, onConfigChange, onCreate }: ViewProps) {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [viewConfigRecord, setViewConfigRecord] = useState<any | null>(null);
  const [editingTitleRecordId, setEditingTitleRecordId] = useState<string | number | null>(null);
  const singleClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordOrder: (string | number)[] = config.recordOrder || [];
  const orderedData = recordOrder.length > 0
    ? [...data].sort((a, b) => {
        const ai = recordOrder.indexOf(a.id);
        const bi = recordOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : data;

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = orderedData.map((r: any) => r.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...ids];
    const [removed] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, removed);
    onConfigChange?.('recordOrder', next);
  }, [orderedData, onConfigChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // helper to get media asset (url + kind) from record field or common keys
  const getMediaAsset = (record: Record<string, any>, field: { name: string } | null) => {
    const coerce = (val: any) => {
      if (!val) return null;
      const url = val.url || val.url_thumbnail || val.thumb || val.preview || (typeof val === 'string' ? val : null);
      if (!url) return null;
      const mime = (val.mimetype || val.mime || val.type || '').toLowerCase();
      const isVideo = mime.includes('video') || /\.(mp4|webm|mov|m4v)$/i.test(url);
      const isPdf = mime.includes('pdf') || /\.pdf$/i.test(url);
      const kind: 'image' | 'video' | 'pdf' = isPdf ? 'pdf' : isVideo ? 'video' : 'image';
      return { url, kind };
    };

    if (field) {
      const value = record[field.name];
      if (Array.isArray(value) && value.length > 0) return coerce(value[0]);
      const single = coerce(value);
      if (single) return single;
    }
    const fallbacks = ['avatar', 'image', 'photo', 'picture', 'icon', 'cover', 'url'];
    for (const key of fallbacks) {
      const v = record[key];
      if (Array.isArray(v) && v.length > 0) {
        const c = coerce(v[0]);
        if (c) return c;
      }
      const c = coerce(v);
      if (c) return c;
    }
    return null;
  };

  // detect fields if not configured
  const imageField = config.coverField
    ? collection?.fields?.find((f: { name: string; interface?: string }) => f.name === config.coverField)
    : (collection?.fields?.find((f: { name: string; interface?: string }) => f.interface === 'attachment')
      || collection?.fields?.find((f: { name: string }) => /image|cover|avatar|photo|picture|icon/.test(f.name.toLowerCase())));

  // prefer "title" as the gallery card title, then name, then first input
  const titleField = config.titleField
    ? collection?.fields?.find((f: { name: string; interface?: string }) => f.name === config.titleField)
    : (collection?.fields?.find((f: { name: string }) => f.name === 'title')
      || collection?.fields?.find((f: { name: string }) => f.name === 'name')
      || collection?.fields?.find((f: { interface?: string }) => f.interface === 'input'));

  const visibleFieldNames = config.visibleFields || [];
  const visibleFields = collection?.fields?.filter((f: { name: string }) => visibleFieldNames.includes(f.name)) || [];

  const getTitle = (record: Record<string, any>) => {
    if (titleField && record[titleField.name] != null && record[titleField.name] !== '') {
      return String(record[titleField.name]);
    }
    return String(record.title ?? record.name ?? record.label ?? record.id ?? 'untitled');
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {onCreate && (
            <div className="flex items-center justify-center border border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/20" onClick={() => onCreate({})} aria-label="add item">
              <Plus className="h-6 w-6" />
            </div>
          )}
          <SortableContext items={orderedData.map((r: any) => r.id)} strategy={rectSortingStrategy}>
            {orderedData.map((record, i) => (
              <GalleryCard
                key={record.id || i}
                record={record}
                collection={collection}
                mediaAsset={getMediaAsset(record, imageField)}
                title={getTitle(record)}
                titleField={titleField}
                visibleFields={visibleFields}
                config={config}
                onUpdateRecord={onUpdateRecord}
                onDelete={onDelete}
                onConfigChange={onConfigChange}
                isTitleEditing={editingTitleRecordId === record.id}
                onTitleEditStart={() => setEditingTitleRecordId(record.id)}
                onTitleEditEnd={() => setEditingTitleRecordId(null)}
                onCardClick={() => {
                  if (singleClickTimer.current) clearTimeout(singleClickTimer.current);
                  singleClickTimer.current = setTimeout(() => setSelectedRecord(record), 200);
                }}
                onCardDoubleClick={() => {
                  if (singleClickTimer.current) {
                    clearTimeout(singleClickTimer.current);
                    singleClickTimer.current = null;
                  }
                  setViewConfigRecord(record);
                }}
              />
            ))}
          </SortableContext>
        </div>
        {data.length === 0 && <div className="col-span-full text-center p-10">no items found.</div>}
      </DndContext>

      {/* single-click: view and edit this entry's properties only (not view/card config) */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 bg-neutral-900 border border-border/50 shadow-2xl">
          {selectedRecord && (
            <RecordEditContent
              record={selectedRecord}
              collection={collection}
              onUpdate={onUpdateRecord}
              onDelete={(rec: any) => { onDelete?.(rec); setSelectedRecord(null); }}
              titleField={titleField}
              config={config}
              onConfigChange={onConfigChange}
              showViewConfig={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* double-click (not on title) or right-click: edit how this card looks (title field, 3 visible properties) */}
      <Dialog open={!!viewConfigRecord} onOpenChange={(open) => !open && setViewConfigRecord(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 bg-neutral-900 border border-border/50 shadow-2xl">
          {viewConfigRecord && (
            <RecordEditContent
              record={viewConfigRecord}
              collection={collection}
              onUpdate={onUpdateRecord}
              onDelete={(rec: any) => { onDelete?.(rec); setViewConfigRecord(null); }}
              titleField={titleField}
              config={config}
              onConfigChange={onConfigChange}
              showViewConfig={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function GalleryCard({
  record,
  collection,
  mediaAsset,
  title,
  titleField,
  visibleFields,
  config,
  onUpdateRecord,
  onDelete,
  onConfigChange,
  isTitleEditing,
  onTitleEditStart,
  onTitleEditEnd,
  onCardClick,
  onCardDoubleClick,
}: {
  record: any;
  collection: any;
  mediaAsset: { url: string; kind: 'image' | 'video' | 'pdf' } | null;
  title: string;
  titleField: any;
  visibleFields: any[];
  config: any;
  onUpdateRecord?: (id: string | number, data: any) => void;
  onDelete?: (rec: any) => void;
  onConfigChange?: (key: string, value: any) => void;
  isTitleEditing: boolean;
  onTitleEditStart: () => void;
  onTitleEditEnd: () => void;
  onCardClick: () => void;
  onCardDoubleClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const hasMedia = !!mediaAsset?.url;

  return (
    <RecordContextMenu
      record={record}
      collection={collection}
      onUpdate={onUpdateRecord}
      onDelete={onDelete}
      titleField={titleField}
      config={config}
      onConfigChange={onConfigChange}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "rounded-xl shadow-lg border-2 border-transparent p-0 relative hover:scale-[1.02] transition-all bg-card overflow-hidden flex flex-col group/card cursor-grab active:cursor-grabbing",
          isDragging && "z-50 shadow-2xl"
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-no-card-click]')) return;
          onCardClick();
        }}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-no-card-click]')) return;
          e.preventDefault();
          onCardDoubleClick();
        }}
      >
        <div className={cn("flex flex-col w-full rounded-[inherit] overflow-hidden", !hasMedia && "min-h-0")}> 
          {hasMedia ? (
            <>
              <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden rounded-t-[inherit]">
                {mediaAsset?.kind === 'pdf' ? (
                  <div className="h-full w-full flex items-center justify-center bg-white/5 text-white/80 font-semibold uppercase text-xs tracking-wide">
                    pdf preview
                  </div>
                ) : mediaAsset?.kind === 'video' ? (
                  <video
                    src={mediaAsset.url}
                    className="h-full w-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={mediaAsset?.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110 rounded-t-[inherit]"
                  />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center rounded-t-[inherit]">
                  <span className="text-white text-xs font-bold px-2 py-1 border border-primary bg-primary/20 rounded-full lowercase">
                    view details
                  </span>
                </div>
              </div>
              <CardContent className="p-3 bg-card/95 rounded-b-[inherit]" onClick={(e) => e.stopPropagation()}>
                <GalleryCardTitle
                  record={record}
                  title={title}
                  titleField={titleField}
                  isTitleEditing={isTitleEditing}
                  onTitleEditStart={onTitleEditStart}
                  onTitleEditEnd={onTitleEditEnd}
                  onUpdateRecord={onUpdateRecord}
                  collection={collection}
                  compact={false}
                />
                {visibleFields.length > 0 && (
                  <div className="mt-2 space-y-1 text-center">
                    {visibleFields.slice(0, 3).map((f: { name: string; uiSchema?: { title?: string } }) => (
                      <div key={f.name} className="text-xs text-muted-foreground truncate flex flex-col items-center gap-0.5">
                        <span className="opacity-50 lowercase text-[10px]">{f.uiSchema?.title || f.name}:</span>
                        <div className="w-full">
                          <SmartField
                            value={record[f.name]}
                            field={f}
                            record={record}
                            size="sm"
                            onChange={(val) => onUpdateRecord?.(record.id, { [f.name]: val })}
                            collectionName={collection.name}
                            className="h-auto p-0 border-none bg-transparent hover:bg-muted/50 rounded px-1 text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="p-2 bg-card/95 rounded-[inherit] flex flex-col gap-1 min-w-0">
              <GalleryCardTitle
                record={record}
                title={title}
                titleField={titleField}
                isTitleEditing={isTitleEditing}
                onTitleEditStart={onTitleEditStart}
                onTitleEditEnd={onTitleEditEnd}
                onUpdateRecord={onUpdateRecord}
                collection={collection}
                compact
              />
              {visibleFields.length > 0 && (
                <div className="space-y-0.5">
                  {visibleFields.slice(0, 3).map((f: { name: string; uiSchema?: { title?: string } }) => (
                    <div key={f.name} className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                      <span className="opacity-50 lowercase shrink-0">{f.uiSchema?.title || f.name}:</span>
                      <div className="min-w-0 flex-1">
                        <SmartField
                          value={record[f.name]}
                          field={f}
                          record={record}
                          size="sm"
                          onChange={(val) => onUpdateRecord?.(record.id, { [f.name]: val })}
                          collectionName={collection.name}
                          className="h-auto p-0 border-none bg-transparent hover:bg-muted/50 rounded px-0.5 text-left text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </div>
      </div>
    </RecordContextMenu>
  );
}

function GalleryCardTitle({
  record,
  title,
  titleField,
  isTitleEditing,
  onTitleEditStart,
  onTitleEditEnd,
  onUpdateRecord,
  collection,
  compact = false,
}: {
  record: any;
  title: string;
  titleField: any;
  isTitleEditing: boolean;
  onTitleEditStart: () => void;
  onTitleEditEnd: () => void;
  onUpdateRecord?: (id: string | number, data: any) => void;
  collection: any;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("font-black mb-1 text-center", compact ? "text-sm" : "text-xl")}
      onDoubleClick={(e) => { e.stopPropagation(); onTitleEditStart(); }}
      data-no-card-click
      title="double-click to edit"
    >
      {titleField ? (
        isTitleEditing ? (
          <div onBlur={onTitleEditEnd}>
            <SmartField
              value={record[titleField.name]}
              field={titleField}
              record={record}
              collectionName={collection.name}
              size="sm"
              onChange={(val) => {
                onUpdateRecord?.(record.id, { [titleField.name]: val });
              }}
              className="h-auto p-0 border border-input rounded px-1 w-full font-bold text-center bg-background"
            />
          </div>
        ) : (
          <span className="px-1 truncate block cursor-text" title="double-click to edit">
            {title}
          </span>
        )
      ) : (
        <span className="px-1 truncate block">{title}</span>
      )}
    </div>
  );
}
