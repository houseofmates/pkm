
import { useState, useMemo } from 'react';
import { Database, Home, Users, Search, Folder, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GlobalSearchDialog } from '@/components/global-search-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollections } from '@/hooks/use-collections';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Separator } from '@/components/ui/separator';

interface NavigationProps {
    activeTab: 'databases' | 'home' | 'headmates';
    onTabChange: (tab: 'databases' | 'home' | 'headmates') => void;
    className?: string;
    onSelectCollection: (name: string | null) => void;
    selectedCollection: string | null;
}

// Placeholder for now, moving to full folder logic next step
interface DraggableItem {
    id: string;
    type: 'collection' | 'folder';
    name: string;
    icon?: string;
    children?: DraggableItem[];
}

export function Navigation({ activeTab, onTabChange, className, onSelectCollection, selectedCollection }: NavigationProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const { collections } = useCollections();

    // We'll manage the sortable items here. For now, flat list.
    // In next steps, we'll implementing generic folder nesting.

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const tabs = [
        { id: 'databases', icon: Database, label: 'Databases' },
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'headmates', icon: Users, label: 'Headmates' },
    ] as const;

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <div className={cn("hidden md:flex flex-col w-64 border-r bg-card/30 backdrop-blur-sm py-4", className)}>
                {/* Horizontal Top Icons */}
                <div className="flex items-center justify-around px-2 mb-4">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id && !selectedCollection ? "default" : "ghost"}
                            size="icon"
                            className={cn("rounded-xl w-10 h-10 transition-all", activeTab === tab.id && !selectedCollection && "bg-primary text-primary-foreground shadow-md")}
                            onClick={() => {
                                onTabChange(tab.id);
                                onSelectCollection(null); // Deselect collection when switching main tabs
                            }}
                            title={tab.label}
                        >
                            <tab.icon className="h-5 w-5" />
                        </Button>
                    ))}
                </div>

                <Separator className="mb-4" />

                {/* Database List */}
                <div className="px-4 mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Databases</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-muted" onClick={() => onTabChange('databases')}>
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-2">
                    <div className="space-y-1">
                        {collections.map(col => (
                            <Button
                                key={col.name}
                                variant={selectedCollection === col.name ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-sm font-normallowercase h-9 px-2",
                                    selectedCollection === col.name && "bg-accent font-medium shadow-sm"
                                )}
                                onClick={() => {
                                    onSelectCollection(col.name);
                                    onTabChange('databases');
                                }}
                            >
                                <span className="line-clamp-1">{col.title || col.name}</span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>

                <div className="mt-auto px-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-muted-foreground border-dashed"
                        onClick={() => setSearchOpen(true)}
                    >
                        <Search className="h-4 w-4" />
                        <span className="text-xs">Search / Ask AI...</span>
                    </Button>
                </div>

                <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            </div>

            {/* Mobile Bottom Nav (Unchanged for now, focus on desktop sidebar first as per request order) */}
            <nav className={cn("md:hidden flex items-center justify-around px-4 h-16 border-t bg-background sticky bottom-0 z-50", className)}>
                {tabs.map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "secondary" : "ghost"}
                        size="icon"
                        className={cn("rounded-xl h-10 w-10", activeTab === tab.id && "bg-primary text-primary-foreground")}
                        onClick={() => {
                            onTabChange(tab.id);
                            onSelectCollection(null);
                        }}
                    >
                        <tab.icon className="h-5 w-5" />
                    </Button>
                ))}
            </nav>
        </>
    );
}
