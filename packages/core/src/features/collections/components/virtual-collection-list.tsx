import type { Collection } from '@/hooks/use-collections';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualCollectionListProps {
  collections: Collection[];
  onSelect: (collection: Collection) => void;
}

export function VirtualCollectionList({ collections, onSelect }: VirtualCollectionListProps) {
  // sort collections by title/name
  const sorted = [...collections].sort((a, b) => {
    const nameA = a.title || a.displayName || a.name || '';
    const nameB = b.title || b.displayName || b.name || '';
    return nameA.localeCompare(nameB);
  });

  if (collections.length === 0) {
    return <div className="text-center text-muted-foreground p-8">no collections found.</div>;
  }

  // eslint-disable-next-line
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => {
      const el = document.querySelector('.virtual-collection-list-container');
      return el instanceof HTMLElement ? el : null;
    },
    estimateSize: () => 120, // estimated height of each card
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      className="virtual-collection-list-container overflow-y-auto"
      style={{ height: '100%' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((item) => {
            const col = sorted[item.index];
            return (
              <Card
                key={col.key || col.name}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onSelect(col)}
                style={{
                  position: 'absolute',
                  top: `${item.start}px`,
                  left: 0,
                  width: '100%',
                }}
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg truncate" title={col.title || col.displayName || col.name}>
                    {col.title || col.displayName || col.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground font-mono truncate">{col.name}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}