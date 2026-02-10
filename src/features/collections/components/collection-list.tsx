
import type { Collection } from '@/hooks/use-collections';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';


interface CollectionListProps {
    collections: Collection[];
    onSelect: (collection: Collection) => void;
}

export function CollectionList({ collections, onSelect }: CollectionListProps) {
    // Sort collections by title/name
    const sorted = [...collections].sort((a, b) => {
        const nameA = a.title || a.displayName || a.name || '';
        const nameB = b.title || b.displayName || b.name || '';
        return nameA.localeCompare(nameB);
    });

    if (collections.length === 0) {
        return <div className="text-center text-muted-foreground p-8">no collections found.</div>;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((col) => (
                <Card
                    key={col.key || col.name}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onSelect(col)}
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
            ))}
        </div>
    );
}
