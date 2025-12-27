import { useState, useEffect } from 'react';
import { Database, Home, Users, Search, Folder, ChevronRight, ChevronDown, Plus, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// import { GlobalSearchDialog } from '@/components/global-search-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollections } from '@/hooks/use-collections';

import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";

import { IconPicker } from './icon-picker-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CollectionDialog } from './collection-dialog';

export interface NavItem {
    id: string;
    type: 'collection' | 'folder';
    name: string;
    children?: string[]; // IDs of children if folder
    collapsed?: boolean;
    icon?: string;
    iconType?: 'lucide' | 'emoji' | 'image';
}

interface NavigationProps {
    activeTab: 'databases' | 'home' | 'headmates';
    onTabChange: (tab: 'databases' | 'home' | 'headmates') => void;
    className?: string;
    onSelectCollection: (name: string | null) => void;
    selectedCollection: string | null;

    // Lifted State Props
    items: NavItem[];
    setItems: (items: NavItem[]) => void; // For local updates like folder creation
}

// --- Sortable Components ---

import { DatabaseContextMenu } from '@/components/database-context-menu';
import { useAppSetting } from '@/hooks/use-app-setting';

export function SortableItem({ id, item, depth = 0, onSelect, selected, onToggle, onUpdate, collection }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id, data: { type: item.type, item } });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(item.name);

    // Global Metadata for Collections
    const [metadata] = useAppSetting<Record<string, { color?: string }>>('collection_metadata', {});
    const metaColor = item.type === 'collection' ? metadata[id]?.color : undefined;

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        paddingLeft: `${depth * 12 + 8}px`
    };

    const handleRename = () => {
        onUpdate(id, { name: renameValue });
        setIsRenaming(false);
    };

    // Render Icon Logic
    const renderIcon = () => {
        if (item.icon && item.iconType) {
            // ... strict icon logic
            if (item.iconType === 'emoji') return <span className="mr-2 text-base leading-none">{item.icon}</span>;
            if (item.iconType === 'image') return <img src={item.icon} alt="icon" className="h-4 w-4 mr-2 object-contain" />;
            if (item.iconType === 'lucide') {
                const Icon = (LucideIcons as any)[item.icon];
                if (Icon) return <Icon className="h-3 w-3 mr-2" style={metaColor ? { color: metaColor } : undefined} />;
            }
        }
        // Fallback
        if (item.type === 'folder') return <Folder className="h-3 w-3 mr-2" />;
        // Collection default icon? usually handled by caller or icon is null?
        // If collection has no icon, we might show nothing or Database icon?
        // Parent Navigation seems to set icon?
        // Usually Collections don't have icons in NavItem unless set manually.
        // Let's rely on text color primarily.
        return null;
    };

    const content = (
        <div className="flex items-center">
            {item.type === 'folder' && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 mr-1"
                    onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                >
                    {item.collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
            )}

            <Button
                variant={selected ? "secondary" : "ghost"}
                className={cn(
                    "flex-1 justify-start text-lg font-normal lowercase h-8 px-2 overflow-hidden",
                    selected && "bg-accent font-medium shadow-sm",
                    item.type === 'folder' && "font-semibold text-muted-foreground"
                )}
                style={metaColor ? { color: metaColor } : undefined}
                onClick={() => onSelect(id)}
            >
                {renderIcon()}
                <span className="truncate">{item.name}</span>
            </Button>
        </div>
    );

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-0.5 group relative">
            <IconPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={(icon, type) => onUpdate(id, { icon, iconType: type })}
            />

            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                {/* Rename logic for folders/items */}
                <DialogContent>
                    <DialogHeader><DialogTitle>rename {item.type}</DialogTitle></DialogHeader>
                    <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRenaming(false)}>cancel</Button>
                        <Button onClick={handleRename}>save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Context Menu Logic */}
            {item.type === 'collection' && collection ? (
                <DatabaseContextMenu collection={collection} onUpdate={() => onUpdate(id, { refresh: true })}>
                    {content}
                </DatabaseContextMenu>
            ) : (
                <ContextMenu>
                    <ContextMenuTrigger>
                        {content}
                    </ContextMenuTrigger>
                    {item.type === 'folder' && (
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => setPickerOpen(true)}>
                                <ImageIcon className="h-4 w-4 mr-2" /> Change Icon
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => setIsRenaming(true)}>
                                <Edit2 className="h-4 w-4 mr-2" /> Rename
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="text-red-500 focus:text-red-500" onClick={() => onUpdate(id, { delete: true })}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </ContextMenuItem>
                        </ContextMenuContent>
                    )}
                </ContextMenu>
            )}
        </div>
    );
}

export function Navigation({ activeTab, onTabChange, className, onSelectCollection, selectedCollection, items, setItems }: NavigationProps) {

    const { collections, refresh } = useCollections();

    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Initialize items from collections if empty (Logic moved to effect here, 
    // but typically parent should handle initialization if it owns state. 
    // We'll keep a sync effect here for convenience if parent passes empty.)
    useEffect(() => {
        if (collections.length === 0) return;

        const existingIds = new Set(items.map(i => String(i.id).toLowerCase()));
        const newCols = collections.filter(c => !existingIds.has(String(c.name).toLowerCase())).map(c => ({
            id: c.name,
            type: 'collection' as const,
            name: c.title || c.name,
        }));

        if (newCols.length > 0) {
            setItems([...items, ...newCols]);
        }
    }, [collections, items, setItems]);

    // Create Folder Logic
    const createFolder = () => {
        if (!newFolderName) return;
        const folderId = `folder_${Date.now()}`;
        const folder: NavItem = {
            id: folderId,
            type: 'folder',
            name: newFolderName,
            children: [],
            collapsed: false
        };
        setItems([folder, ...items]);
        setFolderDialogOpen(false);
        setNewFolderName('');
    };

    // Toggle Folder
    const toggleFolder = (id: string) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, collapsed: !item.collapsed } : item
        ));
    };

    // Delete Folder (Ungroup)
    const deleteFolder = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const tabs = [
        { id: 'databases', icon: Database, label: 'Databases' },
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'headmates', icon: Users, label: 'Headmates' },
    ] as const;

    return (
        <>
            {/* Desktop Sidebar */}
            <div className={cn("hidden md:flex flex-col w-64 border-r bg-card/30 backdrop-blur-sm py-4", className)}>
                {/* Top Icons */}
                <div className="flex items-center justify-around px-2 mb-4">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id && !selectedCollection ? "default" : "ghost"}
                            size="icon"
                            className={cn("rounded-xl w-10 h-10 transition-all", activeTab === tab.id && !selectedCollection && "bg-primary text-primary-foreground shadow-md")}
                            onClick={() => {
                                onTabChange(tab.id as any);
                                onSelectCollection(null);
                            }}
                            title={tab.label}
                        >
                            <tab.icon className="h-5 w-5" />
                        </Button>
                    ))}
                </div>

                <Separator className="mb-4" />

                <div className="px-4 mb-2 flex items-center justify-between">

                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-full hover:bg-muted"
                            title="New Folder"
                            onClick={() => setFolderDialogOpen(true)}
                        >
                            <Folder className="h-3 w-3" />
                        </Button>

                        <CollectionDialog
                            onSuccess={refresh}
                            trigger={
                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-muted" title="create database">
                                    <Plus className="h-3 w-3" />
                                </Button>
                            }
                        />
                    </div>
                </div>

                {/* Custom Modal for Folder Creation */}
                {folderDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-popover border p-4 rounded-lg shadow-lg w-full max-w-xs">
                            <h3 className="font-semibold mb-2">create folder</h3>
                            <Input
                                placeholder="Folder Name"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                autoFocus
                                className="mb-4"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setFolderDialogOpen(false)}>cancel</Button>
                                <Button size="sm" onClick={createFolder}>create</Button>
                            </div>
                        </div>
                    </div>
                )}


                <ScrollArea className="flex-1 px-2">
                    {/* DndContext REMOVED - controlled by Parent */}
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-0.5">
                            {items.map((item) => (
                                <SortableItem
                                    key={item.id}
                                    id={item.id}
                                    item={item}
                                    selected={selectedCollection === item.id}
                                    onSelect={(id: string) => {
                                        if (item.type === 'collection') {
                                            onSelectCollection(id);
                                            onTabChange('databases');
                                        }
                                    }}
                                    onToggle={toggleFolder}
                                    onDelete={deleteFolder}
                                    collection={item.type === 'collection' ? collections.find(c => c.name === item.id) : undefined}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </ScrollArea>

                <div className="mt-auto px-2 pt-4 border-t">
                    <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground border-dashed" onClick={() => { /* TODO: open global search */ }}>
                        <Search className="h-4 w-4" />
                        <span className="text-xs">search / ask ai...</span>
                    </Button>
                </div>
            </div>

            {/* Mobile Nav */}
            <nav className={cn("md:hidden flex items-center justify-around px-4 h-16 border-t bg-background sticky bottom-0 z-50", className)}>
                {tabs.map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "secondary" : "ghost"}
                        size="icon"
                        className={cn("rounded-xl h-10 w-10", activeTab === tab.id && "bg-primary text-primary-foreground")}
                        onClick={() => { onTabChange(tab.id as any); onSelectCollection(null); }}
                    >
                        <tab.icon className="h-5 w-5" />
                    </Button>
                ))}
            </nav>
        </>
    );
}
