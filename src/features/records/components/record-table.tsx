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

// draggable row wrapper
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { cn } from '@/lib/utils';

function DraggableRecordRow({ row, collection, onUpdate, onDelete, onCreateField, recordMeta }: any) {
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
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing border-b border-border/50 transition-colors",
          !rowColor && "hover:bg-muted/50"
        )}
      >
        {/* empty cell to match the add-field column */}
        {onCreateField && <TableCell className="w-10 border-r border-border/50" />}
        {row.getVisibleCells().map((cell: any) => (
          <TableCell
            key={cell.id}
            style={{
              width: cell.column.getSize(),
              minWidth: cell.column.getSize(),
              maxWidth: cell.column.getSize()
            }}
            className="border-r border-border/50 overflow-hidden text-ellipsis whitespace-nowrap align-middle p-1 h-8"
          >
            <div className="flex items-center justify-start h-full w-full px-1">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </TableCell>
        ))}
      </TableRow>
    </RecordContextMenu>
  );
}

export function RecordTable({ data, collection, onEdit, onDelete, onUpdateRecord, onCreateRecord, onCreateField, loading }: RecordTableProps) {
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
  const collectionColor = metadata[collection?.name]?.color || 'hsl(var(--border))';

  // column sizing state (stored in metadata)
  const columnSizing = metadata[collection?.name]?.columnWidths || {};

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                          <Label htmlFor={`col-${fieldName}`} className="text-xs lowercase">{f.uiSchema?.title || fieldName}</Label>
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

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
    state: {
      columnSizing,
    },
  });

  if (loading) {
    return (
      <div className="rounded-md border p-4 space-y-2">
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
      className="rounded-md border overflow-hidden no-scrollbar relative"
      style={{
        borderColor: collectionColor,
        borderWidth: '1px'
      }}
    >
      <div className="overflow-x-auto overflow-y-hidden no-scrollbar">
        <Table style={{ width: table.getTotalSize(), tableLayout: 'fixed' }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {/* add field button at the start */}
                {onCreateField && (
                  <TableHead className="w-10 border-r border-border/50 p-0 overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-full w-full rounded-none opacity-50 hover:opacity-100 hover:bg-primary/10 flex items-center justify-center"
                      onClick={onCreateField}
                      title="add new property"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      maxWidth: header.getSize()
                    }}
                    className="border-r border-border/50 group select-none relative text-left p-1 h-9"
                  >
                    <div
                      className="overflow-hidden text-ellipsis whitespace-nowrap flex justify-start items-center w-full px-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => {
                        const field = (header.column.columnDef as any).meta?.field;
                        if (field) {
                          setSettingsField(field);
                          setIsSettingsOpen(true);
                        }
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </div>
                    {/* resize handler */}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      // increased touch target width for mobile (w-4 instead of w-px)
                      className={`absolute -right-2 top-0 h-full w-4 z-20 cursor-col-resize touch-none select-none lg:hover:bg-primary lg:hover:opacity-10 transition-opacity ${header.column.getIsResizing() ? 'opacity-100 bg-primary shadow-[0_4000px_0_0_currentColor]' : 'opacity-0'
                        }`}
                      // ensure color is always set for shadow usage
                      style={{ color: 'var(--primary)' }}
                    />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <DraggableRecordRow
                key={row.id}
                row={row}
                collection={collection}
                onUpdate={onUpdateRecord}
                onDelete={onDelete}
                onCreateField={onCreateField}
                recordMeta={recordMeta}
              />
            ))}
            {/* add row button at the bottom - border-t ensures separation from last row, no border-b to avoid container overlap */}
            <TableRow className="hover:bg-transparent !border-b-0 ring-0 h-10">
              <TableCell colSpan={columnCount + (onCreateField ? 1 : 0)} className="p-0 border-t border-border/50 !border-b-0">
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-none h-10 text-muted-foreground hover:text-foreground !border-none"
                  onClick={onCreateRecord}
                >
                  <Plus className="mr-2 h-4 w-4" /> add row
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <FieldSettingsDialog
        collectionName={collection.name}
        field={settingsField}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onFieldUpdated={() => {
          // refresh logic handled via query invalidation usually, 
          // but here we might need to trigger a collection re-fetch.
          // since collection-detail.tsx uses useCollections, it should update.
          window.location.reload(); // simple brute force refresh for metadata update
        }}
      />
    </div>
  );
}