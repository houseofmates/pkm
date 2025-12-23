
import { useState } from 'react';
import { useCollections } from '@/hooks/use-collections';
import type { Collection } from '@/types/nocobase';
import { DatabaseWidget } from '@/components/database-widget';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


interface Widget {
    id: string;
    collectionName: string;
    description: string;
    x: number;
    y: number;
}

export function HomePage() {
    const { collections } = useCollections();
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const handleAddWidget = (collection: Collection) => {
        setWidgets(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                collectionName: collection.name,
                description: collection.title || collection.name,
                x: 100 + (prev.length * 20), // Simple cascade
                y: 100 + (prev.length * 20)
            }
        ]);
        setIsOpen(false);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const getCollection = (name: string) => collections.find(c => c.name === name);

    return (
        <div className="h-full w-full relative overflow-auto bg-grid-small-white/5 dark:bg-grid-small-white/5">
            <div className="absolute top-4 left-4 z-10">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-xl">
                            <Plus className="mr-2 h-4 w-4" />
                            Import Database
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Select Database</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[300px] w-full pr-4">
                            <div className="space-y-2">
                                {collections.map(col => (
                                    <Button
                                        key={col.name}
                                        variant="ghost"
                                        className="w-full justify-start lowercase"
                                        onClick={() => handleAddWidget(col)}
                                    >
                                        {col.title || col.displayName || col.name}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Canvas Area */}
            <div className="min-w-[2000px] min-h-[2000px] relative p-8">
                {widgets.map(widget => {
                    const col = getCollection(widget.collectionName);
                    if (!col) return null;

                    return (
                        <div
                            key={widget.id}
                            style={{
                                position: 'absolute',
                                left: widget.x,
                                top: widget.y,
                                transition: 'all 0.2s ease-out'
                            }}
                            className="bg-card rounded-lg shadow-xl"
                        >
                            <DatabaseWidget
                                collection={col}
                                onRemove={() => handleRemoveWidget(widget.id)}
                            />
                        </div>
                    );
                })}
                {widgets.length === 0 && (
                    <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2 text-muted-foreground opacity-20 text-4xl font-bold lowercase">
                        infinite canvas
                    </div>
                )}
            </div>
        </div>
    );
}
