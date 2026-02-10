
import { useCollections } from '@/hooks/use-collections';
import { CollectionCard } from '@/features/collections/components/collection-card';
import { useAuth } from '@/contexts/auth-context';
import { NocoBaseClient } from '@/api/nocobase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionDialog } from '@/features/collections/components/collection-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DatabaseContextMenu } from '@/features/databases/components/database-context-menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, GripVertical } from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Collection } from '@/types/nocobase';

interface DatabasesPageProps {
    onSelect?: (name: string) => void;
}

interface SortableDatabaseItemProps {
    collection: Collection;
    onSelect: (name: string) => void;
    onRefresh: () => void;
}

function SortableDatabaseItem({ collection, onSelect, onRefresh }: SortableDatabaseItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: collection.name });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative"
        >
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 bg-background/80 backdrop-blur rounded-md border shadow-sm transition-opacity"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <DatabaseContextMenu collection={collection} onUpdate={onRefresh}>
                <div onClick={() => onSelect(collection.name)} className="cursor-pointer">
                    <CollectionCard collection={collection} />
                </div>
            </DatabaseContextMenu>
        </div>
    );
}

export function DatabasesPage({ onSelect }: DatabasesPageProps) {
    const { isAuthenticated, login, token } = useAuth();
    const { collections, loading, error, refresh } = useCollections();
    const [validating, setValidating] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    console.log('DatabasesPage:', { 
        isAuthenticated, 
        hasToken: !!token,
        token: token?.substring(0, 20) + '...',
        collectionsCount: collections.length, 
        loading, 
        error 
    });

    const [dbOrder, setDbOrder] = useAppSetting<string[]>('database_order', []);
    const [sidebarItems] = useAppSetting<any[]>('sidebar_items', []);

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

    useEffect(() => {
        const allowed = (location.state as any)?.fromSidebar || localStorage.getItem('pkm:allow_databases_direct');
        if (!allowed) {
            navigate('/');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, navigate]);

    // 1. Filter out pkm_canvases from collections
    const filteredCollections = collections.filter(c => c.name !== 'pkm_canvases');

    // 2. Extract Docs and Drawings from Sidebar Items
    // We treat them as "Pseudo Collections" so they can live in the grid
    const sidebarDocs = sidebarItems
        .filter(item => (item.id.startsWith('doc_') || item.id.startsWith('drawing_')))
        .map(item => ({
            name: item.id, // e.g. doc_123 - Use this as unique key
            title: item.name,
            description: item.id.startsWith('drawing_') ? 'drawing' : 'document',
            fields: [], // No fields
            meta: { color: item.color } // Inject color for CollectionCard to pick up
        })) as unknown as Collection[];

    // 3. Merge Lists
    const allItems = [...filteredCollections, ...sidebarDocs];

    const sortedCollections = [...allItems].sort((a, b) => {
        const indexA = dbOrder.indexOf(a.name);
        const indexB = dbOrder.indexOf(b.name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = sortedCollections.findIndex((c) => c.name === active.id);
            const newIndex = sortedCollections.findIndex((c) => c.name === over.id);
            const newOrder = arrayMove(sortedCollections.map(c => c.name), oldIndex, newIndex);
            setDbOrder(newOrder);
        }
    };

    const handleSelect = (name: string) => {
        if (onSelect) {
            onSelect(name);
        } else {
            // Check for Docs/Drawings
            if (name.startsWith('doc_')) {
                navigate(`/canvas/${name.replace('doc_', '')}`, { state: { fromSidebar: true } });
                return;
            }
            if (name.startsWith('drawing_')) {
                navigate(`/drawings/${name.replace('drawing_', '')}`, { state: { fromSidebar: true } });
                return;
            }

            // Default Database Navigation
            navigate(`/databases/${encodeURIComponent(name)}`, { state: { fromSidebar: true } });
        }
    };


    const handleLogin = async () => {
        console.log('[DatabasesPage] handleLogin called', { apiKey: apiKey?.substring(0, 10) + '...' });
        if (!apiKey) {
            console.log('[DatabasesPage] no api key provided');
            toast.error('please enter an api token');
            return;
        }
        setValidating(true);
        console.log('[DatabasesPage] saving token...');
        try {
            // Save token directly - it will be validated on first actual API call
            // This avoids timeout issues during login
            login(apiKey);
            toast.success("connected to nocobase");
            console.log('[DatabasesPage] refreshing collections...');
            // Give a brief moment for the state to update
            await new Promise(resolve => setTimeout(resolve, 100));
            await refresh();
        } catch (error: any) {
            console.error('[DatabasesPage] login failed:', error);
            toast.error('failed to save token. please try again.');
        } finally {
            setValidating(false);
            console.log('[DatabasesPage] validation complete');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="p-4 md:p-8 h-full flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="lowercase">connect nocobase</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="lowercase">api token</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="enter nocobase api token"
                                onKeyDown={(e) => e.key === 'Enter' && !validating && handleLogin()}
                                disabled={validating}
                            />
                            <p className="text-xs text-muted-foreground lowercase">
                                your token is stored locally.
                            </p>
                        </div>
                        <Button 
                            className="w-full lowercase" 
                            onClick={handleLogin}
                            disabled={validating || !apiKey}
                        >
                            {validating ? 'validating...' : 'connect'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-destructive">error loading databases: {error}</div>;
    }

    if (loading && collections.length === 0) {
        return <div className="p-8 text-muted-foreground">loading databases...</div>;
    }

    // Only exclude if truly empty (no collections AND no sidebar docs)
    if (allItems.length === 0) {
        return (
            <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
                {/* Still show the add button even if empty */}
                <div className="flex items-center justify-end mb-4">
                    <div className="flex items-center gap-2">
                        <CollectionDialog onSuccess={refresh} trigger={
                            <Button size="icon" variant="outline" className="rounded-full w-10 h-10">
                                <Plus className="h-6 w-6" />
                            </Button>
                        } />
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 border-2 border-dashed rounded-lg opacity-50">
                    <p className="text-xl">no databases found</p>
                    <p className="text-sm">create one to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-2">
                    <CollectionDialog onSuccess={refresh} trigger={
                        <Button size="icon" variant="outline" className="rounded-full w-10 h-10">
                            <Plus className="h-6 w-6" />
                        </Button>
                    } />
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sortedCollections.map(c => c.name)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {sortedCollections.map(collection => (
                            <SortableDatabaseItem
                                key={collection.name}
                                collection={collection}
                                onSelect={handleSelect}
                                onRefresh={refresh}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
