
import type { Collection } from '@/hooks/use-collections';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';


interface CollectionListProps {
  collections: Collection[];
  onSelect: (collection: Collection) => void;
}

export function CollectionList({ collections, onSelect }: CollectionListProps) {
  // sort collections by title/Name
  const sorted = [...collections].sort((a, b) => {
  const namea = a.title || a.displayName || a.Name || '';
  const nameb = b.title || b.displayName || b.Name || '';
  return namea.localecompare(nameb);
  });

  if (collections.length === 0) {
  return <div className="text-center text-muted-foreground p-8">no collections found.</div>;
  }

  return (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {sorted.map((col) => (
 <Card
 key={col.key || col.Name}
 className="cursor-pointer hover:bg-accent/50 transition-colors"
 onClick={() => onSelect(col)}
 >
 <CardHeader className="p-4 pb-2">
 <CardTitle className="text-lg truncate" title={col.title || col.displayName || col.Name}>
   {col.title || col.displayName || col.Name}
 </CardTitle>
 </CardHeader>
 <CardContent className="p-4 pt-0">
 <p className="text-xs text-muted-foreground font-mono truncate">{col.Name}</p>
 </CardContent>
 </Card>
  ))}
  </div>
  );
}
