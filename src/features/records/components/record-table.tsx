import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Collection } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Plus, Settings2, Trash2, Edit2 } from 'lucide-react';
import * as React from 'react';
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
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable
} from '@dnd-kit/core';
import type {
  DragEndEvent
} from '@dnd-kit/core';

import { cn } from '@/lib/utils';

// Sortable Header Component
function SortableHeader({ header, setSettingsField, setIsSettingsOpen }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : undefined,
    position: 'relative' as const,
  };

  const triggerSettings = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const field = (header.column.columnDef as any).meta?.field;
    if (field) {
      setSettingsField(field);
      setIsSettingsOpen(true);
    }
  };


  return (
    <TableHead
      ref={setNodeRef}
      style={{
        ...style,
        width: header.getSize(),
        minWidth: header.getSize(),
        maxWidth: header.getSize(),
        paddingLeft: 8,
        paddingRight: 8,
        background: 'transparent',
      }}
      className={cn(
        "group select-none relative text-left p-0 h-9 transition-colors border-r border-[#222] border-b border-b-[#222]",
        isDragging ? "bg-gray-800/40" : "hover:bg-gray-800/20"
      )}
    >
      <PropertyContextMenu
        field={(header.column.columnDef as any).meta?.field}
        onRename={() => triggerSettings()}
        onEditSettings={() => triggerSettings()}
        onHide={() => {
          // logic to hide field
          toast.info("hiding feature coming soon");
        }}
        onDelete={() => {
          // logic to delete field
          toast.info("deletion feature coming soon");
        }}
      >
        <div className="h-full w-full relative flex items-center group/header overflow-hidden">
          {/* foreground label - draggable when held, clickable for settings */}
          <div
            className="relative z-20 h-full w-full flex items-center px-1 select-none cursor-pointer hover:bg-white/5 transition-colors pointer-events-auto"
            onClick={triggerSettings}
            onDoubleClick={triggerSettings}
          // Removed aggressive Capture phase blocks to allow sensors to see the "hold"
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap font-medium pr-5">
              {header.isPlaceholder
                ? null
                : flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
            </div>
          </div>

          {/* drag handle area - attributes/listeners here for held drag */}
          <div
            className="absolute inset-0 z-10"
            {...attributes}
            {...listeners}
          />
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

function DraggableRecordRow({ row, collection, onUpdate, onDelete, onCreateField, recordMeta, setSettingsField, setIsSettingsOpen }: any) {
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
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none', // Important for touch drag
    backgroundColor: rowColor ? `${rowColor}20` : undefined
  };

  return (
    <RecordContextMenu
      record={row.original}
      collection={collection}
      onUpdate={onUpdate}
      onDelete={onDelete}
      className="contents"
    >
      <TableRow
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-colors group border-b border-[#222]",
          !rowColor && "hover:bg-gray-800/10"
        )}
      >
        {/* drag handle area */}
        {onCreateField && (
          <TableCell
            className="w-10 border-r border-[#222] border-b border-b-[#222] p-0 h-10 transition-colors relative"
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
          </TableCell>
        )}
        {row.getVisibleCells().map((cell: any) => {
          return (
            <TableCell
              key={cell.id}
              style={{
                width: cell.column.getSize(),
                minWidth: cell.column.getSize(),
                maxWidth: cell.column.getSize()
              }}
              className="border-r border-b border-[#222] overflow-hidden text-ellipsis whitespace-nowrap align-middle p-0 h-10 transition-colors group-hover:bg-white/5"
            >
              <div className="flex items-center justify-start h-full w-full px-2">
                <div className="flex-1 truncate">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </div>
            </TableCell>
          );
        })}

      </TableRow>
    </RecordContextMenu>
  );
}

export function RecordTable({ data, collection, onEdit, onDelete, onUpdateRecord, onCreateField, loading }: RecordTableProps) {
  // hidden columns state persistence
  const [hiddenColumns, setHiddenColumns] = useAppSetting<string[]>(
    `hidden_columns_${collection?.name || 'unknown'}`,
    [] // Default visible
  );

  const [settingsField, setSettingsField] = React.useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);



  // record meta for colors
  const [recordMeta] = useAppSetting<Record<string, any>>(`record_meta_${collection?.name || 'unknown'}`, {});

  // get collection color from metadata (source of truth)
  const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {});

  // column sizing state (stored in metadata)
  const columnSizing = metadata[collection?.name]?.columnWidths || {};

  // column ordering state
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

  // dynamically generate columns based on collection fields or data keys
  const columns = React.useMemo(() => {
    let cols: any[] = [];

    // if collection has fields definition, use that
    if (collection.fields && collection.fields.length > 0) {
      cols = (collection.fields || [])
        .filter((f: any) => !f.hidden) // Filter out system hidden fields
        .filter((f: any) => !hiddenColumns.includes(f.name)) // Filter out user hidden fields
        .map((field: any) => columnHelper.accessor(field.name, {
          header: (field.uiSchema?.title || field.name).toLowerCase(),
          meta: { field }, // added for header access
          cell: info => (
            <SmartField
              value={info.getValue()}
              field={field}
              record={info.row.original}
              collectionName={collection.name} // Pass collection name
              size="lg"
              onChange={(val) => {
                // call update callback
                if (onUpdateRecord) {
                  onUpdateRecord(info.row.original.id, { [field.name]: val });
                }
              }}
            />
          )
        }));
    } else if (data.length > 0) {
      // fallback: infer (use string field for now)
      cols = Object.keys(data[0])
        .filter(key => !hiddenColumns.includes(key)) // Filter user hidden
        .map((key) =>
          columnHelper.accessor(key, {
            header: key.toLowerCase(),
            meta: { field: { name: key, type: 'string', uiSchema: { title: key } } },
            cell: info => (
              <SmartField
                value={info.getValue()}
                field={{ type: 'string', name: key }}
                record={info.row.original}
                collectionName={collection.name} // Pass collection name
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

    if (onEdit || onDelete) {
      cols.push(columnHelper.display({
        id: 'actions',
        // ... (rest of actions column)
        header: () => (
          <div className="flex items-center justify-center h-full">
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
                    {/* list all potential fields to allow unhiding */}
                    {(collection.fields || Object.keys(data[0] || {})).map((f: any) => {
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
                    })}
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 200, // drag-on-hold
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
    onColumnOrderChange: () => {
      // we also persist it in handleDragEnd for robustness
    },
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

  // get column count for add-row cell span
  const columnCount = table.getHeaderGroups()[0]?.headers.length || 1;


  return (
    <div
      className="record-table-root rounded-md border border-[#222] overflow-hidden no-scrollbar relative bg-[#0b0b0b]"
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
      <div className="overflow-x-auto overflow-y-hidden no-scrollbar">
        <Table style={{ width: table.getTotalSize(), tableLayout: 'fixed' }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-[#222]">
                {/* add field button at the start */}
                {onCreateField && (
                  <TableHead className="w-10 border-r border-[#222] border-b border-b-[#222] p-0 overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-full w-full rounded-none opacity-50 hover:opacity-100 hover:bg-white/10 flex items-center justify-center p-0"
                      onClick={onCreateField}
                      title="add new property"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableHead>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={headerGroup.headers.map(h => h.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <SortableHeader
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount + (onCreateField ? 1 : 0)} className="text-center text-muted-foreground h-16">
                  no records found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <DraggableRecordRow
                  key={row.id}
                  row={row}
                  collection={collection}
                  onUpdate={onUpdateRecord}
                  onDelete={onDelete}
                  onCreateField={onCreateField}
                  recordMeta={recordMeta}
                  setSettingsField={setSettingsField}
                  setIsSettingsOpen={setIsSettingsOpen}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <FieldSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        field={settingsField}
        collectionName={collection.name}
        onFieldUpdated={() => { }}
      />
    </div>
  );
}
