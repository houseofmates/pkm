import React, { useState, useEffect, useRef } from 'react';
import { Database, Home, Users, Search, MessageCircle, Folder, ChevronRight, ChevronDown, Plus, Trash2, FileText, Inbox, PenTool, Wand2, LayoutDashboard, Settings, UploadCloud, BookOpen, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Dynamic icon loader for Lucide icons
function getLucideIcon(name: string): LucideIcon | undefined {
  return (LucideIcons as unknown as Record<string, unknown>)[name] as LucideIcon | undefined;
}

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { detectFieldType } from '@/utils/csv-detector';
import { useCollections } from '@/hooks/use-collections';
import { useNavigate } from 'react-router-dom';
import { formatHeadmateName, getCapitalizationClass } from '@/utils/text-formatting';
import { getSidebarColors } from '@/utils/getSidebarColors';

function getStoredDeleted(): Set<string> {
  try {
    const raw = localStorage.getItem('sidebar_deleted_collections');
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {
    console.warn('Failed to load deleted collections from storage:', e);
  }
  return new Set();
}

function storeDeleted(ids: Set<string>) {
  try {
    localStorage.setItem('sidebar_deleted_collections', JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Failed to save deleted collections:', e);
  }
}

function addStoredDeleted(id: string) {
  const s = getStoredDeleted();
  s.add(id.toLowerCase());
  storeDeleted(s);
}

function removeStoredDeleted(id: string) {
  const s = getStoredDeleted();
  if (s.delete(id.toLowerCase())) storeDeleted(s);
}

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
import { toast } from 'sonner';

export interface NavItem {
  id: string;
  type: 'collection' | 'folder';
  name: string;
  children?: string[]; // IDs of children if folder
  collapsed?: boolean;
  icon?: string;
  iconType?: 'lucide' | 'emoji' | 'image';
  color?: string; // local color override (deprecated: use sidebar color sync instead)
}

interface NavigationProps {
  activeTab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar') => void;
  className?: string;
  onSelectCollection: (name: string | null) => void;
  selectedCollection: string | null;

  // lifted state props
  items: NavItem[];
  // setItems can be omitted for read-only renders (e.g. mobile drawer that just displays the list)
  setItems?: (items: NavItem[] | ((prev: NavItem[]) => NavItem[])) => void; // for local updates like folder creation
}

function NavIconButton({ tab, isActive, onClick }: { tab: any, isActive: boolean, onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "rounded-xl w-10 h-10 transition-all nav-icon-btn",
        isActive
          ? "text-primary font-bold shadow-none"
          : "text-muted-foreground hover:text-primary"
      )}
      style={(isActive || hovered) ? { backgroundColor: 'var(--primary-soft)' } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      title={tab.label}
      aria-label={tab.label}
    >
      <tab.icon className="h-5 w-5" />
    </Button>
  );
}


// --- sortable components ---

import { DatabaseContextMenu } from '@/features/databases/components/database-context-menu';
import { useAppSetting } from '@/hooks/use-app-setting';
import { useSidebarColors } from '@/hooks/use-sidebar-colors';

export function SortableItem({ id, item, depth = 0, onSelect, selected, onToggle, onUpdate, collection, syncedColors }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id, data: { type: item.type, item } });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);


  // global metadata for collections (legacy localStorage fallback)
  const [metadata] = useAppSetting<Record<string, { color?: string }>>('collection_metadata', {});
  // prefer synced colors from nocobase (cross-device sync), then local item color, then legacy metadata
  const metaColor = syncedColors?.[id]?.color || item.color || (item.type === 'collection' ? metadata[id]?.color : undefined);

  // determine highlight color based on item type
  function getHighlightColor(opacity = 0.22) {
    // sidebar items: use their own color if available, else accent
    const base = metaColor || '#f5af12';
    if (base.startsWith('#')) {
      // Convert hex to rgba
      const hex = base.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    if (base.startsWith('rgb')) {
      // Replace any existing alpha with desired opacity
      if (base.startsWith('rgba')) {
        return base.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${opacity})`);
      }
      return base.replace(/rgb\(([^)]+)\)/, `rgba($1,${opacity})`);
    }
    // fallback
    return `rgba(245, 175, 18, ${opacity})`;
  }

  const highlightColor = getHighlightColor(0.22);

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

export function Navigation({ activeTab, onTabChange, className, onSelectCollection, selectedCollection, items, setItems }: NavigationProps) {
  // provide a no-op setter if the caller didn't supply one (mobile drawer sometimes omits it)
  const safeSetItems = setItems ?? (() => {});

  // synced colors from nocobase (cross-device persistence)
  const { colors: syncedColors, updateMetadata, isUpdating: isSyncingColors } = useSidebarColors({
    pollIntervalMs: 30000 // sync every 30 seconds
  });

  // track recently deleted items to prevent useEffect from re-adding them
  // stored in a ref so it does not cause re-renders or effect dependency churn
  const deletedItemsRef = useRef<Set<string>>(new Set());

  const { collections, refresh } = useCollections();
  const navigate = useNavigate();

  // hide the internal dashboard background drawing from the sidebar
  const [homeCanvasDrawingId] = useAppSetting<string | null>('dashboard_home_drawing_id', null);

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
        toast.error('failed to parse csv: ' + err.message);
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

    // sync color/icon changes to nocobase for cross-device persistence
    if (updates.color || updates.icon || updates.iconType) {
      const itemType = updates.itemType || (id.startsWith('folder_') ? 'folder' : id.startsWith('doc_') ? 'document' : id.startsWith('drawing_') ? 'drawing' : 'collection');
      
      // save to nocobase (async, fire and forget with error handling)
      updateMetadata(id, {
        color: updates.color,
        icon: updates.icon,
        iconType: updates.iconType
      }).catch((e) => {
        secureLogger.warn('[navigation] failed to sync color to server:', e);
      });
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
        // color is now synced via nocobase, but keep local copy for offline
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
        addStoredDeleted(id);
        // immediately remove from local state for instant feedback
        safeSetItems(items.filter(i => i.id !== id));
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
      safeSetItems(items.filter(i => i.id !== id));
      return;
    }

    // If renaming a collection, update both .name and .title fields for sidebar display
    if (updates.name) {
      safeSetItems(items.map(item =>
        item.id === id ? { ...item, name: updates.name, title: updates.name, ...updates } : item
      ));
    } else {
      safeSetItems(items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    }
  };

  // initialize/sync items from collections and local documents/drawings
  useEffect(() => {
    if (collections.length === 0) return;

    const forbiddenCollections = ['site-pages', 'dupemates-pages', 'server-stats', 'public_blocks', 'public_pages', 'pkm_canvases', 'pkm_settings', 'front_history', 'website'];
    const visibleCollections = collections.filter((c: any) => !forbiddenCollections.includes(String(c.name).toLowerCase()));

    // load drawings from indexeddb, then merge everything in one atomic update
    const syncAll = async () => {
      let drawingItems: NavItem[] = [];
      try {
        const drawings = await listPendingDrawings();
        drawingItems = drawings.map((d: any) => ({
          id: `drawing_${d.id}`,
          type: 'collection' as const,
          name: (d.title as string) || 'untitled drawing',
          icon: 'PenTool',
          iconType: 'lucide' as const,
        }));
      } catch (e) {
        secureLogger.error('failed to load drawings from database', e);
      }

      // use functional updater to always get the latest items
      safeSetItems((prevItems: NavItem[]) => {
        // strip forbidden items, stale collections, and old drawings (will re-add fresh ones)
        const storedDeleted = getStoredDeleted();
        const cleaned = prevItems.filter(item => {
          const idLower = String(item.id).toLowerCase();
          if (forbiddenCollections.includes(idLower)) return false;
          if (item.id.startsWith('drawing_')) return false; // will re-add below

          // if the item is persistently deleted, drop it unless server still returns it (we'll clear below)
          if (storedDeleted.has(idLower)) {
            const stillExists = visibleCollections.some((c: any) => String(c.name).toLowerCase() === idLower);
            if (!stillExists) {
              // server confirms deletion; remove from storage
              removeStoredDeleted(idLower);
            }
            // always drop the item while it's marked deleted
            return false;
          }

          // if it's a normal database/collection (not a local doc/folder)
          if (!item.id.startsWith('doc_') && !item.id.startsWith('folder_')) {
            const stillExists = visibleCollections.some((c: any) => String(c.name).toLowerCase() === idLower);
            if (!stillExists) {
              // removed on server
              return false;
            }
          }
          return true;
        });

        // build a set of existing IDs (non-drawing, non-forbidden)
        const existingIds = new Set(cleaned.map(i => String(i.id).toLowerCase()));

        // add new collections that aren't already present and weren't recently deleted
        const newCols = visibleCollections
          .filter((c: any) => {
            const nameLC = String(c.name).toLowerCase();
            return !existingIds.has(nameLC) && !deletedItemsRef.current.has(nameLC);
          })
          .map((c: any) => ({
            id: c.name,
            type: 'collection' as const,
            name: c.title || c.name,
          }));

        // also deduplicate drawing items
        const allIds = new Set([...existingIds, ...newCols.map((c: NavItem) => c.id.toLowerCase())]);
        const uniqueDrawings = drawingItems.filter(d => !allIds.has(d.id.toLowerCase()));

        // merge: existing cleaned items + new collections + fresh drawings
        return [...cleaned, ...newCols, ...uniqueDrawings];
      });
    };

    syncAll();
  }, [collections, items, safeSetItems, homeCanvasDrawingId]);

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
    safeSetItems([folder, ...items]);
    setFolderDialogOpen(false);
    setNewFolderName('');
  };

  // toggle folder
  const toggleFolder = (id: string) => {
    safeSetItems(items.map(item =>
      item.id === id ? { ...item, collapsed: !item.collapsed } : item
    ));
  };


  const tabs = [
    { id: 'databases', icon: Database, label: 'databases' },
    { id: 'captures', icon: Inbox, label: 'captures' },
    { id: 'home', icon: Home, label: 'home' },
    { id: 'journal', icon: BookOpen, label: 'journal' },
    { id: 'calendar', icon: LucideIcons.Calendar, label: 'calendar' },
    { id: 'headmates', icon: Users, label: 'headmates' },
  ] as const;

  return (
    <>
      {/* desktop sidebar */}
      <div className={cn("hidden lg:flex flex-col w-64 h-full min-h-0 py-4 sidebar-container", className)} style={{ backgroundColor: '#050505' }}>
        {/* top icons */}
        <div className="flex items-center justify-around px-2 mb-2">
          {tabs.map(tab => (
            <NavIconButton
              key={tab.id}
              tab={tab}
              isActive={tab.id === 'databases' ? activeTab === 'databases' : activeTab === tab.id && !selectedCollection}
              onClick={() => {
                onTabChange(tab.id as any);
                onSelectCollection(null);
              }}
            />
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
                  safeSetItems([...items, {
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
                  safeSetItems([...items, {
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


        {/* scrollable list: flex-1 takes available space, min-h-0 forces proper flex shrinking */}
        <div className="flex-1 w-full min-h-0 px-2 overflow-y-auto">

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
                  syncedColors={syncedColors}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <div className="shrink-0 px-2 pt-2 !border-none shadow-none">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-muted-foreground border-solid hover:bg-white/5 transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('pkm:open-search'))}
          >
            <MessageCircle className="h-4 w-4" />
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
