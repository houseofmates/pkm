
import { useCollections } from '@/hooks/use-collections';
import { CollectionCard } from '@/components/collection-card';

// In a real app we'd wrap this with DnD context (dnd-kit)
// For now, implementing the Visual Card Grid
export function DatabasesPage() {
    const { collections, loading, error } = useCollections();

    if (error) {
        return <div className="p-8 text-destructive">Error loading databases: {error}</div>;
    }

    if (loading && collections.length === 0) {
        return <div className="p-8 text-muted-foreground">loading databases...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <h1 className="text-3xl font-bold lowercase tracking-tight">Databases</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {collections.map(collection => (
                    <CollectionCard key={collection.name} collection={collection} />
                ))}
            </div>
        </div>
    );
}
