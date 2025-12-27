
import { useState, useEffect } from 'react';
import type { Collection } from '@/hooks/use-collections';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Database, Plus, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatabaseContextMenu } from '@/components/database-context-menu';
import { toast } from 'sonner';
import { CollectionDialog } from '@/components/collection-dialog';
import { useCollections } from '@/hooks/use-collections';

interface SidebarProps {
    collections: Collection[];
    selectedCollection: Collection | null;
    onSelect: (collection: Collection) => void;
    className?: string;
}

interface FolderState {
    id: string;
    name: string;
    collectionNames: string[];
    isExpanded: boolean;
}

export function Sidebar({ collections, selectedCollection, onSelect, className }: SidebarProps) {
    const { refresh } = useCollections();
    const [folders, setFolders] = useState<FolderState[]>([]);

    // Initialize folders on load
    useEffect(() => {
        const saved = localStorage.getItem('pkm-folders');
        if (saved) {
            setFolders(JSON.parse(saved));
        } else {
            // Default initialization: All in "General"
            setFolders([{
                id: 'general',
                name: 'General',
                collectionNames: collections.map(c => c.name),
                isExpanded: true
            }]);
        }
    }, [collections.length]); // Re-run if collections change count (simplified)

    const toggleFolder = (folderId: string) => {
        setFolders(prev => {
            const next = prev.map(f => f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f);
            localStorage.setItem('pkm-folders', JSON.stringify(next));
            return next;
        });
    };

    const handleCreateFolder = () => {
        const name = prompt("Folder Name:");
        if (!name) return;
        setFolders(prev => {
            const next = [...prev, { id: Date.now().toString(), name, collectionNames: [], isExpanded: true }];
            localStorage.setItem('pkm-folders', JSON.stringify(next));
            return next;
        });
    };

    // Local handlers removed in favor of DatabaseContextMenu

    // Helper to get collections in a folder
    const getFolderCollections = (folder: FolderState) => {
        return folder.collectionNames
            .map(name => collections.find(c => c.name === name))
            .filter((c): c is Collection => !!c);
    };

    // Helper to find unassigned collections (if new ones appeared)
    const getUnassignedCollections = () => {
        const assigned = new Set(folders.flatMap(f => f.collectionNames));
        return collections.filter(c => !assigned.has(c.name));
    };

    const unassigned = getUnassignedCollections();

    return (
        <div className={cn("pb-12 w-64 border-r bg-background/50 backdrop-blur flex flex-col", className)}>
            <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
                <div className="px-3 py-2 flex-1 flex flex-col">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <h2 className="text-lg font-semibold tracking-tight text-primary">
                            databases
                        </h2>
                        <div className="flex items-center gap-1">
                            <CollectionDialog
                                onSuccess={refresh}
                                trigger={
                                    <Button variant="ghost" size="icon" className="h-6 w-6" title="create database">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                }
                            />
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={handleCreateFolder} title="add folder">
                                <Folder className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-1">
                        <div className="space-y-4 p-2">
                            {/* Render Folders */}
                            {folders.map(folder => (
                                <div key={folder.id} className="space-y-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start font-semibold text-muted-foreground hover:text-foreground"
                                        onClick={() => toggleFolder(folder.id)}
                                    >
                                        {folder.isExpanded ? <ChevronDown className="mr-2 h-3 w-3" /> : <ChevronRight className="mr-2 h-3 w-3" />}
                                        <Folder className="mr-2 h-3 w-3" />
                                        {folder.name}
                                    </Button>

                                    {folder.isExpanded && (
                                        <div className="pl-4 space-y-1 border-l ml-2 border-border/50">
                                            {getFolderCollections(folder).map(collection => (
                                                <DatabaseContextMenu
                                                    key={collection.name}
                                                    collection={collection}
                                                    onUpdate={refresh}
                                                >
                                                    <Button
                                                        variant={selectedCollection?.name === collection.name ? "secondary" : "ghost"}
                                                        size="sm"
                                                        className="w-full justify-start font-normal h-8"
                                                        onClick={() => onSelect(collection)}
                                                    >
                                                        <Database className="mr-2 h-3 w-3 opacity-70" />
                                                        <span className="truncate">{collection.title || collection.displayName || collection.name}</span>
                                                    </Button>
                                                </DatabaseContextMenu>
                                            ))}
                                            {getFolderCollections(folder).length === 0 && (
                                                <div className="text-xs text-muted-foreground px-2 py-1 italic">empty</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Render Unassigned */}
                            {unassigned.length > 0 && (
                                <div className="space-y-1 pt-4 border-t">
                                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">unassigned</h3>
                                    {unassigned.map(collection => (
                                        <DatabaseContextMenu
                                            key={collection.name}
                                            collection={collection}
                                            onUpdate={refresh}
                                        >
                                            <Button
                                                variant={selectedCollection?.name === collection.name ? "secondary" : "ghost"}
                                                size="sm"
                                                className="w-full justify-start font-normal h-8"
                                                onClick={() => onSelect(collection)}
                                            >
                                                <Database className="mr-2 h-3 w-3 opacity-70" />
                                                <span className="truncate">{collection.title || collection.displayName || collection.name}</span>
                                            </Button>
                                        </DatabaseContextMenu>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
