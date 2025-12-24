
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
            <Card className={cn("h-40 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group", className)}>
                {isCover ? (
                    <div className="absolute inset-0">
                        <img
                            src={collection.description}
                            alt={collection.title || collection.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute bottom-4 left-4 text-white">
                            <h3 className="font-bold text-lg lowercase tracking-tight">{collection.title || collection.name}</h3>
                            <p className="text-xs opacity-80 lowercase">{fieldCount} fields</p>
                        </div>
                    </div>
                ) : (
                    <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                            <Database className="h-5 w-5 text-primary" />
                            <span className="text-xs text-muted-foreground lowercase">{collection.name}</span>
                        </div>
                        <CardTitle className="lowercase tracking-tight">{collection.title || collection.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">
                            {collection.description || `${fieldCount} fields`}
                        </CardDescription>
                    </CardHeader>
                )}
            </Card>
            );
}
            ```
