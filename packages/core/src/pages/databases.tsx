
import { useCollections } from '@/hooks/use-collections';
import { CollectionCard } from '@/features/collections/components/collection-card';
import { useAuth } from '@/contexts/auth-context';
import { useHiddenCollections } from '@/hooks/use-hidden-collections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionDialog } from '@/features/collections/components/collection-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DatabaseContextMenu } from '@/features/databases/components/database-context-menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { storageManager } from '@/lib/storage-manager';
import { Plus } from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { secureLogger } from '@/lib/secure-logger';
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
import type { Collection } from '@/types';

interface DatabasesPageProps {
  onSelect?: (name: string) => void;
}

interface SortableDatabaseItemProps {
  collection: Collection;
  onSelect: (name: string) => void;
  onRefresh: () => void;
  onHide?: () => void;
  onUnhide?: () => void;
  isHidden?: boolean;
}

function SortableDatabaseItem({ collection, onSelect, onRefresh, onHide, onUnhide, isHidden }: SortableDatabaseItemProps) {
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
    touchAction: 'pan-y',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
      {...attributes}
      {...listeners}
    >
      <DatabaseContextMenu
        collection={collection}
        onUpdate={onRefresh}
        onHide={onHide}
        onUnhide={onUnhide}
        isHidden={isHidden}
      >
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

  secureLogger.info('databasespage:', {
    isAuthenticated,
    hastoken: !!token,
    token: token?.substring(0, 20) + '...',
    collectionscount: collections.length,
    loading,
    error
  });

  const [dbOrder, setDbOrder] = useAppSetting<string[]>('database_order', []);
  const [sidebarItems] = useAppSetting<any[]>('sidebar_items', []);
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const { client } = useAuth();

  // 1. filter out internal collections from grid
  const FORBIDDEN_COLLECTIONS = ['site-pages', 'dupemates-pages', 'server-stats', 'public_blocks', 'public_pages', 'pkm_canvases', 'pkm_settings', 'front_history', 'website', 'dupemates-pages'];
  const filteredCollections = collections.filter((c: Collection) => !FORBIDDEN_COLLECTIONS.includes(String(c.name).toLowerCase()));

  // 2. supplement missing field metadata for collections the api doesn't return fields for
  const FALLBACK_FIELDS: Record<string, Array<{ name: string; type: string; interface?: string }>> = {
    events: [
      { name: 'title', type: 'string', interface: 'input' },
      { name: 'start_time', type: 'datetime', interface: 'datetime' },
      { name: 'end_time', type: 'datetime', interface: 'datetime' },
      { name: 'location', type: 'string', interface: 'input' },
      { name: 'notes', type: 'text', interface: 'textarea' },
      { name: 'url', type: 'string', interface: 'input' },
      { name: 'uid', type: 'string', interface: 'input' },
      { name: 'fronter', type: 'string', interface: 'input' },
      { name: 'id', type: 'integer', interface: 'integer' },
    ],
    exercise: [
      { name: 'exercise_type', type: 'string', interface: 'input' },
      { name: 'duration', type: 'integer', interface: 'integer' },
      { name: 'intensity', type: 'string', interface: 'select' },
      { name: 'calories', type: 'integer', interface: 'integer' },
      { name: 'notes', type: 'text', interface: 'textarea' },
      { name: 'created_at', type: 'datetime', interface: 'datetime' },
      { name: 'fronter', type: 'string', interface: 'input' },
    ],
    finances: [
      { name: 'description', type: 'string', interface: 'input' },
      { name: 'amount', type: 'float', interface: 'input' },
      { name: 'category', type: 'string', interface: 'select' },
      { name: 'type', type: 'string', interface: 'select' },
      { name: 'date', type: 'date', interface: 'datetime' },
      { name: 'notes', type: 'text', interface: 'textarea' },
      { name: 'fronter', type: 'string', interface: 'input' },
    ],
    journal: [
      { name: 'title', type: 'string', interface: 'input' },
      { name: 'content', type: 'text', interface: 'markdown' },
      { name: 'mood', type: 'string', interface: 'select' },
      { name: 'tags', type: 'json', interface: 'tag' },
      { name: 'created_at', type: 'datetime', interface: 'datetime' },
      { name: 'fronter', type: 'string', interface: 'input' },
    ],
    sleep: [
      { name: 'bedtime', type: 'datetime', interface: 'datetime' },
      { name: 'wake_time', type: 'datetime', interface: 'datetime' },
      { name: 'duration', type: 'float', interface: 'input' },
      { name: 'quality', type: 'integer', interface: 'integer' },
      { name: 'notes', type: 'text', interface: 'textarea' },
      { name: 'created_at', type: 'datetime', interface: 'datetime' },
      { name: 'fronter', type: 'string', interface: 'input' },
    ],
  };

  const collectionsWithFallbackFields = filteredCollections.map((col: Collection) => {
    if (col.fields && col.fields.length > 0) return col;
    const fallback = FALLBACK_FIELDS[col.name];
    if (fallback) return { ...col, fields: fallback };
    return col;
  });

  // fetch record counts for each collection
  useEffect(() => {
    if (!isAuthenticated || collectionsWithFallbackFields.length === 0) return;
    let cancelled = false;

    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        collectionsWithFallbackFields.map(async (col) => {
          try {
            const res = await client.request(col.name, 'list', {
              method: 'GET',
              params: { pageSize: 1, fields: ['id'] }
            }) as any;
            // Handle various NocoBase API response structures
            const total = res?.data?.meta?.count ??
              res?.data?.meta?.total ??
              res?.data?.meta?.totalCount ??
              res?.meta?.count ??
              res?.meta?.total ??
              res?.meta?.totalCount ??
              res?.total ??
              0;
            counts[col.name] = total;
            secureLogger.debug(`[Databases] ${col.name} count:`, total);
          } catch (err) {
            secureLogger.warn(`[Databases] Failed to fetch count for ${col.name}:`, err);
            counts[col.name] = 0;
          }
        })
      );
      if (!cancelled) setRecordCounts(counts);
    };

    fetchCounts();
    return () => { cancelled = true; };
  }, [isAuthenticated, collectionsWithFallbackFields.length, client]);

  // inject record counts into collection objects
  const collectionsWithCounts = collectionsWithFallbackFields.map((c) => ({
    ...c,
    recordCount: recordCounts[c.name]
  })) as Collection[];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const allowed = (location.state as any)?.fromSidebar || storageManager.getItem('pkm:allow_databases_direct');
    if (!allowed && !isAuthenticated) {
      navigate('/');
    }
  }, [location, navigate, isAuthenticated]);

  // 2. extract docs and drawings from sidebar items
  // we treat them as "pseudo collections" so they can live in the grid
  const sidebarDocs = sidebarItems
    .filter(item => (item.id.startsWith('doc_') || item.id.startsWith('drawing_')))
    .map(item => ({
      name: item.id, // e.g. doc_123 - use this as unique key
      title: item.name,
      description: item.id.startsWith('drawing_') ? 'drawing' : 'document',
      fields: [], // no fields
      meta: { color: item.color } // inject color for collectioncard to pick up
    })) as unknown as Collection[];

  // 3. merge lists
  const allItems = [...collectionsWithCounts, ...sidebarDocs];

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
      // check for docs/drawings
      if (name.startsWith('doc_')) {
        navigate(`/canvas/${name.replace('doc_', '')}`, { state: { fromSidebar: true } });
        return;
      }
      if (name.startsWith('drawing_')) {
        navigate(`/drawings/${name.replace('drawing_', '')}`, { state: { fromSidebar: true } });
        return;
      }

      // default database navigation
      navigate(`/databases/${encodeURIComponent(name)}`, { state: { fromSidebar: true } });
    }
  };


  const handleLogin = async () => {
    if (!apiKey) {
      toast.error('please enter an api token');
      return;
    }
    setValidating(true);
    try {
      // save token directly - it will be validated on first actual api call
      // this avoids timeout issues during login
      login(apiKey);
      toast.success("connected to nocobase");
      // give a brief moment for the state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      await refresh();
    } catch (error: any) {
      secureLogger.error('[DatabasesPage] login failed:', error);
      toast.error('failed to save token. please try again.');
    } finally {
      setValidating(false);
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
                placeholder="enter your api token"
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
    return <div className="p-8 text-destructive lowercase">error loading databases: {error}</div>;
  }

  if (loading && collections.length === 0) {
    return <div className="p-8 text-muted-foreground lowercase">loading databases...</div>;
  }

  // only exclude if truly empty (no collections and no sidebar docs)
  if (allItems.length === 0) {
    return (
      <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
        {/* still show the add button even if empty */}
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
          <p className="text-xl lowercase">no databases found</p>
          <p className="text-sm lowercase">create one to get started</p>
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
          {/* masonry-style column layout: uses css columns for vertical packing while keeping dnd-kit context */}
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-5 xl:columns-5 gap-4 space-y-4">
            {sortedCollections.map(collection => (
              <div key={collection.name} className="break-inside-avoid mb-4">
                <SortableDatabaseItem
                  collection={collection}
                  onSelect={handleSelect}
                  onRefresh={refresh}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
