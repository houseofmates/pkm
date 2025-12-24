
import type { ViewProps } from './registry';
import { Card, CardContent } from "@/components/ui/card";

export function GalleryView({ data, loading, collection }: ViewProps) {
    if (loading) return <div>Loading gallery...</div>;

    // Detect image field
    const imageField = collection?.fields?.find((f: any) => f.interface === 'attachment' || f.name.toLowerCase().includes('image') || f.name.toLowerCase().includes('cover'));

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data.map((record, i) => (
                <Card key={record.id || i} className="overflow-hidden hover:shadow-md transition-all">
                    <div className="aspect-square bg-muted/50 flex items-center justify-center relative">
                        {/* Placeholder logic for image */}
                        {imageField && record[imageField.name] ? (
                            <img src={record[imageField.name]} alt="Cover" className="h-full w-full object-cover" />
                        ) : (
                            <div className="text-4xl opacity-10 font-bold">{record.title?.[0] || record.name?.[0] || '?'}</div>
                        )}
                    </div>
                    <CardContent className="p-3">
                        <h4 className="font-bold truncate">{record.title || record.name || 'Untitled'}</h4>
                    </CardContent>
                </Card>
            ))}
            {data.length === 0 && <div className="col-span-full text-center p-10">No items found.</div>}
        </div>
    );
}
