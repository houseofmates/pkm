import { useState, useEffect } from 'react';
import { Database, Home, Users, Search, Folder, ChevronRight, ChevronDown, Plus, Trash2, FileText, Inbox, PenTool, Wand2, LayoutDashboard, Settings, UploadCloud, type LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { GlobalSearchDialog } from '@/components/global-search-dialog';

// helper to safely get lucide icon by name
function getLucideIcon(name: string): LucideIcon | undefined {
  return (Icons as Record<string, LucideIcon>)[name];
}

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { detectFieldType } from '@/utils/csv-detector';
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
import { updateDrawingMeta, deleteDrawing, listPendingDrawings } from '@/features/edgeless/storage';

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
}


// --- sortable components ---

import { DatabaseContextMenu } from '@/features/databases/components/database-context-menu';
import { useAppSetting } from '@/hooks/use-app-setting';

export function SortableItem({ id, item, depth = 0, onSelect, selected, onToggle, onUpdate, collection }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id, data: { type: item.type, item } });
  const [pickerOpen, setPickerOpen] = useState(false);

  // global metadata for collections
  const [metadata] = useAppSetting<Record<string, { color?: string }>>('collection_metadata', {});
  // prefer local item color if set (for folders/docs), then metadata color (for collections)
  const metaColor = item.color || (item.type === 'collection' ? metadata[id]?.color : undefined);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: `${depth * 12 + 8}px`
  };



  // render icon logic
  const renderIcon = () => {
    // use current theme color if no local override
    // logic: if item.color is set, use it. if generic, use primary.
    const iconColor = metaColor || 'var(--primary)';

    if (item.icon && item.iconType) {
      // ... strict icon logic
      if (item.iconType === 'emoji') return <span className="mr-2 text-base leading-none">{item.icon}</span>;
      if (item.iconType === 'image') return <img src={item.icon} alt="icon" className="h-4 w-4 mr-2 object-contain" />;
      if (item.iconType === 'lucide') {
        const Icon = getLucideIcon(item.icon);
        if (Icon) return <Icon className="h-4 w-4 mr-2" style={{ color: iconColor }} />;
      }
    }
    // fallback
    if (item.type === 'folder') return <Folder className="h-4 w-4 mr-2" />;

    // default for collections/documents without explicit icon
    return <Database className="h-4 w-4 mr-2" style={{ color: iconColor }} />;
  };

  // ... (inside sortableitem)

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
          selected && "bg-primary-soft font-medium shadow-sm text-primary", // user request: transparent primary background using soft variable
          item.type === 'folder' && "font-semibold text-muted-foreground",
          capsClass ? capsClass : "lowercase" // default to lowercase unless forced
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

      {/* rename dialog removed - using context menu input instead */}


      {/* context menu logic */}
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
  const [searchOpen, setSearchOpen] = useState(false);

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
            const detection = detectFieldType(h, data.map(row => row[h]), collections.map(c => c.name));
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

    // drawings persist exclusively in indexeddb
    if (id.startsWith('drawing_')) {
      const drawingId = id.replace('drawing_', '');
      if (updates.delete) {
        deleteDrawing(drawingId).catch((e) => {
          console.error('failed to delete drawing', e);
        });
      } else if (updates.name) {
        updateDrawingMeta(drawingId, { title: updates.name }).catch((e) => {
          console.error('failed to update drawing meta', e);
        });
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
        setItems(prev => {
          const nonDrawing = prev.filter(i => !i.id.startsWith('drawing_'));
          return [...nonDrawing, ...dbItems];
        });
      } catch (e) {
        console.error('failed to load drawings from database', e);
      }
    };

    if (collections.length === 0 && items.length === 0) {
      loadDbItems().catch(() => {});
      return;
    }

    // ensure DB items are also fetched on every navigation refresh
    loadDbItems();

    // 0. aggressive pruning: remove names that should never be in the sidebar
    const forbiddenCollections = ['site-pages', 'dupemates-pages', 'server-stats', 'public_blocks', 'public_pages', 'pkm_canvases', 'pkm_settings', 'front_history', 'headmates', 'website', 'dupemates-pages'];

    // filter out pkm_canvases and others from incoming collections
    const visibleCollections = collections.filter((c: any) => !forbiddenCollections.includes(String(c.name).toLowerCase()));
    const collectionNames = new Set(visibleCollections.map((c: any) => String(c.name).toLowerCase()));

    // 1. filter out items that were collections but are no longer in the db (or are hidden/forbidden)
    const filteredItems = items.filter(item => {
      const itemIdLower = String(item.id).toLowerCase();

      // hard block forbidden collections
      if (forbiddenCollections.includes(itemIdLower)) return false;

      if (item.type === 'collection') {
        // if it's a doc, keep it if it exists in local items
        if (itemIdLower.startsWith('doc_')) {
          return items.some(d => d.id === item.id);
        }
        // if it's a drawing, always keep it; metadata persistence handled elsewhere
        if (itemIdLower.startsWith('drawing_')) {
          return true;
        }
        return collectionNames.has(itemIdLower);
      }
      return true;
    });

    // 2. add new collections and local items
    const existingIds = new Set(filteredItems.map(i => String(i.id).toLowerCase()));

    const newCols = visibleCollections
      .filter((c: any) => !existingIds.has(String(c.name).toLowerCase()))
      .map((c: any) => ({
        id: c.name,
        type: 'collection' as const,
        name: c.title || c.name,
      }));

    const newLocalItems = items.filter(d => d.id.startsWith('doc_') && !existingIds.has(d.id.toLowerCase()));

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

  return (
    <>
      {/* desktop sidebar */}
      <div className={cn("hidden lg:flex flex-col w-64 py-4 sidebar-container", className)} style={{ backgroundColor: '#050505' }}>
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
                  ? "text-primary font-bold shadow-none bg-transparent"
                  : "text-muted-foreground hover:text-primary"
              )}
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
                  // create new document (canvas)
                  const id = crypto.randomUUID();
                  const config = { title: 'untitled document' };
                  localStorage.setItem(`canvas-config-${id}`, JSON.stringify(config));
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
                    console.error('failed to create new drawing metadata', e);
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
            <label className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted text-primary cursor-pointer" title="upload csv">
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
          setOpen={setCsvDialogOpen}
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


        <ScrollArea className="flex-1 px-2 [&>[data-orientation=vertical]]:!hidden [&>[data-orientation=horizontal]]:!hidden">
          {/* dndcontext removed - controlled by parent */}
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
                        // navigate to canvas
                        // we need to bypass the standard onselectcollection logic which expects a db name
                        // parent should ideally handle this, or we hack it here
                        const docId = id.replace('doc_', '');
                        navigate(`/page/${docId}`); // navigate to page mode
                        // we don't have navigate here directly, but parent might.
                        // actually, better to maintain spa state.
                        // but navigation doesn't have `navigate`.
                        // let's use `onselectcollection('doc:' + docid)` protocol?
                        // or just simple window.location for now (safest)
                        // or we can import usenavigate from wrapper?
                        // navigation is used in rootlayout which has router.
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

        <div className="mt-auto px-2 pt-4 !border-none shadow-none">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-muted-foreground border-solid hover:bg-white/5 transition-colors"
            onClick={() => setSearchOpen(true)}
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


      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* mobile nav top bar - also removed as we use bottomnav now */}
      {/* keeping it hidden just in case or if classname overrides it, but the parent uses bottomnav for mobile */}
    </>
  );
}
