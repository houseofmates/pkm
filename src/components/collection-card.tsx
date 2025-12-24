
import type { Collection } from "@/types/nocobase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Database } from "lucide-react";

interface CollectionCardProps {
    collection: Collection;
    className?: string;
}

export function CollectionCard({ collection, className }: CollectionCardProps) {
    const fields = collection.fields || [];
    const fieldCount = fields.length;

    // Check if description looks like a URL (simple check)
    const description = collection.description || '';
    const isCover = description.startsWith('http') || description.startsWith('/');

    return (
        <Card className={cn("h-40 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group flex flex-col", className)}>
            {isCover ? (
                <div className="absolute inset-0">
                    <img
                        src={description}
                        alt={collection.title || collection.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-4 left-4 text-white z-10">
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
                    <CardDescription className="line-clamp-2 text-xs mt-2">
                        {description || (fieldCount === 0 ? 'empty' : `${fieldCount} fields`)}
                    </CardDescription>
                </CardHeader>
            )}
        </Card>
    );
}
