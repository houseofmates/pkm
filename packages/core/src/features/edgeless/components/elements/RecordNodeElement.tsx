
import React from 'react';
import { useEdgelessStore } from '../../store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2 } from 'lucide-react';
import { RecordForm } from '@/features/records/components/record-form'; // Re-use existing form!
import { useCollection } from '@/hooks/use-collections';
import { useRecord } from '@/hooks/use-records';

interface RecordNodeElementProps {
  element: any;
}

export const RecordNodeElement = React.memo<RecordNodeElementProps>(({ element }) => {
  const { updateElement } = useEdgelessStore();
  const { data: collection } = useCollection(element.data.collectionName);
  const { data: record, updateRecord } = useRecord(element.data.collectionName, element.data.recordId);

  // local state for expansion (or use element.data.mode)
  const isExpanded = element.data.mode === 'card';

  const toggleExpand = (_e: React.MouseEvent) => {
    _e.stopPropagation();
    updateElement(element.id, {
      width: isExpanded ? 200 : 400,
      height: isExpanded ? 60 : 500,
      data: { ...element.data, mode: isExpanded ? 'node' : 'card' }
    });
  };

  if (!collection) return <div className="p-2 text-xs text-red-500">collection not found</div>;

  return (
    <div className={cn(
      "w-full h-full flex flex-col transition-all duration-300",
      "bg-black/80 backdrop-blur-md border border-primary/50 rounded-lg overflow-hidden shadow-xl", // Modern glassmorphism aesthetic
      isExpanded ? "z-50" : "z-auto"
    )}>
      {/* header (node view) */}
      <div className="h-[60px] flex items-center justify-between px-3 border-b border-primary/20 shrink-0 cursor-move"
        onMouseDown={(_e) => {
          // allow dragging via header? fabric handles dragging usually.
          // but since we are an overlay "pointer-events-auto", we might steal drag.
          // if we want fabric to drag, we need to pass event?
          // or we just let this be the drag handle if we implemented html dragging logic?
          // actually, for edgelesscanvas, dragging is handled by fabric selection.
          // so we should usually let clicks pass through unless it's a button.
          // but `pointer-events-auto` blocks fabric.
          // solution: header should be draggable handle?
          // for now, let's assume the user selects via the "select tool" box or clicking edges.
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full border border-primary/50 flex items-center justify-center bg-primary/10">
            {/* icon placeholder or record icon */}
            <span className="text-primary text-xs">r</span>
          </div>
          <span className="text-sm font-medium text-primary truncate max-w-[120px]">
            {record?.title || element.data.title || 'loading...'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleExpand}>
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* expanded content (card view) */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-2 bg-background/50">
          {/* reuse recordform for full editing power! */}
          <RecordForm
            collection={collection}
            initialData={record}
            onSubmit={async (data) => {
              await updateRecord(data);
              // visual feedback?
            }}
            onCancel={() => { }} // Hide cancel button?
          />
        </div>
      )}
    </div>
  );
})
