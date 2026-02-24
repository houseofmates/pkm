import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Collection } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Plus, Settings2, Trash2, Edit2 } from 'lucide-react';
import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { SmartField } from '@/components/fields/smart-field';
import { RecordContextMenu } from './record-context-menu';
import { useAppSetting } from '@/hooks/use-app-setting';
import { PropertyContextMenu } from './property-context-menu';
import { toast } from 'sonner';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FieldSettingsDialog } from '@/features/collections/components/field-settings-dialog';

interface RecordTableProps {
  data: any[];
  collection: Collection;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onUpdateRecord?: (id: string | number, data: any) => void;
  onCreateRecord?: () => void;
  onCreateField?: () => void;
  onFieldUpdated?: () => void; // optional callback when a field/column is renamed or changed
  loading?: boolean;
  config?: any;
}

import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensors,
  useSensor,
  closestCenter,
  useDraggable
} from '@dnd-kit/core';
import type {
  DragEndEvent
} from '@dnd-kit/core';

import { cn } from '@/lib/utils';

// Sortable Header Component
function SortableHeader({ header, collectionName, onFieldUpdated, onOpenFieldSettings }: any) {
  const { client } = useAuth();
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState<string>('');

  const field = (header.column.columnDef as any).meta?.field;
  const isSystemColumn = !field;

  // helper to compute the current title from the column definition itself
  const computeTitle = () => {
    const h = header.column.columnDef.header;
    if (typeof h === 'string') return h;
    if (h == null) return '';
    return String(h);
  };

  // whenever editing is enabled, refresh draftTitle from header metadata
  const startEditing = () => {
    if (isSystemColumn) return;
    setDraftTitle(computeTitle());
    setIsEditing(true);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : undefined,
    position: 'relative' as const,
    touchAction: 'none',
  };

  const saveTitle = async (newTitle: string | undefined) => {
    if (!field) return;
    const trimmed = (newTitle || '').trim();
    // prevent empty names
    if (!trimmed) {
      // restore previous title and exit
      setDraftTitle(computeTitle());
      setIsEditing(false);
      toast.error('title cannot be empty');
      return;
    }
    try {
      await client.updateField(collectionName, field.name, {
        uiSchema: {
          ...field.uiSchema,
          title: trimmed,
        },
      });
      // update in-memory metadata so header updates immediately
      field.uiSchema = { ...(field.uiSchema || {}), title: trimmed };
      header.column.columnDef.header = trimmed; // keep case
      setDraftTitle(trimmed);
      setIsEditing(false);
      onFieldUpdated?.();
      toast.success('field renamed');
    } catch (err: any) {
      console.error(err);
      toast.error('failed to rename field');
    }
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={{
        ...style,
          width: header.getSize() || DEFAULT_COL_WIDTH,
        minWidth: header.getSize() || DEFAULT_COL_WIDTH,
        maxWidth: header.getSize() || DEFAULT_COL_WIDTH,
        paddingLeft: 8,
        paddingRight: 8,
        background: 'transparent',
      }}
      className={cn(
        "group select-none relative text-left p-0 transition-colors border-r border-[#222] border-b border-b-[#222]",
        isDragging ? "bg-gray-800/40" : "hover:bg-gray-800/20"
      )}
    >
      <PropertyContextMenu
        field={field}
        onRename={() => {
          if (isSystemColumn) return;
          setDraftTitle(computeTitle());
          setIsEditing(true);
        }}
        onEditSettings={() => {
          if (isSystemColumn) return;
          onOpenFieldSettings?.(field);
        }}
        onHide={() => {
          toast.info("hiding feature coming soon");
        }}
        onDelete={() => {
          toast.info("deletion feature coming soon");
        }}
      >
        <div
          className={cn(
            "min-h-[40px] w-full relative flex items-center group/header",
            !isEditing && "cursor-grab"
          )}
          {...(!isEditing ? attributes : {})}
          {...(!isEditing ? listeners : {})}
        >
          {!isEditing ? (
            <div
              className="relative z-20 h-full w-full flex items-center px-0.5 select-none cursor-pointer hover:bg-white/5 transition-colors py-2"
              onClick={() => {
                if (!isSystemColumn) {
                  onOpenFieldSettings?.(field);
                }
              }}
              onDoubleClick={startEditing}
            >
              <div
                className="whitespace-normal font-medium leading-[1.2] text-sm"
                style={{ wordBreak: 'break-word', minWidth: 0 }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center px-0.5 bg-black/40">
              <Input
                autoFocus
                value={draftTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftTitle(e.target.value)}
                onBlur={() => saveTitle(draftTitle)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') saveTitle(draftTitle);
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="h-7 text-sm bg-[#111] border-[#333] focus:border-primary text-white w-full rounded-none"
              />
            </div>
          )}
        </div>
      </PropertyContextMenu>
      {/* resize handler */}
      <div
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute -right-2 top-0 h-full w-4 z-30 cursor-col-resize touch-none select-none transition-opacity",
          header.column.getIsResizing() ? "opacity-100 bg-[#333] shadow-[0_4000px_0_0_currentColor]" : "opacity-20 hover:opacity-100"
        )}
        style={{ color: '#333' }}
      />
    </TableHead>
  );
}

const DraggableRecordRow = (props: any) => {
  const { index, style: incomingStyle } = props;
  const data = props.data || props;
  const { rows, collection, onUpdate, onDelete, onCreateField, onCreateRecord, recordMeta } = data;

  const row = rows[index];
  if (!row) return null;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `record-${row.original.id}`,
    data: {
      type: 'pkm-record',
      id: row.original.id,
      collection: collection.name,
      title: row.original.title || row.original.name || 'Untitled'
    }
  });

  const rowColor = recordMeta?.[row.original.id]?.color;

  const style = {
    ...incomingStyle,
    transform: [incomingStyle?.transform, CSS.Translate.toString(transform)].filter(Boolean).join(' '),
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none', // Important for touch drag
    backgroundColor: rowColor ? `${rowColor}20` : undefined,
    display: 'flex', // Crucial for virtualization
    width: '100%'
  };

  return (
    <RecordContextMenu
      record={row.original}
      collection={collection}
      onUpdate={onUpdate}
      onDelete={onDelete}
      className="contents"
    >
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-colors group border-b border-r border-[#222] min-w-full",
          !rowColor && "hover:bg-gray-800/10"
        )}
      >
        {/* drag handle area */}
        {onCreateField && (
          <div
            className="w-10 border-r border-[#222] p-0 h-10 transition-colors relative flex-shrink-0"
          >
            <div
              className="absolute inset-0 cursor-move flex items-center justify-center group-hover:bg-white/5"
              {...attributes}
              {...listeners}
            >
              <div className="p-2 opacity-0 group-hover:opacity-60 transition-opacity">
                <div className="w-1 h-3 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        )}


        {row.getVisibleCells().map((cell: any) => {
          return (
            <div
              key={cell.id}
              style={{
                width: cell.column.getSize() || DEFAULT_COL_WIDTH,
                minWidth: cell.column.getSize() || DEFAULT_COL_WIDTH,
                maxWidth: cell.column.getSize() || DEFAULT_COL_WIDTH
              }}
              className="border-r border-[#222] align-middle p-0 h-10 transition-colors group-hover:bg-white/5 flex-shrink-0"
              onContextMenu={(e) => {
                e.stopPropagation();
              }}
            >
              <div
                className="flex items-center justify-start h-full w-full px-0.5 whitespace-normal leading-[1.2] text-sm"
                style={{ wordBreak: 'break-word', minWidth: 0 }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            </div>
          );
        })}
        
      </div>
    </RecordContextMenu>
  );
};

const DEFAULT_COL_WIDTH = 150;

export function RecordTable({ data, collection, onEdit, onDelete, onUpdateRecord, onCreateField, onCreateRecord, onFieldUpdated: onFieldUpdatedCb, loading }: RecordTableProps) {
  const [hiddenColumns, setHiddenColumns] = useAppSetting<string[]>(
    `hidden_columns_${collection?.name || 'unknown'}`,
    []
  );

  const [settingsField, setSettingsField] = React.useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const [recordMeta] = useAppSetting<Record<string, any>>(`record_meta_${collection?.name || 'unknown'}`, {});
  const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {});

  const columnSizing = metadata[collection?.name]?.columnWidths || {};
  const columnOrder = metadata[collection?.name]?.columnOrder || [];

  const setColumnOrder = (newOrder: string[]) => {
    setMetadata({
      ...metadata,
      [collection.name]: {
        ...metadata[collection.name],
        columnOrder: newOrder
      }
    });
  };

  const setColumnSizing = (updater: any) => {
    const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
    setMetadata({
      ...metadata,
      [collection.name]: {
        ...metadata[collection.name],
        columnWidths: newSizing
      }
    });
  };

  if (!collection) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600"></div>
          <p className="text-sm">loading collection...</p>
        </div>
      </div>
    );
  }
  const columnHelper = createColumnHelper<any>();

  const columns = React.useMemo(() => {
    let cols: any[] = [];
    
    console.log('[RecordTable] Collection:', collection.name);
    console.log('[RecordTable] Fields:', collection.fields);
    console.log('[RecordTable] Hidden columns:', hiddenColumns);
    
    if (collection.fields && collection.fields.length > 0) {
      const visibleFields = (collection.fields || [])
        .filter((f: any) => !f.hidden)
        .filter((f: any) => f.name && !hiddenColumns.includes(f.name));
      
      console.log('[RecordTable] Visible fields after filtering:', visibleFields);
      
      cols = visibleFields.map((field: any) => columnHelper.accessor(field.name, {
          header: (field.uiSchema?.title || field.name),
          meta: { field },
          cell: info => (
            <SmartField
              value={info.getValue()}
              field={field}
              record={info.row.original}
              collectionName={collection.name}
              size="lg"
              onChange={(val) => {
                if (onUpdateRecord) {
                  onUpdateRecord(info.row.original.id, { [field.name]: val });
                }
              }}
            />
          )
        }));
    }
    
    console.log('[RecordTable] Columns created:', cols.length);
    
    // fallback: if no collection fields are defined but we have data, infer columns from the first row
    if (cols.length === 0 && data.length > 0) {
      cols = Object.keys(data[0])
        .filter(key => !hiddenColumns.includes(key))
        .map((key) =>
          columnHelper.accessor(key, {
            header: key,
            meta: { field: { name: key, type: 'string', uiSchema: { title: key } } },
            cell: info => (
              <SmartField
                value={info.getValue()}
                field={{ type: 'string', name: key }}
                record={info.row.original}
                collectionName={collection.name}
                size="lg"
                onChange={(val) => {
                  if (onUpdateRecord) {
                    onUpdateRecord(info.row.original.id, { [key]: val });
                  }
                }}
              />
            )
          })
        );
    }

    // if there are no defined columns (collection has no fields and there
    // is no data to infer from) we still want to render something so the
    // header area doesn't collapse to zero width, which makes the add-field
    // button and settings gear inaccessible.  create a dummy placeholder
    // column with a message.
    if (cols.length === 0) {
      cols = [
        columnHelper.display({
          id: '__placeholder',
          header: () => (
            <div className="px-2 py-1 text-xs text-muted-foreground lowercase">
              no properties defined – use the + button to add one
            </div>
          ),
          cell: () => null,
        }),
      ];
    }

    if (onEdit || onDelete) {
      cols.push(columnHelper.display({
        id: 'actions',
        header: () => (
          <div
            className="flex items-center justify-center h-full"
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm leading-none border-b pb-2 mb-2 lowercase">view settings</h4>
                  <div className="text-xs text-muted-foreground mb-2 lowercase">check to unhide properties</div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {(() => {
                    // figure out which fields to show in the settings menu.  if we
                    // have collection definitions use them, otherwise fall back to
                    // the first row of data.  when both are empty we render a
                    // helpful message below instead of mapping over an empty list.
                    const availableFields: any[] =
                      collection.fields && collection.fields.length > 0
                        ? collection.fields
                        : data.length > 0
                        ? Object.keys(data[0])
                        : [];
                    if (availableFields.length === 0) {
                      return (
                        <div className="text-xs text-muted-foreground lowercase">
                          no properties yet – use the + button to add one
                        </div>
                      );
                    }

                    return availableFields.map((f: any) => {
                      const fieldName = f.name || f;
                      const isHidden = hiddenColumns.includes(fieldName);
                      return (
                        <div key={fieldName} className="flex items-center space-x-2">
                          <Checkbox
                            id={`col-${fieldName}`}
                            checked={!isHidden}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setHiddenColumns(prev => prev.filter(c => c !== fieldName));
                              } else {
                                setHiddenColumns(prev => [...prev, fieldName]);
                              }
                            }}
                          />
                          <Label htmlFor={`col-${fieldName}`} className="text-xs">{f.uiSchema?.title || fieldName}</Label>
                        </div>
                      )
                    });
                  })()}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ),
        cell: (props) => (
          <div className="flex items-center justify-center gap-1 h-7">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(props.row.original); }}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(props.row.original); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      }));
    }

    return cols;
  }, [data, collection, columnHelper, onEdit, onDelete, hiddenColumns, setHiddenColumns]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const headerGroups = table.getHeaderGroups();
      const headers = headerGroups[0].headers;
      const oldIndex = headers.findIndex((h) => h.id === active.id);
      const newIndex = headers.findIndex((h) => h.id === over?.id);

      const newOrder = arrayMove(headers.map(h => h.id), oldIndex, newIndex);
      table.setColumnOrder(newOrder);
      setColumnOrder(newOrder);
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
    state: {
      columnSizing,
      columnOrder,
    },
  });

  if (loading) {
    return (
      <div className="rounded-md border border-[#222] p-4 space-y-2">
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-8 w-1/4" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div
      className="record-table-root h-full flex flex-col rounded-md border border-[#222] overflow-hidden no-scrollbar relative bg-[#0b0b0b]"
      style={{
        borderColor: '#222',
        borderWidth: '1px',
        background: '#0b0b0b'
      }}
    >

      <style dangerouslySetInnerHTML={{
        __html: `
        .record-table-root * {
          border-color: #222 !important;
        }
        .record-table-root th, 
        .record-table-root td {
          border-bottom: 1px solid #222 !important;
          border-right: 1px solid #222 !important;
        }
        .record-table-root tr {
          border-bottom: 1px solid #222 !important;
        }
        .record-table-root .hover\\:bg-white\\/10:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-hidden no-scrollbar flex-shrink-0">
            {/* use full width when there are no columns so the header row
                remains visible and the add/gear buttons are clickable */}
            <Table
              style={{
                width: table.getTotalSize() || '100%',
                tableLayout: 'fixed'
              }}
            >
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-[#222]">
                    {onCreateField && (
                      <TableHead className="w-10 border-r border-[#222] border-b border-b-[#222] p-0 overflow-hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-full w-full rounded-none opacity-50 hover:opacity-100 hover:bg-white/10 flex items-center justify-center p-0"
                          onClick={(e) => { e.stopPropagation(); onCreateField(); }}
                          onDoubleClick={(e) => { e.stopPropagation(); }}
                          title="add new property"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableHead>
                    )}
                    <SortableContext
                      items={headerGroup.headers.map(h => h.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {headerGroup.headers.map((header) => (
                        <SortableHeader
                          key={header.id}
                          header={header}
                          collectionName={collection?.name}
                          onFieldUpdated={onFieldUpdatedCb}
                          onOpenFieldSettings={(field: any) => {
                            setSettingsField(field);
                            setIsSettingsOpen(true);
                          }}
                        />
                      ))}
                    </SortableContext>
                  </TableRow>
                ))}
              </TableHeader>
            </Table>
          </div>

          <div className="flex-1 w-full relative overflow-x-auto no-scrollbar bg-[#0b0b0b] min-h-0" style={{ minHeight: 200 }}>
            <div style={{ width: table.getTotalSize(), height: '100%', position: 'relative' }}>
              {rows.length === 0 ? (
                <div className="text-muted-foreground lowercase">
                  <div className="flex items-center justify-center h-16 w-full">
                    no records found
                  </div>
                  {onCreateRecord && (
                    <div className="flex items-start pl-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-50 hover:opacity-100"
                        onClick={onCreateRecord}
                        title="create new record"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
              <AutoSizer
                  renderProp={({ height, width }: { height: number | undefined; width: number | undefined }) => (
                      <List
                        rowCount={rows.length}
                        rowHeight={40}
                        rowProps={{
                          rows: rows,
                          collection,
                          onUpdate: onUpdateRecord,
                          onDelete,
                          onCreateField,
                          onCreateRecord,
                          recordMeta
                        }}
                        style={{ height, width }}
                        rowComponent={DraggableRecordRow}
                      />
                  )}
                />
              )}
            </div>
          </div>

          {/* add new record button — always visible below rows */}
          {onCreateRecord && (
            <div className="flex-shrink-0 border-t border-[#222]">
              <Button
                variant="ghost"
                className="h-9 w-full rounded-none opacity-50 hover:opacity-100 hover:bg-white/10 flex items-center justify-start gap-2 px-3 transition-opacity"
                onClick={onCreateRecord}
                title="create new record"
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs text-muted-foreground lowercase">new record</span>
              </Button>
            </div>
          )}
        </div>
      </DndContext>

      <FieldSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        field={settingsField}
        collectionName={collection.name}
        onFieldUpdated={() => {
          onFieldUpdatedCb?.();
        }}
      />
    </div>
  );
}
