import { useState, useEffect } from 'react';
import { Database, Home, Users, Search, Folder, ChevronRight, ChevronDown, Plus, Trash2, FileText } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollections } from '@/hooks/use-collections';
import { useNavigate } from 'react-router-dom';
import { formatHeadmateName, getCapitalizationClass } from '@/utils/text-formatting';

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
    ContextMenuTrigger,
    ContextMenuItem,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";

import { IconPicker } from './icon-picker-dialog';
import { RichResourceContextMenuContent } from '@/components/rich-resource-context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CollectionDialog } from '@/features/collections/components/collection-dialog';

export interface NavItem {
    id: string;
    type: 'collection' | 'folder';
    name: string;
    children?: string[]; // IDs of children if folder
    collapsed?: boolean;
    icon?: string;
    iconType?: 'lucide' | 'emoji' | 'image';
    color?: string; // Local color override
}

interface NavigationProps {
    activeTab: 'databases' | 'home' | 'headmates' | 'captures';
    onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'captures') => void;
    className?: string;
    onSelectCollection: (name: string | null) => void;
    selectedCollection: string | null;

    // Lifted State Props
    items: NavItem[];
    setItems: (items: NavItem[]) => void; // For local updates like folder creation
}

// --- Sortable Components ---

import { DatabaseContextMenu } from '@/features/databases/components/database-context-menu';
import { useAppSetting } from '@/hooks/use-app-setting';

export function SortableItem({ id, item, depth = 0, onSelect, selected, onToggle, onUpdate, collection }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id, data: { type: item.type, item } });
    const [pickerOpen, setPickerOpen] = useState(false);

    // Global Metadata for Collections
    const [metadata] = useAppSetting<Record<string, { color?: string }>>('collection_metadata', {});
    // Prefer local item color if set (for folders/docs), then metadata color (for collections)
    const metaColor = item.color || (item.type === 'collection' ? metadata[id]?.color : undefined);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        paddingLeft: `${depth * 12 + 8}px`
    };



    // Render Icon Logic
    const renderIcon = () => {
        // Use current theme color if no local override
        // logic: if item.color is set, use it. if generic, use primary.
        const iconColor = metaColor || 'var(--primary)';

        if (item.icon && item.iconType) {
            // ... strict icon logic
            if (item.iconType === 'emoji') return <span className="mr-2 text-base leading-none">{item.icon}</span>;
            if (item.iconType === 'image') return <img src={item.icon} alt="icon" className="h-4 w-4 mr-2 object-contain" />;
            if (item.iconType === 'lucide') {
                const Icon = (LucideIcons as any)[item.icon];
                if (Icon) return <Icon className="h-4 w-4 mr-2" style={{ color: iconColor }} />;
            }
        }
        // Fallback
        if (item.type === 'folder') return <Folder className="h-4 w-4 mr-2" />;

        // Default for collections/documents without explicit icon
        return <LucideIcons.Database className="h-4 w-4 mr-2" style={{ color: iconColor }} />;
    };

    // ... (inside SortableItem)

    const displayName = formatHeadmateName(item.name);
    const capsClass = getCapitalizationClass(item.name);

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
                    "flex-1 justify-start text-lg font-normal h-8 px-2 overflow-hidden",
                    selected && "bg-primary-soft font-medium shadow-sm text-primary", // User Request: Transparent primary background using soft variable
                    item.type === 'folder' && "font-semibold text-muted-foreground",
                    capsClass ? capsClass : "lowercase" // Default to lowercase unless forced
                )}
                style={metaColor ? { color: metaColor } : undefined}
                onClick={() => onSelect(id)}
            >
                {renderIcon()}
                <span className="truncate">{displayName}</span>
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

            {/* Rename Dialog Removed - using Context Menu Input instead */}


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

                    <RichResourceContextMenuContent
                        currentName={item.name}
                        currentColor={item.color || metaColor}
                        onUpdate={(updates) => onUpdate(id, updates)}
                    >
                        {/* "rename" menu item removed as it opens a dialog we want to avoid */}
                        <ContextMenuSeparator />
                        <ContextMenuItem className="text-red-500 focus:text-red-500" onClick={() => onUpdate(id, { delete: true })}>
                            <Trash2 className="h-4 w-4 mr-2" /> delete
                        </ContextMenuItem>
                    </RichResourceContextMenuContent>
                </ContextMenu>
            )}
        </div>
    );
}

export function Navigation({ activeTab, onTabChange, className, onSelectCollection, selectedCollection, items, setItems }: NavigationProps) {

    const { collections, refresh } = useCollections();
    const navigate = useNavigate();

    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Handle updates to specific items (name, icon, refresh, delete)
    const handleUpdateItem = (id: string, updates: any) => {
        if (updates.refresh) {
            refresh();
            return;
        }

        // Persist Local Documents
        if (id.startsWith('doc_')) {
            const key = `canvas-config-${id.replace('doc_', '')}`;
            try {
                const existing = JSON.parse(localStorage.getItem(key) || '{}');
                const toSave = { ...existing };
                if (updates.name) toSave.title = updates.name;
                if (updates.icon) toSave.icon = updates.icon;
                if (updates.iconType) toSave.iconType = updates.iconType;
                if (updates.color) toSave.color = updates.color;

                if (updates.delete) {
                    localStorage.removeItem(key);
                    localStorage.removeItem(`canvas-content-${id.replace('doc_', '')}`);
                } else {
                    localStorage.setItem(key, JSON.stringify(toSave));
                }
            } catch (e) {
                console.error("Failed to save local doc", e);
            }
        }

        // Persist Local Drawings
        if (id.startsWith('drawing_')) {
            const key = `drawing-config-${id.replace('drawing_', '')}`;
            try {
                const existing = JSON.parse(localStorage.getItem(key) || '{}');
                const toSave = { ...existing };
                if (updates.name) toSave.title = updates.name;
                if (updates.icon) toSave.icon = updates.icon;
                if (updates.iconType) toSave.iconType = updates.iconType;
                if (updates.color) toSave.color = updates.color;

                if (updates.delete) {
                    localStorage.removeItem(key);
                    localStorage.removeItem(`drawing-content-${id.replace('drawing_', '')}`);
                } else {
                    localStorage.setItem(key, JSON.stringify(toSave));
                }
            } catch (e) {
                console.error("Failed to save local drawing", e);
            }
        }

        if (updates.delete) {
            setItems(items.filter(i => i.id !== id));
            return;
        }

        setItems(items.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    };

    // Initialize/Sync items from collections AND Local Documents/Drawings
    useEffect(() => {
        // Load Local Documents (Canvases) and Drawings
        const loadLocalItems = () => {
            const items: NavItem[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('canvas-config-')) {
                    const id = key.replace('canvas-config-', '');
                    try {
                        const config = JSON.parse(localStorage.getItem(key) || '{}');
                        items.push({
                            id: `doc_${id}`,
                            type: 'collection',
                            name: config.title || 'untitled document',
                            icon: 'FileText',
                            iconType: 'lucide'
                        });
                    } catch (e) {
                        // ignore corrupt
                    }
                }
                if (key && key.startsWith('drawing-config-')) {
                    const id = key.replace('drawing-config-', '');
                    try {
                        const config = JSON.parse(localStorage.getItem(key) || '{}');
                        items.push({
                            id: `drawing_${id}`,
                            type: 'collection',
                            name: config.title || 'untitled drawing',
                            icon: 'PenTool',
                            iconType: 'lucide'
                        });
                    } catch (e) {
                        // ignore corrupt
                    }
                }
            }
            return items;
        };

        const localItems = loadLocalItems();

        if (collections.length === 0 && items.length === 0 && localItems.length === 0) return;

        // Filter out internal collections like pkm_canvases
        const visibleCollections = collections.filter((c: any) => c.name !== 'pkm_canvases');
        const collectionNames = new Set(visibleCollections.map((c: any) => String(c.name).toLowerCase()));

        // 1. Filter out items that were collections but are no longer in the DB (or are hidden)
        const filteredItems = items.filter(item => {
            // Always hide pkm_canvases if it was previously added
            if (item.id === 'pkm_canvases') return false;

            if (item.type === 'collection') {
                // If it's a doc, keep it if it exists in localItems
                if (String(item.id).startsWith('doc_')) {
                    return localItems.some(d => d.id === item.id);
                }
                // If it's a drawing, keep it if it exists in localItems
                if (String(item.id).startsWith('drawing_')) {
                    return localItems.some(d => d.id === item.id);
                }
                return collectionNames.has(String(item.id).toLowerCase());
            }
            return true;
        });

        // 2. Add new collections and local items
        const existingIds = new Set(filteredItems.map(i => String(i.id).toLowerCase()));

        const newCols = visibleCollections
            .filter((c: any) => !existingIds.has(String(c.name).toLowerCase()))
            .map((c: any) => ({
                id: c.name,
                type: 'collection' as const,
                name: c.title || c.name,
            }));

        const newLocalItems = localItems.filter(d => !existingIds.has(d.id.toLowerCase()));

        if (newCols.length > 0 || newLocalItems.length > 0 || filteredItems.length !== items.length) {
            setItems([...filteredItems, ...newCols, ...newLocalItems]);
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


    const tabs = [
        { id: 'databases', icon: Database, label: 'databases' },
        { id: 'home', icon: Home, label: 'home' },
        { id: 'captures', icon: LucideIcons.Inbox, label: 'captures' },
        { id: 'headmates', icon: Users, label: 'headmates' },
    ] as const;

    return (
        <>
            {/* Desktop Sidebar */}
            <div className={cn("hidden lg:flex flex-col w-64 py-4", className)} style={{ backgroundColor: '#050505' }}>
                {/* Top Icons */}
                <div className="flex items-center justify-around px-2 mb-2">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-xl w-10 h-10 transition-all nav-icon-btn",
                                activeTab === tab.id && !selectedCollection
                                    ? "text-primary font-bold shadow-none bg-transparent"
                                    : "text-muted-foreground hover:text-primary"
                            )}
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

                <Separator className="mb-2 bg-primary" />

                <div className="px-4 mb-2 flex items-center justify-between">

                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-full hover:bg-muted text-primary"
                            title="new folder"
                            onClick={() => setFolderDialogOpen(true)}
                        >
                            <Folder className="h-3 w-3" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-muted text-primary" title="create new...">
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-[#050505] border-border">
                                <CollectionDialog
                                    onSuccess={refresh}
                                    trigger={
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Database className="h-4 w-4 mr-2 text-primary" />
                                            <span>new database</span>
                                        </DropdownMenuItem>
                                    }
                                />
                                <DropdownMenuItem onSelect={() => {
                                    // Create new document (canvas)
                                    const id = crypto.randomUUID();
                                    const config = { title: 'untitled document' };
                                    localStorage.setItem(`canvas-config-${id}`, JSON.stringify(config));
                                    // Force refresh of local docs
                                    navigate(`/page/${id}`);

                                    // Manually add to items to ensure immediate sidebar update
                                    setItems([...items, {
                                        id: `doc_${id}`,
                                        type: 'collection',
                                        name: config.title,
                                        icon: 'FileText',
                                        iconType: 'lucide'
                                    }]);
                                }}>
                                    <FileText className="h-4 w-4 mr-2 text-primary" />
                                    <span>new document</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                    // Create new drawing (localStorage like Document)
                                    const id = crypto.randomUUID();
                                    const config = { title: 'untitled drawing', type: 'drawing' };
                                    localStorage.setItem(`drawing-config-${id}`, JSON.stringify(config));
                                    navigate(`/drawings/${id}`);

                                    // Manually add to items
                                    setItems([...items, {
                                        id: `drawing_${id}`,
                                        type: 'collection',
                                        name: config.title,
                                        icon: 'PenTool',
                                        iconType: 'lucide'
                                    }]);
                                }}>
                                    <LucideIcons.PenTool className="h-4 w-4 mr-2 text-primary" />
                                    <span>new drawing</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-primary-soft ml-auto text-primary"
                        title="template ingestion engine"
                        onClick={() => navigate('/template')}
                    >
                        <LucideIcons.Wand2 className="h-3 w-3" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-primary-soft ml-2 text-primary"
                        title="infinite canvas database"
                        onClick={() => navigate('/db-canvas')}
                    >
                        <LucideIcons.LayoutDashboard className="h-3 w-3" />
                    </Button>
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


                <ScrollArea className="flex-1 px-2 [&>[data-orientation=vertical]]:!hidden [&>[data-orientation=horizontal]]:!hidden">
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
                                            if (id.startsWith('doc_')) {
                                                // Navigate to Canvas
                                                // We need to bypass the standard onSelectCollection logic which expects a DB name
                                                // Parent should ideally handle this, or we hack it here
                                                const docId = id.replace('doc_', '');
                                                navigate(`/page/${docId}`); // Navigate to Page Mode 
                                                // We don't have navigate here directly, but parent might. 
                                                // Actually, better to maintain SPA state. 
                                                // But Navigation doesn't have `navigate`.
                                                // Let's use `onSelectCollection('DOC:' + docId)` protocol?
                                                // Or just simple window.location for now (safest)
                                                // Or we can import useNavigate from wrapper?
                                                // Navigation is used in RootLayout which has Router.
                                            } else {
                                                onSelectCollection(id);
                                            }
                                        }
                                    }}
                                    onToggle={toggleFolder}
                                    onUpdate={handleUpdateItem}
                                    collection={item.type === 'collection' ? collections.find((c: any) => c.name === item.id) : undefined}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </ScrollArea>

                <div className="mt-auto px-2 pt-4">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-primary border-primary hover:border-primary/50 transition-colors"
                        onClick={() => {
                            // Capture Context for AI
                            const selection = window.getSelection()?.toString();
                            const context = selection && selection.length > 5
                                ? selection
                                : document.body.innerText.slice(0, 3000); // Reasonable limit

                            window.dispatchEvent(new CustomEvent('pkm:open-search', {
                                detail: { context }
                            }));
                        }}
                    >
                        <Search className="h-4 w-4" />
                        <span className="text-xs">search / ask ai...</span>
                    </Button>
                </div>
            </div>

            {/* <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} /> REMOVED in favor of GlobalCommandPalette */}

            {/* Mobile Nav Top Bar - also removed as we use BottomNav now */}
            {/* Keeping it hidden just in case or if className overrides it, but the parent uses BottomNav for mobile */}
        </>
    );
}
