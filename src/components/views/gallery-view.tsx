
import type { ViewProps } from './registry';
import { Card, CardContent } from "@/components/ui/card";

export function GalleryView({ data, loading, collection }: ViewProps) {
    if (loading || !collection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border border-transparent animate-pulse">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm">Loading gallery...</p>
                </div>
            </div>
        );
    }

    // Helper to get image URL from a record field
    const getImageUrl = (record: any, field: any) => {
        if (!field) return null;
        const value = record[field.name];
        if (!value) return null;

        // Handle NocoBase attachment array
        if (Array.isArray(value) && value.length > 0) {
            return value[0].url || value[0].url_thumbnail || null;
        }
        // Handle string URL
        if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/'))) {
            return value;
        }
        return null;
    };

    // Detect fields if not configured
    // Priority: Explicit config -> 'attachment' interface -> name includes 'image'/'cover'
    const imageField = collection?.fields?.find((f: any) => f.interface === 'attachment')
        || collection?.fields?.find((f: any) => f.name.toLowerCase().includes('image') || f.name.toLowerCase().includes('cover'));

    // Priority: Explicit config -> 'title'/'name' -> First input field
    const titleField = collection?.fields?.find((f: any) => f.name === 'title' || f.name === 'name')
        || collection?.fields?.find((f: any) => f.interface === 'input');

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data.map((record, i) => {
                const imageUrl = getImageUrl(record, imageField);
                const title = titleField ? record[titleField.name] : (record.id || 'Untitled');

                return (
                    <Card key={record.id || i} className="overflow-hidden hover:shadow-md transition-all group cursor-pointer border-transparent hover:border-primary/50">
                        <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="Cover"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="text-4xl opacity-10 font-bold uppercase select-none">
                                    {(typeof title === 'string' ? title.charAt(0) : '?')}
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-bold px-2 py-1 border border-white/50 rounded-full lowercase">
                                    View Details
                                </span>
                            </div>
                        </div>
                        <CardContent className="p-3">
                            <h4 className="font-bold truncate text-sm lowercase">{title}</h4>
                            {/* Optional: Show secondary field */}
                        </CardContent>
                    </Card>
                );
            })}
            {data.length === 0 && <div className="col-span-full text-center p-10">No items found.</div>}
        </div>
    );
}
