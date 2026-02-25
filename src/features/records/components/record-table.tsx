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
import { Plus, Settings2, Trash2, Edit2, MoreVertical, MoveRight, X } from 'lucide-react';
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
import { useGestureManager } from '@/hooks/use-gesture-manager';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
function SortableHeader({ header, collectionName, onFieldUpdated, onOpenFieldSettings, fieldColors, valueColorRules, setMetadata, onHide }: any) {
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
          // call provided handler (from RecordTable) to toggle hidden columns
          try {
            onHide?.(field);
          } catch (e) {
            console.error('onHide handler failed', e);
            toast.error('failed to hide property');
          }
        }}
        onDelete={async () => {
          if (isSystemColumn) return;
          const confirmed = window.confirm(`Delete property "${field?.uiSchema?.title || field?.name}"? This cannot be undone.`);
          if (!confirmed) return;
          try {
            await client.deleteField(collectionName, field.name);
            toast.success('property deleted');
            // clear sizing/order cache so removed column doesn't linger
            onFieldUpdated?.();
          } catch (err: any) {
            console.error(err);
            toast.error(err?.message || 'failed to delete property');
          }
        }}
        fieldColor={fieldColors[field?.name]}
        onSetFieldColor={(color) => {
          setMetadata((prev: Record<string, any>) => ({
            ...prev,
            [collectionName]: {
              ...(prev[collectionName] || {}),
              fieldColors: {
                ...(prev[collectionName]?.fieldColors || {}),
                [field.name]: color,
              },
              valueColorRules: {
                ...(prev[collectionName]?.valueColorRules || {}),
                [field.name]: valueColorRules?.[field.name] || {},
              },
            }
          }));
        }}
        valueColorRules={valueColorRules[field?.name] || {}}
        onSetValueColor={(val, color) => {
          setMetadata((prev: Record<string, any>) => {
            const existingRules = (prev[collectionName]?.valueColorRules?.[field.name]) || {};
            const updatedRules = { ...existingRules } as Record<string, string>;
            if (!color) {
              delete updatedRules[val];
            } else {
              updatedRules[val] = color;
            }
            return {
              ...prev,
              [collectionName]: {
                ...(prev[collectionName] || {}),
                valueColorRules: {
                  ...(prev[collectionName]?.valueColorRules || {}),
                  [field.name]: updatedRules,
                }
              }
            };
          });
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
                style={{ wordBreak: 'break-word', minWidth: 0, color: fieldColors[field?.name] || undefined }}
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
  const { rows, collection, onUpdate, onDelete, onCreateField, recordMeta, onEdit, selectedIds, onRowSelect, clearSelection, enableSelection, tableSize, columnVersion } = data;

  const row = rows[index];
  if (!row) return null;

  const rowRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);

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
  const isSelected = selectedIds?.includes(row.original.id);

  const style = {
    ...incomingStyle,
    transform: [incomingStyle?.transform, CSS.Translate.toString(transform)].filter(Boolean).join(' '),
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
    backgroundColor: isSelected ? '#1f2937' : (rowColor ? `${rowColor}20` : undefined),
    display: 'flex',
    width: '100%',
    minWidth: '100%'
  };

  isDraggingRef.current = isDragging;

  useGestureManager(rowRef, {
    onSingleTap: (event) => {
      event.stopPropagation();
      rowRef.current?.focus({ preventScroll: true });
    },
    onDoubleTap: (event) => {
      event.stopPropagation();
      onEdit?.(row.original);
    },
    onLongPress: (event) => {
      event.stopPropagation();
      if (!rowRef.current || isDraggingRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? rect.left + 10;
      const clientY = event.clientY ?? rect.top + 10;
      const cmEvent = new MouseEvent('contextmenu', { bubbles: true, clientX, clientY, cancelable: true });
      rowRef.current.dispatchEvent(cmEvent);
    },
  });

  return (
    <RecordContextMenu
      record={row.original}
      collection={collection}
      onUpdate={onUpdate}
      onDelete={onDelete}
      className="contents"
    >
      <div
        key={columnVersion}
        ref={(node) => {
          rowRef.current = node;
          setNodeRef(node);
        }}
        style={style}
        className={cn(
          "transition-colors group border-b border-[#222]",
          isSelected ? "ring-1 ring-primary/70 bg-gray-900/50" : (!rowColor && "hover:bg-gray-800/10")
        )}
        tabIndex={-1}
        onClick={(e) => {
          if (!enableSelection) return;
          const target = e.target as HTMLElement;
          const inCellContent = target.closest('[data-cell-content]');
          if (!inCellContent) {
            if (isSelected && selectedIds?.length === 1 && clearSelection) {
              clearSelection();
              return;
            }
            if (onRowSelect) {
              onRowSelect(row.original.id, index, e);
            }
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit?.(row.original);
        }}
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
              style={{ touchAction: 'none' }}
            >
              <div className="p-2 opacity-0 group-hover:opacity-60 transition-opacity">
                <div className="w-1 h-3 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        )}


        {row.getVisibleCells().map((cell: any, cellIdx: number, cellArr: any[]) => {
          const isLastCell = cellIdx === cellArr.length - 1;
          return (
            <div
              key={cell.id}
              className={cn(
                "align-middle p-0 h-10 transition-colors group-hover:bg-white/5 flex-shrink-0",
                !isLastCell && "border-r border-[#222]"
              )}
              style={{
                width: cell.column.getSize() || DEFAULT_COL_WIDTH,
                minWidth: cell.column.getSize() || DEFAULT_COL_WIDTH,
                maxWidth: cell.column.getSize() || DEFAULT_COL_WIDTH,
                touchAction: 'manipulation',
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
              }}
            >
              <div
                className="flex items-center justify-start h-full w-full px-0.5 whitespace-normal leading-[1.2] text-sm"
                style={{ wordBreak: 'break-word', minWidth: 0 }}
                data-cell-content
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
const EMPTY_SIZING: Record<string, number> = {};
const EMPTY_ORDER: string[] = [];

const getValueColor = (
  rules: Record<string, Record<string, string>>,
  fieldName: string,
  value: any
) => {
  const fieldRules = rules?.[fieldName];
  if (!fieldRules) return undefined;
  const key = value == null ? '' : String(value);
  return fieldRules[key];
};

export function RecordTable({ data, collection, onEdit, onDelete, onUpdateRecord, onCreateField, onCreateRecord, onFieldUpdated: onFieldUpdatedCb, loading }: RecordTableProps) {
  const [hiddenColumns, setHiddenColumns] = useAppSetting<string[]>(
    `hidden_columns_${collection?.name || 'unknown'}`,
    []
  );

  const [settingsField, setSettingsField] = React.useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const [recordMeta] = useAppSetting<Record<string, any>>(`record_meta_${collection?.name || 'unknown'}`, {});
  const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {});
  const fieldColors = metadata[collection?.name]?.fieldColors || {};
  const valueColorRules = metadata[collection?.name]?.valueColorRules || {} as Record<string, Record<string, string>>;

  // selection state for bulk actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = React.useState<number | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = React.useState(false);
  const [bulkFieldName, setBulkFieldName] = React.useState<string | null>(null);
  const [bulkValue, setBulkValue] = React.useState<any>(null);

  const columnSizing = metadata[collection?.name]?.columnWidths ?? EMPTY_SIZING;
  const columnOrder = metadata[collection?.name]?.columnOrder ?? EMPTY_ORDER;

  const setColumnOrder = React.useCallback((newOrder: string[]) => {
    setMetadata((prev: Record<string, any>) => ({
      ...prev,
      [collection.name]: {
        ...prev[collection.name],
        columnOrder: newOrder
      }
    }));
  }, [collection?.name, setMetadata]);

  const setColumnSizing = React.useCallback((updater: any) => {
    setMetadata((prev: Record<string, any>) => {
      const currentSizing = prev[collection.name]?.columnWidths ?? EMPTY_SIZING;
      const newSizing = typeof updater === 'function' ? updater(currentSizing) : updater;
      return {
        ...prev,
        [collection.name]: {
          ...prev[collection.name],
          columnWidths: newSizing
        }
      };
    });
  }, [collection?.name, setMetadata]);

  // stable refs for callbacks used inside column definitions
  const onEditRef = React.useRef(onEdit);
  const onDeleteRef = React.useRef(onDelete);
  const onUpdateRecordRef = React.useRef(onUpdateRecord);
  React.useEffect(() => { onEditRef.current = onEdit; }, [onEdit]);
  React.useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  React.useEffect(() => { onUpdateRecordRef.current = onUpdateRecord; }, [onUpdateRecord]);

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
  const columnHelper = React.useMemo(() => createColumnHelper<any>(), []);

  // stable key for data-inferred columns (fallback when collection has no fields)
  const dataColumnsKey = data.length > 0 ? Object.keys(data[0]).sort().join('\0') : '';
  const hasActions = !!(onEdit || onDelete);

  const columns = React.useMemo(() => {
    let cols: any[] = [];
    
    if (collection.fields && collection.fields.length > 0) {
      const visibleFields = (collection.fields || [])
        .filter((f: any) => !f.hidden)
        .filter((f: any) => f.name && !hiddenColumns.includes(f.name));
      
      cols = visibleFields.map((field: any) => columnHelper.accessor(field.name, {
          header: (field.uiSchema?.title || field.name),
          meta: { field },
          cell: info => {
            const color = getValueColor(valueColorRules, field.name, info.getValue());
            return (
              <span style={{ color: color || undefined }} className="w-full block">
                <SmartField
                  value={info.getValue()}
                  field={field}
                  record={info.row.original}
                  collectionName={collection.name}
                  size="lg"
                  className="w-full"
                  onChange={(val) => {
                    onUpdateRecordRef.current?.(info.row.original.id, { [field.name]: val });
                  }}
                />
              </span>
            );
          }
        }));
    }
    
    // fallback: if no collection fields are defined but we have data, infer columns from the first row
    if (cols.length === 0 && dataColumnsKey) {
      const keys = dataColumnsKey.split('\0');
      cols = keys
        .filter(key => !hiddenColumns.includes(key))
        .map((key) =>
          columnHelper.accessor(key, {
            header: key,
            meta: { field: { name: key, type: 'string', uiSchema: { title: key } } },
            cell: info => {
              const color = getValueColor(valueColorRules, key, info.getValue());
              return (
                <span style={{ color: color || undefined }} className="w-full block">
                  <SmartField
                    value={info.getValue()}
                    field={{ type: 'string', name: key }}
                    record={info.row.original}
                    collectionName={collection.name}
                    size="lg"
                    className="w-full"
                    onChange={(val) => {
                      onUpdateRecordRef.current?.(info.row.original.id, { [key]: val });
                    }}
                  />
                </span>
              );
            }
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

    if (hasActions) {
      cols.push(columnHelper.display({
        id: 'actions',
        size: 90,
        minSize: 72,
        maxSize: 120,
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
                        : dataColumnsKey
                        ? dataColumnsKey.split('\0')
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
            {onEditRef.current && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditRef.current!(props.row.original); }}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDeleteRef.current && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteRef.current!(props.row.original); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      }));
    }

    return cols;
  }, [dataColumnsKey, collection, columnHelper, hasActions, hiddenColumns, setHiddenColumns]);

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

  const rows = table.getRowModel().rows;

  // bump version when table's internal sizing state changes (runs during drag)
  const columnSizingState = table.getState().columnSizing;
  const [columnVersion, setColumnVersion] = React.useState(0);
  const columnSizingRef = React.useRef(columnSizingState);
  
  React.useEffect(() => {
    // only update if sizing actually changed to avoid unnecessary re-renders
    if (JSON.stringify(columnSizingRef.current) !== JSON.stringify(columnSizingState)) {
      columnSizingRef.current = columnSizingState;
      setColumnVersion(v => v + 1);
    }
  }, [columnSizingState]);
  
  // also bump when our persisted sizing updates
  React.useEffect(() => {
    setColumnVersion(v => v + 1);
  }, [columnSizing]);

  const handleRowSelect = React.useCallback((rowId: string, rowIndex: number, event: React.MouseEvent) => {
    setSelectedIds((prev) => {
      if (event.shiftKey && rows.length > 0) {
        const anchor = lastSelectedIndex ?? rowIndex;
        const [start, end] = [anchor, rowIndex].sort((a, b) => a - b);
        const rangeIds = rows.slice(start, end + 1).map((r: any) => r.original.id);
        const merged = new Set(prev);
        rangeIds.forEach((id) => merged.add(id));
        return Array.from(merged);
      }

      if (event.metaKey || event.ctrlKey) {
        if (prev.includes(rowId)) {
          return prev.filter((id) => id !== rowId);
        }
        return [...prev, rowId];
      }

      return [rowId];
    });
    setLastSelectedIndex(rowIndex);
  }, [lastSelectedIndex, rows]);

  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);

  const clearSelection = React.useCallback(() => {
    setSelectedIds([]);
    setLastSelectedIndex(null);
  }, []);

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

  return (
    <div
      className="record-table-root h-full flex flex-col rounded-md border border-[#222] overflow-hidden no-scrollbar relative bg-[#0b0b0b]"
      style={{
        borderColor: '#222',
        borderWidth: '1px',
        background: '#0b0b0b'
      }}
    >


      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full flex flex-col min-h-0">
          <div
            ref={headerRef}
            data-testid="table-header-container"
            className="overflow-x-auto no-scrollbar overflow-y-hidden flex-shrink-0"
            onScroll={(e) => {
              // sync body when header moves (e.g. via trackpad)
              if (bodyRef.current) {
                bodyRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            {/* use full width when there are no columns so the header row
                remains visible and the add/gear buttons are clickable */}
            <Table
              style={{
                width: table.getTotalSize() + (onCreateField ? 40 : 0),
                minWidth: table.getTotalSize() + (onCreateField ? 40 : 0),
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
                          fieldColors={fieldColors}
                          valueColorRules={valueColorRules}
                          setMetadata={setMetadata}
                          onHide={(field: any) => {
                            if (!field || !field.name) return;
                            setHiddenColumns((prev: string[]) => {
                              if (prev.includes(field.name)) {
                                return prev.filter((c) => c !== field.name);
                              }
                              return [...prev, field.name];
                            });
                          }}
                        />
                      ))}
                    </SortableContext>
                  </TableRow>
                ))}
              </TableHeader>
            </Table>
          </div>

          <div
            ref={bodyRef}
            data-testid="table-body-container"
            className="flex-1 w-full relative overflow-x-auto no-scrollbar bg-[#0b0b0b] min-h-0 pb-10"
            style={{ minHeight: 200 }}
            onScroll={(e) => {
              // sync header position
              if (headerRef.current) {
                headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
            onClick={(e) => {
              // clicking empty space clears selection
              const target = e.target as HTMLElement;
              if (target === e.currentTarget && selectedIds.length > 0) {
                clearSelection();
              }
            }}
          >
            {selectedIds.length > 0 && (
              <div className="absolute top-2 right-2 z-30 flex items-center gap-2 bg-black/70 border border-border/70 rounded-md px-2 py-1 shadow-xl backdrop-blur">
                <span className="text-xs lowercase text-muted-foreground">{selectedIds.length} selected</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="bulk actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-2 space-y-1" align="end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs lowercase"
                      onClick={() => setIsBulkEditOpen(true)}
                    >
                      bulk edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs lowercase text-red-500 hover:text-red-600"
                      onClick={() => {
                        selectedIds.forEach((id) => {
                          const rec = rows.find((r: any) => r.original.id === id)?.original;
                          if (rec) onDeleteRef.current?.(rec);
                        });
                        clearSelection();
                      }}
                    >
                      bulk delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs lowercase"
                      onClick={() => {
                        toast.info('bulk move coming soon');
                      }}
                    >
                      <MoveRight className="h-3 w-3 mr-1" /> bulk move
                    </Button>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearSelection} title="clear selection">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div style={{ width: table.getTotalSize() + (onCreateField ? 40 : 0), minWidth: table.getTotalSize() + (onCreateField ? 40 : 0), height: '100%', position: 'relative' }}>
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
                        key={columnVersion}
                        rowCount={rows.length}
                        rowHeight={40}
                        rowProps={{
                          rows: rows,
                          collection,
                          onUpdate: onUpdateRecord,
                          onDelete,
                          onCreateField,
                          onCreateRecord,
                          recordMeta,
                          onEdit: onEditRef.current,
                          selectedIds,
                          onRowSelect: handleRowSelect,
                          clearSelection,
                          enableSelection: true,
                          tableSize: table.getTotalSize(),
                          columnVersion,
                        }}
                        style={{ height, width }}
                        rowComponent={DraggableRecordRow}
                      />
                  )}
                />
              )}
            </div>
          </div>

        </div>
      </DndContext>

      {/* add new record button — pinned to bottom, absolute so it doesn't affect autosizer layout */}
      {onCreateRecord && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-[#222] bg-[#0b0b0b] z-10">
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

      <FieldSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        field={settingsField}
        collectionName={collection.name}
        onFieldUpdated={() => {
          onFieldUpdatedCb?.();
        }}
      />

      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="lowercase">bulk edit ({selectedIds.length} entries)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs lowercase">property</Label>
              <select
                className="w-full h-9 bg-[#0f0f0f] border border-border rounded-sm text-sm px-2"
                value={bulkFieldName || ''}
                onChange={(e) => setBulkFieldName(e.target.value || null)}
              >
                <option value="">select property</option>
                {(collection.fields || []).map((f: any) => (
                  <option key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs lowercase">value</Label>
              <Input
                value={bulkValue ?? ''}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="new value"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsBulkEditOpen(false)}>cancel</Button>
            <Button
              disabled={!bulkFieldName || selectedIds.length === 0}
              onClick={() => {
                if (!bulkFieldName) return;
                selectedIds.forEach((id) => {
                  onUpdateRecordRef.current?.(id, { [bulkFieldName]: bulkValue });
                });
                toast.success('bulk update queued');
                setIsBulkEditOpen(false);
              }}
            >
              apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
