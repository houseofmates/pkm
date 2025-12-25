
import { useState } from 'react';
import { useCollections } from '@/hooks/use-collections';
import type { Collection } from '@/types/nocobase';
import { DatabaseWidget } from '@/components/database-widget';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'; // For view selection

interface Widget {
    id: string;
    collectionName: string;
    description: string;
    viewType: string; // Added viewType
    x: number;
    y: number;
}

export function HomePage() {
    const { collections } = useCollections();
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Selection state
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

    const handleAddWidget = (viewType: string) => {
        if (!selectedCollection) return;

        setWidgets(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                collectionName: selectedCollection.name,
                description: selectedCollection.title || selectedCollection.name,
                viewType: viewType,
                x: 100 + (prev.length * 20),
                y: 100 + (prev.length * 20)
            }
        ]);
        setIsOpen(false);
        setSelectedCollection(null);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const getCollection = (name: string) => collections.find(c => c.name === name);

    return (
        <div className="h-full w-full relative overflow-auto bg-grid-small-white/5 dark:bg-grid-small-white/5">
            <div className="absolute top-4 left-4 z-10">
                <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setSelectedCollection(null); }}>
                    <DialogTrigger asChild>
                        <Button className="rounded-full w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg p-0">
                            <Plus className="h-6 w-6" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedCollection ? `Select View for ${selectedCollection.title || selectedCollection.name}` : 'Select Database'}
                            </DialogTitle>
                        </DialogHeader>

                        {!selectedCollection ? (
                            <ScrollArea className="h-[300px] w-full pr-4">
                                <div className="space-y-2">
                                    {collections.map(col => (
                                        <Button
                                            key={col.name}
                                            variant="ghost"
                                            className="w-full justify-start lowercase"
                                            onClick={() => setSelectedCollection(col)}
                                        >
                                            {col.title || col.displayName || col.name}
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 lowercase" onClick={() => handleAddWidget('table')}>
                                        List Table
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 lowercase" onClick={() => handleAddWidget('kanban')}>
                                        Kanban Board
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 lowercase" onClick={() => handleAddWidget('calendar')}>
                                        Calendar
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 lowercase" onClick={() => handleAddWidget('gallery')}>
                                        Gallery
                                    </Button>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCollection(null)} className="w-full text-muted-foreground">
                                    Back to Databases
                                </Button>
                            </div>
                        )}

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
                                initialView={widget.viewType as any}
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
