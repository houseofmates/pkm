import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// custom sensor that ignores clicks on editable elements (inputs, textareas, contenteditable)
class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('select') ||
          target.closest('[contenteditable="true"]')
        ) {
          return false;
        }
        return true;
      },
    },
  ];
}

type Widget = any;

function DroppableColumn({ ci, children }: { ci: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${ci}`, data: { columnIndex: ci } });
  return (
    <div ref={setNodeRef} className={`space-y-4 relative min-h-[100px] rounded-lg transition-colors ${isOver ? 'bg-white/10 ring-2 ring-primary/30' : ''}`}>
      {children}
    </div>
  );
}

function SortableItem({ id, render }: { id: string; render: () => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, transition: { duration: 150, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' } });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} data-preview-id={id} style={style} {...attributes} {...listeners} className={`p-3 bg-white/5 rounded border border-white/5 text-sm ${isDragging ? '' : 'cursor-grab hover:bg-white/[0.07]'}`}>
      {render()}
    </div>
  );
}

export default function PreviewCanvas({
  columns,
  columnWidths,
  onColumnWidthsChange,
  onColumnsChange,
  renderWidget,
  className,
}: {
  columns: Widget[][];
  columnWidths?: number[];
  onColumnWidthsChange?: (w: number[]) => void;
  onColumnsChange?: (cols: Widget[][]) => void;
  renderWidget: (w: Widget, idx: number) => React.ReactNode;
  className?: string;
}) {
  const colCount = Math.max(1, Math.min(columns.length || 1, 4));

  const [localCols, setLocalCols] = useState<Widget[][]>(() => columns.map((c) => (Array.isArray(c) ? [...c] : [])));

  useEffect(() => {
    setLocalCols(columns.map((c) => (Array.isArray(c) ? [...c] : [])));
  }, [columns]);

  const widths = columnWidths?.slice(0, colCount) || Array(colCount).fill(Math.floor(100 / colCount));

  const findLocation = (id: string) => {
    for (let ci = 0; ci < localCols.length; ci++) {
      for (let wi = 0; wi < localCols[ci].length; wi++) {
        const itemId = `${ci}:${wi}:${localCols[ci][wi].id || localCols[ci][wi].title || wi}`;
        if (itemId === id) return { ci, wi, item: localCols[ci][wi] };
      }
    }
    return null;
  };

  const sensors = useSensors(useSensor(SmartPointerSensor, { activationConstraint: { distance: 3 } }), useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }));

  const [activeId, setActiveId] = useState<string | null>(null);

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    const loc = findLocation(activeId);
    return loc?.item ?? null;
  }, [activeId, localCols]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = active.id as string;
    const from = findLocation(activeIdStr);
    if (!from) {
      setActiveId(null);
      return;
    }

    const overId = over.id as string;
    let targetCol = from.ci;
    let targetIndex = from.wi;

    if (overId.startsWith('col-')) {
      targetCol = Number(overId.split('-')[1]);
      targetIndex = localCols[targetCol]?.length || 0;
    } else {
      const to = findLocation(overId);
      if (!to) {
        setActiveId(null);
        return;
      }
      targetCol = to.ci;
      targetIndex = to.wi;
    }

    if (from.ci === targetCol && from.wi === targetIndex) {
      setActiveId(null);
      return;
    }

    const newCols = localCols.map((c) => [...c]);
    const [movedItem] = newCols[from.ci].splice(from.wi, 1);
    if (from.ci === targetCol && targetIndex > from.wi) targetIndex--;
    newCols[targetCol].splice(targetIndex, 0, movedItem);

    setLocalCols(newCols);
    onColumnsChange?.(newCols);
    setActiveId(null);
  };

  return (
    <div className={className}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
        <div className="grid grid-cols-4 gap-4">
          {localCols.map((col, ci) => (
            <DroppableColumn key={ci} ci={ci}>
              <SortableContext items={col.map((_, wi) => `${ci}:${wi}:${col[wi].id || col[wi].title || wi}`)} strategy={verticalListSortingStrategy}>
                {col.map((w, wi) => (
                  <SortableItem key={`${ci}:${wi}:${w.id || w.title || wi}`} id={`${ci}:${wi}:${w.id || w.title || wi}`} render={() => renderWidget(w, wi)} />
                ))}
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>
        <DragOverlay>{activeItem ? <div className="p-3 bg-white/5 rounded border border-white/5 text-sm">{renderWidget(activeItem, 0)}</div> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
    