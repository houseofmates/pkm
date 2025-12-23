
import type { Collection } from "@/types/nocobase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Database } from "lucide-react";

interface CollectionCardProps {
    collection: Collection;
    className?: string;
}

export function CollectionCard({ collection, className }: CollectionCardProps) {
    // Use first 3 fields as properties to show
    const displayFields = (collection.fields || []).filter(f => !f.hidden && f.interface !== 'subTable').slice(0, 3);

    return (
        <Card className={cn("overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group h-full flex flex-col", className)}>
            <div className="h-32 bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                {/* Placeholder for Main Image */}
                <Database className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg lowercase font-bold truncate">
                    {collection.title || collection.displayName || collection.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1">
                <div className="space-y-1 text-xs text-muted-foreground">
                    {displayFields.length > 0 ? displayFields.map((field: any) => (
                        <div key={field.name} className="flex items-center gap-2">
                            <span className="font-medium opacity-70 lowercase">{field.uiSchema?.title || field.name}:</span>
                            <span className="truncate opacity-50">{field.interface || 'text'}</span>
                        </div>
                    )) : (
                        <div className="italic opacity-50">no properties</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
