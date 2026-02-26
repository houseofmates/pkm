import React, { useState, useEffect, useRef } from 'react';
import { Database, Home, Users, Search, Folder, ChevronRight, ChevronDown, Plus, Trash2, FileText, Inbox, PenTool, Wand2, LayoutDashboard, Settings, UploadCloud, type LucideIcon } from 'lucide-react';

// Dynamic icon loader for Lucide icons
const lucideIconMap: Record<string, LucideIcon> = {};
function getLucideIcon(name: string): LucideIcon | undefined {
  return lucideIconMap[name];
}

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { detectFieldType } from '@/utils/csv-detector';
import { useCollections } from '@/hooks/use-collections';
import { useNavigate } from 'react-router-dom';
import { formatHeadmateName, getCapitalizationClass } from '@/utils/text-formatting';

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { updateDrawingMeta, deleteDrawing, listPendingDrawings } from '@/features/edgeless/storage';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';

export interface NavItem {
  id: string;
  type: 'collection' | 'folder';
  name: string;
  children?: string[]; // IDs of children if folder
  collapsed?: boolean;
  icon?: string;
  iconType?: 'lucide' | 'emoji' | 'image';
  color?: string; // local color override
}

interface NavigationProps {
  activeTab: 'databases' | 'home' | 'headmates' | 'board' | 'captures';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'board' | 'captures') => void;
  className?: string;
  onSelectCollection: (name: string | null) => void;
  selectedCollection: string | null;

  // lifted state props
  items: NavItem[];
  setItems: (items: NavItem[]) => void; // for local updates like folder creation
  accentBg?: string;
}


// --- sortable components ---

import { DatabaseContextMenu } from '@/features/databases/components/database-context-menu';
import { useAppSetting } from '@/hooks/use-app-setting';

export function SortableItem({ id, item, depth = 0, onSelect, selected, onToggle, onUpdate, collection }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id, data: { type: item.type, item } });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // global metadata for collections
  const [metadata] = useAppSetting<Record<string, { color?: string }>>('collection_metadata', {});
  // prefer local item color if set (for folders/docs), then metadata color (for collections)
  const metaColor = item.color || (item.type === 'collection' ? metadata[id]?.color : undefined);

  // accentBg passed from Navigation
  const accentBg = typeof window !== 'undefined' && (window as any).accentBg ? (window as any).accentBg : undefined;

  // calculate a custom highlight color for this specific item (hover or selected)
  function getHighlightColor(baseColor: string | undefined) {
    if (!baseColor) return accentBg; // fallback to fronter accent
    if (baseColor.startsWith('#')) {
      const hex = baseColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }
    return baseColor.replace(/rgb\(([^)]+)\)/, 'rgba($1, 0.15)');
  }

  const highlightColor = getHighlightColor(metaColor);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: `${depth * 12 + 8}px`,
    touchAction: 'none',
    background: (selected || hovered) ? highlightColor : undefined,
    borderRadius: '0.5rem'
  };


  // render icon logic
  const renderIcon = () => {
    // use current theme color if no local override
    // logic: if item.color is set, use it. if generic, use primary.
    // no explicit icon color, let CSS inherit from the button/text color

    if (item.icon && item.iconType) {
      // ... strict icon logic
      if (item.iconType === 'emoji') return <span className="mr-2 text-xl leading-none flex-shrink-0">{item.icon}</span>;
      if (item.iconType === 'image') return <img src={item.icon} alt="icon" className="h-6 w-6 mr-2 object-contain flex-shrink-0" />;
      if (item.iconType === 'lucide') {
        const Icon = getLucideIcon(item.icon);
        if (Icon) return <Icon className="h-6 w-6 mr-2 flex-shrink-0" />;
      }
    }
    // fallback
    if (item.type === 'folder') return <Folder className="h-6 w-6 mr-2 flex-shrink-0" />;

    // default for collections/documents without explicit icon
    return <Database className="h-6 w-6 mr-2 flex-shrink-0" />;
  };

  const displayName = formatHeadmateName(item.name);
  const capsClass = getCapitalizationClass(item.name);

  const content = (
    <div className="flex items-center">
      {/* drag handle removed - now using hold-to-drag on the entire item */}

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
        variant="ghost"
        className={cn(
          "flex-1 justify-start text-base font-normal h-8 px-2 overflow-hidden hover:bg-transparent", // bumped up font size for better readability
          selected && "font-medium shadow-none",
          item.type === 'folder' && "font-semibold text-muted-foreground",
          capsClass ? capsClass : "lowercase"
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
    <div
      ref={setNodeRef}
      style={style}
      className="mb-0.5 group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...attributes}
      {...listeners}
    >
      <IconPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(icon, type) => onUpdate(id, { icon, iconType: type })}
      />

      {/* rename dialog removed - using context menu input instead */}


      {/* context menu logic */}
      {item.type === 'collection' && collection ? (
        <DatabaseContextMenu
          collection={collection}
          onUpdate={() => onUpdate(id, { refresh: true })}
          onDelete={() => onUpdate(id, { delete: true })}
        >
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

export function Navigation({ activeTab, onTabChange, className, onSelectCollection, selectedCollection, items, setItems, accentBg }: NavigationProps) {

  // track recently deleted items to prevent useEffect from re-adding them
  const deletedItemsRef = useRef<Set<string>>(new Set());

  const { collections, refresh } = useCollections();
  const navigate = useNavigate();

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // csv upload helpers (simple button no longer uploads directly)
  const [csvInputKey, setCsvInputKey] = useState(0);
  const [importCsvData, setImportCsvData] = useState<any[]>([]);
  const [importCsvFields, setImportCsvFields] = useState<any[]>([]);
  const [importDisplayName, setImportDisplayName] = useState('');
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  useEffect(() => {
    if (!csvDialogOpen) {
      setImportCsvData([]);
      setImportCsvFields([]);
      setImportDisplayName('');
    }
  }, [csvDialogOpen]);

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // parse csv locally then open create dialog with preloaded data
    const Papa = await import('papaparse').then(m => m.default);
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.data && results.data.length > 0) {
          const data = results.data as any[];
          const headers = Object.keys(data[0]);
          const fields = headers.map(h => {
            const detection = detectFieldType(h, data.map(row => row[h]), collections.map((c: any) => c.name));
            return {
              name: h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
              title: h,
              interface: detection.type,
              target: detection.target,
              detectionReason: detection.reason,
              detectionConfidence: detection.confidence
            };
          });
          setImportCsvData(data);
          setImportCsvFields(fields);
          setImportDisplayName(file.name.replace(/\.[^/.]+$/, ""));
          setCsvDialogOpen(true);
        }
      },
      error: (err: any) => {
        alert('failed to parse csv: ' + err.message);
      }
    });
    setCsvInputKey(k => k + 1);
  };

  // handle updates to specific items (name, icon, refresh, delete)
  const handleUpdateItem = (id: string, updates: any) => {
    if (updates.refresh) {
      refresh();
      return;
    }

    // persist local documents only; drawings are db-only now
    if (id.startsWith('doc_')) {
      const key = `canvas-config-${id.replace('doc_', '')}`;
      try {
        const existing = JSON.parse(storageManager.getItem(key) || '{}');
        const toSave = { ...existing };
        if (updates.name) toSave.title = updates.name;
        if (updates.icon) toSave.icon = updates.icon;
        if (updates.iconType) toSave.iconType = updates.iconType;
        if (updates.color) toSave.color = updates.color;

        if (updates.delete) {
          storageManager.removeItem(key);
          storageManager.removeItem(`canvas-content-${id.replace('doc_', '')}`);
        } else {
          storageManager.setItem(key, JSON.stringify(toSave));
        }
      } catch (e) {
        secureLogger.error("Failed to save local doc", e);
      }
    }

    // drawings persist exclusively in indexeddb
    if (id.startsWith('drawing_')) {
      const drawingId = id.replace('drawing_', '');
      if (updates.delete) {
        deleteDrawing(drawingId).catch((e) => {
          secureLogger.error('failed to delete drawing', e);
        });
      } else if (updates.name) {
        updateDrawingMeta(drawingId, { title: updates.name }).catch((e) => {
          secureLogger.error('failed to update drawing meta', e);
        });
      }
    }

    // for collections (databases), refresh from server to ensure sync
    if (!id.startsWith('doc_') && !id.startsWith('drawing_') && !id.startsWith('folder_')) {
      if (updates.delete) {
        // track this deletion so the useEffect won't re-add it
        deletedItemsRef.current.add(id.toLowerCase());
        // immediately remove from local state for instant feedback
        setItems(items.filter(i => i.id !== id));
        // refresh after a delay to allow the server delete to complete
        setTimeout(() => {
          refresh();
          // clear the deleted tracker after sync window
          setTimeout(() => {
            deletedItemsRef.current.delete(id.toLowerCase());
          }, 5000);
        }, 1000);
        return;
      }
    }

    if (updates.delete) {
      setItems(items.filter(i => i.id !== id));
      return;
    }

    // If renaming a collection, update both .name and .title fields for sidebar display
    if (updates.name) {
      setItems(items.map(item =>
        item.id === id ? { ...item, name: updates.name, title: updates.name, ...updates } : item
      ));
    } else {
      setItems(items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    }
  };

  // initialize/sync items from collections and local documents/drawings
  useEffect(() => {
    // load drawings stored in indexeddb (and documents separately)
    const loadDbItems = async () => {
      try {
        const drawings = await listPendingDrawings();
        const dbItems: NavItem[] = drawings.map((d: any) => ({
          id: `drawing_${d.id}`,
          type: 'collection',
          name: (d.title as string) || 'untitled drawing',
          icon: 'PenTool',
          iconType: 'lucide',
        }));
        const nonDrawing = items.filter((i: NavItem) => !i.id.startsWith('drawing_'));
        setItems([...nonDrawing, ...dbItems]);
      } catch (e) {
        secureLogger.error('failed to load drawings from database', e);
      }
    };

    if (collections.length === 0 && items.length === 0) {
      loadDbItems().catch(() => { });
      return;
    }

    // ensure DB items are also fetched on every navigation refresh
    loadDbItems();

    // 0. aggressive pruning: remove names that should never be in the sidebar
    const forbiddenCollections = ['site-pages', 'dupemates-pages', 'server-stats', 'public_blocks', 'public_pages', 'pkm_canvases', 'pkm_settings', 'front_history', 'website'];

    // filter out pkm_canvases and others from incoming collections
    const visibleCollections = collections.filter((c: any) => !forbiddenCollections.includes(String(c.name).toLowerCase()));

    // 1. only add new collections that don't exist in items yet
    // don't remove items automatically - only explicit user delete should remove
    const existingIds = new Set(items.map(i => String(i.id).toLowerCase()));

    const newCols = visibleCollections
      .filter((c: any) => {
        const nameLC = String(c.name).toLowerCase();
        // skip if already in items or was recently deleted
        return !existingIds.has(nameLC) && !deletedItemsRef.current.has(nameLC);
      })
      .map((c: any) => ({
        id: c.name,
        type: 'collection' as const,
        name: c.title || c.name,
      }));

    // 2. add new local docs that aren't in items yet
    const newLocalItems = items.filter(d => d.id.startsWith('doc_') && !existingIds.has(d.id.toLowerCase()));

    // 3. remove only forbidden collections
    const filteredItems = items.filter(item => {
      const itemIdLower = String(item.id).toLowerCase();
      return !forbiddenCollections.includes(itemIdLower);
    });

    if (newCols.length > 0 || newLocalItems.length > 0 || filteredItems.length !== items.length) {
      setItems([...filteredItems, ...newCols, ...newLocalItems]);
    }
  }, [collections, items, setItems]);

  // create folder logic
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

  // toggle folder
  const toggleFolder = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, collapsed: !item.collapsed } : item
    ));
  };


  const tabs = [
    { id: 'databases', icon: Database, label: 'databases' },
    { id: 'home', icon: Home, label: 'home' },
    { id: 'captures', icon: Inbox, label: 'captures' },
    { id: 'headmates', icon: Users, label: 'headmates' },
  ] as const;

  // expose accentBg globally for SortableItem
  if (typeof window !== 'undefined') (window as any).accentBg = accentBg;
  return (
    <>
      {/* desktop sidebar */}
      <div className={cn("hidden lg:flex flex-col w-64 h-full min-h-0 py-4 sidebar-container", className)} style={{ backgroundColor: '#050505' }}>
        {/* top icons */}
        <div className="flex items-center justify-around px-2 mb-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-xl w-10 h-10 transition-all nav-icon-btn",
                activeTab === tab.id && !selectedCollection
                  ? "text-primary font-bold shadow-none"
                  : "text-muted-foreground hover:text-primary"
              )}
              style={activeTab === tab.id && !selectedCollection ? { background: accentBg } : undefined}
              onClick={() => {
                onTabChange(tab.id as any);
                onSelectCollection(null);
              }}
              title={tab.label} aria-label={tab.label}
            >
              <tab.icon className="h-5 w-5" />
            </Button>
          ))}
        </div>
        <div className="mx-4 mb-2 h-[1px] rounded-full" style={{ backgroundColor: 'hsl(var(--primary))', opacity: 0.3 }} />

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
                  // create new document (canvas)
                  const id = crypto.randomUUID();
                  const config = { title: 'untitled document' };
                  storageManager.setItem(`canvas-config-${id}`, JSON.stringify(config));
                  // force refresh of local docs
                  navigate(`/page/${id}`);

                  // manually add to items to ensure immediate sidebar update
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
                <DropdownMenuItem onSelect={async () => {
                  // create new drawing in idb and navigate
                  const id = crypto.randomUUID();
                  const title = 'untitled drawing';
                  try {
                    await updateDrawingMeta(id, { title, syncState: 'pending' });
                  } catch (e) {
                    secureLogger.error('failed to create new drawing metadata', e);
                  }
                  navigate(`/drawings/${id}`);

                  // manually add to items so sidebar updates immediately
                  setItems([...items, {
                    id: `drawing_${id}`,
                    type: 'collection',
                    name: title,
                    icon: 'PenTool',
                    iconType: 'lucide'
                  }]);
                }}>
                  <PenTool className="h-4 w-4 mr-2 text-primary" />
                  <span>new drawing</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* csv uploader button */}
            <label className="relative flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted text-primary cursor-pointer" title="upload csv">
              <input
                key={csvInputKey}
                type="file"
                accept=".csv"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleCsvChange}
              />
              <UploadCloud className="h-3 w-3" />
            </label>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full hover:bg-primary-soft ml-auto text-primary"
            title="template ingestion engine"
            onClick={() => navigate('/template')}
          >
            <Wand2 className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full hover:bg-primary-soft ml-2 text-primary"
            title="infinite canvas database"
            onClick={() => navigate('/db-canvas')}
          >
            <LayoutDashboard className="h-3 w-3" />
          </Button>
        </div>

        {/* custom modal for folder creation */}
        {folderDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-popover border p-4 rounded-lg shadow-lg w-full max-w-xs">
              <h3 className="font-semibold mb-2">create folder</h3>
              <Input
                placeholder="folder name"
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

        {/* csv import dialog opened via sidebar button */}
        <CollectionDialog
          open={csvDialogOpen}
          onOpenChange={setCsvDialogOpen}
          onSuccess={() => {
            setCsvDialogOpen(false);
            setImportCsvData([]);
            setImportCsvFields([]);
            setImportDisplayName('');
            refresh();
          }}
          initialTitle={importDisplayName}
          initialCsvData={importCsvData}
          initialCsvFields={importCsvFields}
        />


        {/* scrollable list: flex-1 takes available space, h-0 forces proper flex shrinking */}
        <div className="flex-1 w-full h-0 min-h-0 px-2 overflow-y-auto">

          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5 pb-4">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  id={item.id}
                  item={item}
                  selected={selectedCollection === item.id}
                  onSelect={(id: string) => {
                    if (id.startsWith('doc_')) {
                      const docId = id.replace('doc_', '');
                      navigate(`/page/${docId}`);
                      onSelectCollection(id);
                    } else if (id.startsWith('drawing_')) {
                      const drawingId = id.replace('drawing_', '');
                      navigate(`/drawings/${drawingId}`);
                      onSelectCollection(id);
                    } else {
                      onSelectCollection(id);
                    }
                  }}
                  onToggle={toggleFolder}
                  onUpdate={handleUpdateItem}
                  collection={item.type === 'collection' ? collections.find((c: any) => c.name === item.id) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <div className="mt-auto px-2 pt-4 !border-none shadow-none">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-muted-foreground border-solid hover:bg-white/5 transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('pkm:open-search'))}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">search / ask ai...</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-full justify-start gap-2 px-3 mt-1 text-muted-foreground hover:text-primary hover:bg-white/5 transition-colors border-none shadow-none"
            onClick={() => navigate('/settings')}
            title="settings"
          >
            <Settings className="h-4 w-4" />
            <span className="text-xs">settings</span>
          </Button>
        </div>
      </div>




      {/* mobile nav top bar - also removed as we use bottomnav now */}
      {/* keeping it hidden just in case or if classname overrides it, but the parent uses bottomnav for mobile */}
    </>
  );
}
