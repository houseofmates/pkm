import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation, type NavItem } from '@/components/navigation';
import { CollectionWrapper } from '@/components/dashboard/collection-wrapper';
import { CollectionDetailPage } from '@/pages/collection-detail';
import { DatabasesPage } from '@/pages/databases';
import { HomePage } from '@/pages/home';
import { HeadmatesPage } from '@/pages/headmates';
import { cn } from '@/lib/utils';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragEndEvent,
    type DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Folder } from 'lucide-react';

export function RootLayout() {
    const [activeTab, setActiveTab] = useState<'databases' | 'home' | 'headmates'>('home');
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const navigate = useNavigate();

    // --- Global Drag State (Lifted from Navigation) ---
    const [sidebarItems, setSidebarItems] = useState<NavItem[]>([]);
    const [activeDragItem, setActiveDragItem] = useState<NavItem | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const item = sidebarItems.find(i => i.id === active.id);
        if (item) setActiveDragItem(item);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        // 1. Handle Sidebar Reorder
        // We know it's a sidebar reorder if both active and over are in sidebarItems
        const activeId = active.id as string;
        const overId = over.id as string;
        const activeIsSidebar = sidebarItems.some(i => i.id === activeId);
        const overIsSidebar = sidebarItems.some(i => i.id === overId);

        if (activeIsSidebar && overIsSidebar && activeId !== overId) {
            setSidebarItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === activeId);
                const newIndex = items.findIndex((i) => i.id === overId);
                return arrayMove(items, oldIndex, newIndex);
            });
            return;
        }

        // 2. Handle Drop onto Dashboard
        if (activeIsSidebar && overId === 'dashboard-canvas') {
            const item = sidebarItems.find(i => i.id === activeId);
            if (item && item.type === 'collection') {
                // Dispatch event for Dashboard to pick up
                const event = new CustomEvent('pkm:add-widget', {
                    detail: { collectionName: item.id }
                });
                window.dispatchEvent(event);
            }
        }
    };

    const handleTabChange = (tab: 'databases' | 'home' | 'headmates' | 'board') => { // Update type
        setActiveTab(tab as any);
        if (tab === 'home') navigate('/');
        if (tab === 'headmates') navigate('/headmates');
        if (tab === 'databases') navigate('/databases');
        if (tab === 'board') navigate('/board');
    };

    const handleSelectCollection = (name: string | null) => {
        if (name === 'NEW') {
            return;
        }
        setSelectedCollection(name);
        if (name) {
            navigate('/databases/' + name);
        } else {
            navigate('/databases');
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen w-full bg-background">
                <Navigation
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onSelectCollection={handleSelectCollection}
                    selectedCollection={selectedCollection}
                    items={sidebarItems}
                    setItems={setSidebarItems}
                />

                <main className="flex-1 overflow-hidden h-full relative">
                    {/* We use Routes in App.tsx, but here we might render direct components for tabs if we weren't using Router 100% */}
                    {/* ... Actually App.tsx has the Routes. RootLayout is a Layout Route? */}
                    {/* Checking App.tsx: It renders <RootLayout /> inside BrowserRouter. */}
                    {/* RootLayout does NOT use <Outlet /> in my previous edits? Let's check. */}
                    {/* Previous RootLayout used conditional rendering or Outlet? */}
                    {/* The viewed file showed standard React Router <Outlet /> usage implies RootLayout wraps them. */}
                    {/* Let's assume standard Outlet usage for pages. */}

                    <Outlet />

                </main>

                <DragOverlay>
                    {activeDragItem ? (
                        <div className="bg-card border rounded shadow-lg p-2 flex items-center opacity-80 w-48 pointer-events-none">
                            <Folder className="h-4 w-4 mr-2" />
                            <span className="truncate text-sm font-medium">{activeDragItem.name}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
            <QuickEditSheet /> {/* Global Edit Panel */}
        </DndContext>
    );
}
```
