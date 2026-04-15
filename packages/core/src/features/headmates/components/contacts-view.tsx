import { HeadmateCard } from "./headmate-card";
import type { ViewProps } from "@/components/views/registry";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Search, Check, X } from "lucide-react";
import { useFronter } from "@/contexts/fronter-context";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableHeadmateCardProps {
  member: any;
  collection: any;
  isSelected: boolean;
  frontPosition: number | null;
  onClick: () => void;
}

function SortableHeadmateCard({ member, collection, isSelected, frontPosition, onClick }: SortableHeadmateCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <HeadmateCard
        member={member}
        collection={collection}
        isSelected={isSelected}
        frontPosition={frontPosition}
        onClick={onClick}
      />
    </div>
  );
}

export function ContactsView({ data, collection }: ViewProps) {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const { activeFronters, registerFrontChange } = useFronter();

  const titleField = collection?.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

  const filtered = data.filter(m => {
    const title = m[titleField.name] || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  // sync with active fronters from context
  useEffect(() => {
    if (activeFronters.length > 0) {
      setSelectedOrder(activeFronters);
    }
  }, []);

  const handleCardClick = useCallback((memberId: string) => {
    setSelectedOrder(prev => {
      const index = prev.indexOf(memberId);
      if (index === -1) {
        // add to selection
        return [...prev, memberId];
      } else {
        // remove from selection
        return prev.filter(id => id !== memberId);
      }
    });
  }, []);

  const handleApplyFront = useCallback(async () => {
    if (selectedOrder.length === 0) {
      toast.info("no headmates selected");
      return;
    }
    await registerFrontChange(selectedOrder);
  }, [selectedOrder, registerFrontChange]);

  const handleClearSelection = useCallback(() => {
    setSelectedOrder([]);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedOrder((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // get ordered and unfiltered members
  const orderedMembers = selectedOrder
    .map(id => filtered.find(m => String(m.id) === id || m.id === id))
    .filter(Boolean);

  const unselectedMembers = filtered.filter(m => !selectedOrder.includes(String(m.id)) && !selectedOrder.includes(m.id));

  const getFrontPosition = (memberId: string) => {
    const index = selectedOrder.indexOf(memberId);
    return index !== -1 ? index + 1 : null;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* toolbar */}
      <div className="flex items-center p-2 border-b gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filtered.length} contacts
        </div>
        {selectedOrder.length > 0 && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={handleApplyFront}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              set front ({selectedOrder.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              clear
            </Button>
          </>
        )}
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {/* selected members - draggable */}
          {orderedMembers.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2 px-1">selected (drag to reorder)</div>
              <SortableContext items={selectedOrder}>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  {orderedMembers.map(member => (
                    <SortableHeadmateCard
                      key={member.id}
                      member={member}
                      collection={collection}
                      isSelected={true}
                      frontPosition={getFrontPosition(String(member.id))}
                      onClick={() => handleCardClick(String(member.id))}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}
        </DndContext>

        {/* unselected members */}
        {unselectedMembers.length > 0 && (
          <div>
            {orderedMembers.length > 0 && (
              <div className="text-xs text-muted-foreground mb-2 px-1">available</div>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {unselectedMembers.map(member => (
                <HeadmateCard
                  key={member.id}
                  member={member}
                  collection={collection}
                  isSelected={false}
                  frontPosition={null}
                  onClick={() => handleCardClick(String(member.id))}
                />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            no contacts found
          </div>
        )}
      </div>
    </div>
  );
}

