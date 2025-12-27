
import { useCollections } from '@/hooks/use-collections';
import { CollectionCard } from '@/components/collection-card';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionDialog } from '@/components/collection-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DatabaseContextMenu } from '@/components/database-context-menu';
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
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Collection } from '@/types/nocobase';

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
            <div onClick={() => onSelect(collection.name)} className="cursor-pointer">
                <DatabaseContextMenu collection={collection} onUpdate={onRefresh}>
                    <div className="pointer-events-none">
                        <CollectionCard collection={collection} />
                    </div>
                </DatabaseContextMenu>
            </div>
        </div>
    );
}

export function DatabasesPage({ onSelect }: DatabasesPageProps) {
    const { isAuthenticated, login } = useAuth();
    const { collections, loading, error, refresh } = useCollections();
    const [apiKey, setApiKey] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const [dbOrder, setDbOrder] = useAppSetting<string[]>('database_order', []);

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
        const params = new URLSearchParams(location.search);
        const allowed = (location.state as any)?.fromSidebar || localStorage.getItem('pkm:allow_databases_direct') || params.get('bookmark') === 'true';
        if (!allowed) {
            navigate('/');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, navigate]);

    const sortedCollections = [...collections].sort((a, b) => {
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
            navigate(`/databases/${name}`, { state: { fromSidebar: true, view: 'table' } });
        }
    };

    const handleBookmark = () => {
        const url = window.location.origin + '/databases?bookmark=true';
        try {
            navigator.clipboard.writeText(url);
            localStorage.setItem('pkm:allow_databases_direct', '1');
            toast.success('database link copied to clipboard');
        } catch (e) {
            console.warn('Clipboard write failed', e);
            toast.success('copy URL: ' + url);
        }
    };

    const handleLogin = () => {
        if (!apiKey) return;
        login(apiKey);
        toast.success("nocobase API key saved");
    };

    if (!isAuthenticated) {
        return (
            <div className="p-4 md:p-8 h-full flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>connect nocobase</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API token</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="enter nocobase API token"
                            />
                            <p className="text-xs text-muted-foreground">
                                your token is stored locally.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <strong>note:</strong> dev servers use the full origin (host + port). if you started the dev server on a different port, you'll need to re-enter your API token for this origin.
                            </p>
                        </div>
                        <Button className="w-full" onClick={handleLogin}>connect</Button>
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

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold lowercase tracking-tight">databases</h1>
                <div className="flex items-center gap-2">
                    <CollectionDialog onSuccess={refresh} trigger={
                        <Button size="icon" variant="outline" className="rounded-full w-10 h-10">
                            <Plus className="h-6 w-6" />
                        </Button>
                    } />
                    <Button variant="ghost" size="sm" onClick={handleBookmark}>bookmark</Button>
                </div>
            </div>
            {collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 border-2 border-dashed rounded-lg opacity-50">
                    <p className="text-xl">no databases found</p>
                    <p className="text-sm">create one to get started</p>
                </div>
            ) : (
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
            )}
        </div>
    );
}
