import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, getContrastColor } from '@/lib/utils';
import { Check, X, Phone, Mail, Lock, Terminal, Paperclip, Link as LinkIcon, Copy, Trash2, Edit2, Database, FileText, Layout, Plus } from 'lucide-react';

import { LocationField } from './location-field';
import ReactMarkdown from 'react-markdown';
import RichEditor from '@/components/ui/rich-editor';
import { sanitizeHTML } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCollectionsStore } from '@/store/useCollectionsStore';
import { secureLogger } from '@/lib/secure-logger';

// import formula editor
import { FormulaEditor } from '@/components/formula-editor';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// helper wrapper for the granular context menu
import { useAppSetting } from '@/hooks/use-app-setting';

const FieldContextMenu = ({ children, onEdit, onClear, value, record, collectionName }: any) => {
  // row color logic
  const [recordMeta, setRecordMeta] = useAppSetting<Record<string, any>>(`record_meta_${collectionName || 'unknown'}`, {});

  const handleRowColor = (color: string) => {
    if (!record || !collectionName) return;
    setRecordMeta({
      ...recordMeta,
      [record.id]: {
        ...(recordMeta[record.id] || {}),
        color
      }
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* ensure we stop propagation so we don't trigger the row menu */}
        <div onContextMenu={(e) => {
          e.stopPropagation();
          // oncontextmenu handles nesting
        }}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onEdit}>
          <Edit2 className="mr-2 h-3 w-3" /> edit
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => {
          navigator.clipboard.writeText(String(value));
          toast.success("copied to clipboard");
        }}>
          <Copy className="mr-2 h-3 w-3" /> copy
        </ContextMenuItem>

        {/* row color submenu */}
        {record && collectionName && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <div className="flex items-center">
                  <div className="mr-2 h-3 w-3 rounded-full border border-current opacity-50" />
                  color
                </div>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-36">
                <div className="p-1 grid grid-cols-4 gap-1">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#64748b'].map(c => (
                    <div
                      key={c}
                      className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform ring-1 ring-transparent hover:ring-foreground"
                      style={{ backgroundColor: c }}
                      onClick={() => handleRowColor(c)}
                    />
                  ))}
                  <div
                    className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform border border-dashed border-muted-foreground flex items-center justify-center"
                    onClick={() => handleRowColor('')}
                    title="clear color"
                  >
                    <X className="w-3 h-3" />
                  </div>
                </div>
                <div className="p-2 border-t mt-1">
                  <HexColorPicker
                    color={recordMeta?.[record.id]?.color || '#ffffff'}
                    onChange={(c) => {
                      // debounce or just set?
                      // setting state in render cycle is bad if not throttled, but onchange is event.
                      // we can just call handlerowcolor(c).
                      // but dragging might cause too many updates.
                      // for now, let's just update.
                      handleRowColor(c);
                    }}
                    style={{ width: '100%', height: '120px' }}
                  />
                </div>

              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onClear} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-3 w-3" /> clear
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu >
  )
}

// --- relation picker component ---
function RelationPicker({ field, value, onChange, onCancel }: any) {
  const { client } = useAuth() as any;
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // fetch target records
    const fetchTarget = async () => {
      if (!field.target) return;
      setLoading(true);
      try {
        // determine target collection
        const res = await client?.listRecords(field.target);
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        setOptions(data);
      } catch (e) { secureLogger.error(String(e)); }
      finally { setLoading(false); }
    };
    fetchTarget();
  }, [field, client]);

  // handle selection
  // if "many", we usually need a multi-select.
  // checking field.interface or type for "many" hint.
  const isMany = field.interface?.includes('Many') || field.type?.includes('Many');

  const handleSelect = (recId: string) => {
    // find full record or just send id? nocobase usually wants id or object.
    // sending object for now to keep local state pretty
    const selected = options.find(o => o.id == recId); // loose match

    if (isMany) {
      // if already array, add/remove
      const current = Array.isArray(value) ? value : [];
      const exists = current.find((c: any) => c.id == recId);
      let newVal;
      if (exists) newVal = current.filter((c: any) => c.id != recId);
      else newVal = [...current, selected];
      onChange(newVal);
    } else {
      // single select: immediate save
      onChange(selected);
    }
  };

  return (
    <div className="absolute z-50 bg-popover border shadow-lg rounded-md p-2 w-[250px] max-h-[300px] flex flex-col gap-2">
      <div className="text-xs font-semibold text-muted-foreground px-1 ">
        select {field.target}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {loading && <div className="text-xs p-2">loading...</div>}
        {options.map(opt => {
          const isSelected = Array.isArray(value)
            ? value.some((v: any) => v.id == opt.id)
            : value?.id == opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "text-sm p-1.5 rounded cursor-pointer hover:bg-accent flex items-center justify-between",
                isSelected && "bg-accent/50 font-medium"
              )}
            >
              <span className="truncate">{opt.title || opt.name || opt.id}</span>
              {isSelected && <Check className="h-3 w-3 opacity-50" />}
            </div>
          )
        })}
      </div>
      <div className="flex justify-end gap-1 pt-2 border-t mt-1">
        {isMany && <Button size="sm" className="h-6 text-xs" onClick={() => onChange(value)}>done</Button>}
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancel}>cancel</Button>
      </div>
    </div>
  )
}

// --- link database picker component ---
function LinkDatabasePicker({ value, onChange, onCancel }: any) {
  const collections = useCollectionsStore((state) => state.collections);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCollections = collections.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const handleSelect = (collection: any) => {
    onChange({
      id: collection.name,
      name: collection.title || collection.name
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onCancel();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, filteredCollections.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCollections[highlightedIndex]) {
          handleSelect(filteredCollections[highlightedIndex]);
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-popover border shadow-lg rounded-md p-2 w-[280px] max-h-[350px] flex flex-col gap-2"
      onKeyDown={handleKeyDown}
    >
      <div className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1">
        <Database className="h-3 w-3" /> link database
      </div>
      <Input
        placeholder="search databases..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-xs bg-transparent"
        autoFocus
        aria-label="Search databases"
      />
      <div className="flex-1 overflow-y-auto space-y-1 max-h-[200px]">
        {filteredCollections.length === 0 ? (
          <div className="text-xs p-3 text-muted-foreground italic text-center">
            {search ? 'no databases match your search' : 'no databases available'}
          </div>
        ) : (
          filteredCollections.map((col: any, index: number) => {
            const isSelected = value?.id === col.name;
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={col.name}
                onClick={() => handleSelect(col)}
                className={cn(
                  "text-sm p-2 rounded cursor-pointer flex items-center justify-between transition-colors",
                  isHighlighted && "bg-accent/30",
                  isSelected && "bg-accent/50 font-medium",
                  !isHighlighted && !isSelected && "hover:bg-accent"
                )}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{col.title || col.name}</span>
                </div>
                {isSelected && <Check className="h-3 w-3 opacity-50" />}
              </div>
            );
          })
        )}
      </div>
      <div className="flex justify-between items-center pt-2 border-t mt-1">
        <span className="text-[10px] text-muted-foreground">
          {filteredCollections.length} database{filteredCollections.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancel}>cancel</Button>
      </div>
    </div>
  );
}

// --- link item picker component ---
function LinkItemPicker({ value, onChange, onCancel }: any) {
  const { client } = useAuth() as any;
  const collections = useCollectionsStore((state) => state.collections);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'record' | 'canvas' | 'document'>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search with cleanup
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!search.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      const allResults: any[] = [];
      let hasErrors = false;

      try {
        // Search in collections (records)
        if (selectedType === 'all' || selectedType === 'record') {
          const searchPromises = collections.slice(0, 5).map(async (collection: any) => {
            try {
              const res = await client?.listRecords(collection.name, {
                filter: { title: { $includes: search } },
                pageSize: 5
              });
              const data = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
              return data.map((item: any) => ({
                id: item.id,
                collection: collection.name,
                title: item.title || item.name || `Item ${item.id}`,
                type: 'record' as const,
              }));
            } catch (e) {
              hasErrors = true;
              return [];
            }
          });

          const searchResults = await Promise.allSettled(searchPromises);
          searchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              allResults.push(...result.value);
            }
          });
        }

        // Search in canvases (from local storage)
        if (selectedType === 'all' || selectedType === 'canvas') {
          try {
            const canvasData = localStorage.getItem('edgeless_canvases');
            if (canvasData) {
              const canvases = JSON.parse(canvasData);
              Object.entries(canvases).forEach(([id, canvas]: [string, any]) => {
                if (canvas.title?.toLowerCase().includes(search.toLowerCase())) {
                  allResults.push({
                    id,
                    collection: 'canvases',
                    title: canvas.title,
                    type: 'canvas' as const,
                  });
                }
              });
            }
          } catch (e) {
            hasErrors = true;
          }
        }

        // Search in documents
        if (selectedType === 'all' || selectedType === 'document') {
          try {
            const docsData = localStorage.getItem('pkm_documents');
            if (docsData) {
              const docs = JSON.parse(docsData);
              Object.entries(docs).forEach(([id, doc]: [string, any]) => {
                if (doc.title?.toLowerCase().includes(search.toLowerCase())) {
                  allResults.push({
                    id,
                    collection: 'documents',
                    title: doc.title,
                    type: 'document' as const,
                  });
                }
              });
            }
          } catch (e) {
            hasErrors = true;
          }
        }

        setResults(allResults.slice(0, 20));
        if (hasErrors && allResults.length === 0) {
          setError('Some searches failed. Showing partial results.');
        }
      } catch (e) {
        secureLogger.error('Error searching items:', e);
        setError('Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, selectedType, collections, client]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [results.length]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const handleSelect = (item: any) => {
    onChange(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onCancel();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'canvas': return <Layout className="h-3 w-3 text-purple-400" />;
      case 'document': return <FileText className="h-3 w-3 text-blue-400" />;
      default: return <Database className="h-3 w-3 text-green-400" />;
    }
  };

  const clearSearch = () => {
    setSearch('');
    setResults([]);
    setError(null);
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-popover border shadow-lg rounded-md p-2 w-[320px] max-h-[400px] flex flex-col gap-2"
      onKeyDown={handleKeyDown}
    >
      <div className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1">
        <LinkIcon className="h-3 w-3" /> link item
      </div>

      <div className="relative">
        <Input
          placeholder="search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs bg-transparent pr-7"
          autoFocus
          aria-label="Search items"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex gap-1 flex-wrap">
        {(['all', 'record', 'canvas', 'document'] as const).map((type) => (
          <Button
            key={type}
            size="sm"
            variant={selectedType === type ? 'secondary' : 'ghost'}
            className="h-5 text-[10px] px-2 capitalize"
            onClick={() => setSelectedType(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      {error && (
        <div className="text-xs p-2 text-red-400 bg-red-950/20 rounded border border-red-900/30">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 max-h-[250px] min-h-[60px]">
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && results.length > 0 && results.map((item: any, index: number) => {
          const isSelected = value?.id === item.id && value?.collection === item.collection;
          const isHighlighted = index === highlightedIndex;
          return (
            <div
              key={`${item.collection}-${item.id}`}
              onClick={() => handleSelect(item)}
              className={cn(
                "text-sm p-2 rounded cursor-pointer flex items-center justify-between transition-colors",
                isHighlighted && "bg-accent/30",
                isSelected && "bg-accent/50 font-medium",
                !isHighlighted && !isSelected && "hover:bg-accent"
              )}
              role="option"
              aria-selected={isSelected}
            >
              <div className="flex items-center gap-2 min-w-0">
                {getIcon(item.type)}
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {item.collection} • {item.type}
                  </span>
                </div>
              </div>
              {isSelected && <Check className="h-3 w-3 opacity-50 shrink-0" />}
            </div>
          );
        })}

        {!loading && search && results.length === 0 && !error && (
          <div className="text-xs p-3 text-muted-foreground italic text-center">
            no items found matching "{search}"
          </div>
        )}

        {!loading && !search && (
          <div className="text-xs p-3 text-muted-foreground italic text-center">
            type to search across databases, canvases, and documents...
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-2 border-t mt-1">
        <span className="text-[10px] text-muted-foreground">
          {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancel}>cancel</Button>
      </div>
    </div>
  );
}

export interface SmartFieldProps {
  value: any;
  field: any;
  record?: any; // Added record context
  collectionName?: string; // Added for context menu actions
  mode?: 'view' | 'edit';
  onChange: (value: any) => void;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SmartField({ value, field, record, collectionName, mode: _mode = 'view', onChange, className, inputClassName, size = 'lg' }: SmartFieldProps) {
  console.log('SmartField render', { value, field, record, collectionName, mode: _mode });
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [galleryImgs, setGalleryImgs] = useState<string[]>([]);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpness: 0, clarity: 0,
    shadowR: 0, shadowG: 0, shadowB: 0, shadowAmount: 0,
    midR: 0, midG: 0, midB: 0, midAmount: 0,
    highlightR: 0, highlightG: 0, highlightB: 0, highlightAmount: 0
  });
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropAspect, setCropAspect] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [drawColor, setDrawColor] = useState('#3b82f6');
  const [drawOpacity, setDrawOpacity] = useState(0.5);
  const [drawWidth, setDrawWidth] = useState(3);
  const [strokes, setStrokes] = useState<{ points: { x: number; y: number }[]; color: string; width: number; opacity: number; isHighlight: boolean }[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ points: { x: number; y: number }[]; color: string; width: number; opacity: number; isHighlight: boolean } | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const { client } = useAuth() as any;
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEditing) setLocalValue(value);
  }, [value, isEditing]);

  const handleSave = (newVal?: any) => {
    const finalVal = newVal !== undefined ? newVal : localValue;
    onChange(finalVal);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const baseType = field?.interface || field?.type || 'string';
  const name = field?.name?.toLowerCase() || '';
  const strValue = String(value || '');

  const detectedType = (() => {
    if (baseType !== 'string' && baseType !== 'text' && baseType !== 'input') return baseType;
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(strValue)) return 'email';
    const digits = strValue.replace(/\D/g, '');
    if (digits.length === 10) return 'phone';
    if (strValue.length >= 4 && /^\d+$/.test(strValue)) return 'password';
    return baseType;
  })();

  const isLocation = detectedType === 'location' || detectedType === 'point' || detectedType === 'map' || name.includes('location') || name.includes('map');
  const isPhone = detectedType === 'phone' || name.includes('phone');
  const isEmail = detectedType === 'email' || name.includes('email');
  const isPassword = detectedType === 'password' || name.includes('password');
  const isColor = detectedType === 'color' || name.includes('color');
  const isCheckbox = detectedType === 'boolean' || detectedType === 'checkbox';
  const isMultiSelect = field?.interface === 'multipleSelect' || detectedType === 'multipleSelect' || field?.interface === 'checkboxgroup';
  const isSelect = detectedType === 'select' || detectedType === 'multipleSelect' || field?.interface === 'radiogroup';

  // searchable dropdown state for select fields
  const [searchText, setSearchText] = useState('');
  // include colors if provided
  const enrich = (opts: any[] = []) => {
    const colors = field?.optionColors || [];
    return opts.map((o, i) => ({ ...o, color: colors[i] || o.color }));
  };

  const [localOptions, setLocalOptions] = useState<any[]>(enrich(field?.uiSchema?.enum || []));
  useEffect(() => {
    setLocalOptions(enrich(field?.uiSchema?.enum || []));
  }, [field?.uiSchema?.enum, field?.optionColors]);

  // colour picker / palette support for select options
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [palette, setPalette] = useAppSetting<string[]>('color_palette', []);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [colorTarget, setColorTarget] = useState<string | null>(null);

  const changeOptionColor = async (optValue: string, color: string) => {
    setLocalOptions(prev => prev.map(o => o.value === optValue ? { ...o, color } : o));
    const idx = localOptions.findIndex(o => o.value === optValue);
    const colors = [...(field?.optionColors || [])];
    colors[idx] = color;
    try {
      await client.updateField(collectionName, field.name, { optionColors: colors });
    } catch (err) {
      secureLogger.error('failed to persist option color', err);
    }
    setPalette(prev => {
      if (prev.includes(color)) return prev;
      const next = [...prev, color];
      if (next.length > 10) next.shift();
      return next;
    });
  };

  const openColorPicker = (opt: any) => {
    setColorTarget(opt.value);
    setCurrentColor(opt.color || currentColor);
    colorInputRef.current?.click();
  };
  const isCode = detectedType === 'code' || name === 'code' || name === 'formula' || field?.type === 'formula';
  const isMarkdown = detectedType === 'markdown' || detectedType === 'richText' || name.includes('desc') || name.includes('note');
  const isNumber = detectedType === 'number' || detectedType === 'integer' || detectedType === 'percent';
  const isPercentField = field?.type === 'percent' || name.includes('percent');
  const isUrl = detectedType === 'url' || detectedType === 'link' || name.includes('link') || name.includes('url');
  const isFile = detectedType === 'attachment' || name.includes('file') || name.includes('image') || name.includes('avatar');
  const isDateTime = detectedType === 'datetime' || field?.interface === 'datetime' || name.includes('datetime');
  const isTime = detectedType === 'time' || name.includes('time');
  const isDate = !isTime && (detectedType === 'date' || name.includes('date') || name.includes('created'));
  const isId = name === 'id' || name === 'uuid' || detectedType === 'uid' || detectedType === 'uuid';
  const isRelation = detectedType === 'relation' || detectedType === 'linkToAnotherRecord' || field?.interface === 'linkToAnotherRecord' || baseType === 'hasOne' || baseType === 'hasMany' || baseType === 'belongsTo' || baseType === 'belongsToMany';
  const isJson = detectedType === 'json' || detectedType === 'array' || detectedType === 'object' || (typeof value === 'object' && value !== null);
  const isLinkDatabase = detectedType === 'linkDatabase' || field?.type === 'linkDatabase' || field?.interface === 'linkDatabase';
  const isLinkItem = detectedType === 'linkItem' || field?.type === 'linkItem' || field?.interface === 'linkItem';

  const formatPhoneNumber = (val: string) => {
    const d = val.replace(/\D/g, '');
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : val;
  };

  const handlePhoneClick = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = `tel:${val.replace(/\D/g, '')}`;
    } else {
      navigator.clipboard.writeText(val.replace(/\D/g, ''));
      toast.success(`copied ${formatPhoneNumber(val)} to clipboard`);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase() + '.';
      const day = date.getDate();
      const year = "'" + date.getFullYear().toString().slice(-2);
      return `${month} ${day}, ${year}`;
    } catch (e) { return dateStr; }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const t = new Date(dateStr);
      if (isNaN(t.getTime())) return dateStr;
      return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return dateStr; }
  };

  const formatNumber = (val: any) => {
    if (field?.type === 'percent' || name.includes('percent')) return `${val}%`;
    return val;
  };

  const dataUrlToFile = async (dataUrl: string, filename = 'edited.png') => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'image/png' });
  };

  const renderImageEditor = (src: string) => {
    const drawPreview = async () => {
      const canvas = previewRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
      const dpr = window.devicePixelRatio || 1;
      const w = overlayRef.current?.clientWidth || 600;
      const h = overlayRef.current?.clientHeight || 400;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      const filterStr = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px)`;
      ctx.filter = filterStr;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';

      // apply color grading via overlay blending
      if (filters.shadowAmount > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(${filters.shadowR}, ${filters.shadowG}, ${filters.shadowB}, ${filters.shadowAmount / 100})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      if (filters.highlightAmount > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${filters.highlightR}, ${filters.highlightG}, ${filters.highlightB}, ${filters.highlightAmount / 100})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      if (filters.midAmount > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = `rgba(${filters.midR}, ${filters.midG}, ${filters.midB}, ${filters.midAmount / 100})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (stroke.isHighlight) {
          ctx.globalAlpha = stroke.opacity;
          ctx.globalCompositeOperation = 'multiply';
        }
        ctx.beginPath();
        stroke.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      });
    };

    const applySharpness = (imageData: ImageData, amount: number) => {
      if (amount <= 0) return imageData;
      const w = imageData.width;
      const h = imageData.height;
      const src = imageData.data;
      const out = new Uint8ClampedArray(src.length);
      const kernel = [0, -1, 0, -1, 5 + amount, -1, 0, -1, 0];
      const side = 3;
      const half = 1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          for (let c = 0; c < 4; c++) {
            let sum = 0;
            for (let ky = 0; ky < side; ky++) {
              for (let kx = 0; kx < side; kx++) {
                const px = Math.min(w - 1, Math.max(0, x + kx - half));
                const py = Math.min(h - 1, Math.max(0, y + ky - half));
                const srcIdx = (py * w + px) * 4 + c;
                const kVal = kernel[ky * side + kx];
                sum += src[srcIdx] * kVal;
              }
            }
            out[(y * w + x) * 4 + c] = sum;
          }
        }
      }
      return new ImageData(out, w, h);
    };

    const exportImage = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
      const w = overlayRef.current?.clientWidth || img.width;
      const h = overlayRef.current?.clientHeight || img.height;
      canvas.width = w;
      canvas.height = h;
      const filterStr = `brightness(${filters.brightness}%) contrast(${filters.contrast + filters.clarity}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px)`;
      ctx.filter = filterStr;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';

      // apply color grading via overlay blending
      if (filters.shadowAmount > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(${filters.shadowR}, ${filters.shadowG}, ${filters.shadowB}, ${filters.shadowAmount / 100})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      if (filters.highlightAmount > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${filters.highlightR}, ${filters.highlightG}, ${filters.highlightB}, ${filters.highlightAmount / 100})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      if (filters.midAmount > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = `rgba(${filters.midR}, ${filters.midG}, ${filters.midB}, ${filters.midAmount / 100})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (stroke.isHighlight) {
          ctx.globalAlpha = stroke.opacity;
          ctx.globalCompositeOperation = 'multiply';
        }
        ctx.beginPath();
        stroke.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      });

      let exportCanvas = canvas;
      if (crop) {
        const cCanvas = document.createElement('canvas');
        cCanvas.width = crop.w;
        cCanvas.height = crop.h;
        const cctx = cCanvas.getContext('2d');
        if (cctx) {
          cctx.drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
          exportCanvas = cCanvas;
        }
      }

      if (filters.sharpness > 0) {
        const ectx = exportCanvas.getContext('2d');
        if (ectx) {
          const data = ectx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
          const sharpened = applySharpness(data, filters.sharpness / 50);
          ectx.putImageData(sharpened, 0, 0);
        }
      }
      return exportCanvas.toDataURL('image/png');
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (isDrawing || isHighlighting) {
        const stroke = { points: [{ x, y }], color: drawColor, width: drawWidth, opacity: drawOpacity, isHighlight: isHighlighting };
        setCurrentStroke(stroke);
      } else {
        setCrop({ x, y, w: 0, h: 0 });
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (currentStroke) {
        setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, { x, y }] });
      } else if (crop) {
        let w = x - crop.x;
        let h = y - crop.y;
        // apply aspect ratio constraint if set
        if (cropAspect && cropAspect > 0) {
          const absW = Math.abs(w);
          const absH = Math.abs(h);
          const targetH = absW / cropAspect;
          if (targetH > absH) {
            // adjust width to match height
            w = w > 0 ? absH * cropAspect : -absH * cropAspect;
          } else {
            // adjust height to match width
            h = h > 0 ? targetH : -targetH;
          }
        }
        setCrop({ ...crop, w, h });
      }
    };

    const handlePointerUp = () => {
      if (currentStroke) {
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke(null);
      }
    };

    useEffect(() => { drawPreview(); }, [src, filters, strokes, crop]);

    return (
      <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditorOpen(false)}>
        <div className="bg-[#0b0b0b] border border-[#222] rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
            <div className="text-sm font-semibold text-white">image editor</div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => {
                setStrokes([]);
                setCrop(null);
                setCropAspect(null);
                setFilters({
                  brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpness: 0, clarity: 0,
                  shadowR: 0, shadowG: 0, shadowB: 0, shadowAmount: 0,
                  midR: 0, midG: 0, midB: 0, midAmount: 0,
                  highlightR: 0, highlightG: 0, highlightB: 0, highlightAmount: 0
                });
              }}>reset</Button>
              <Button size="sm" onClick={async () => {
                const dataUrl = await exportImage();
                if (dataUrl) {
                  try {
                    const file = await dataUrlToFile(dataUrl);
                    const uploaded = await client?.upload?.(file);
                    const url = uploaded?.data?.url || uploaded?.url;
                    handleSave(url || dataUrl);
                  } catch (e) {
                    // fallback to data URL if upload fails
                    handleSave(dataUrl);
                  }
                  setEditorOpen(false);
                }
              }}>apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditorOpen(false)}>close</Button>
            </div>
          </div>
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 relative bg-[#050505]" ref={overlayRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <canvas ref={previewRef} className="w-full h-full" />
              {crop && (
                <div className="absolute border-2 border-primary/80 bg-primary/5 backdrop-blur-[1px]" style={{ left: Math.min(crop.x, crop.x + crop.w), top: Math.min(crop.y, crop.y + crop.h), width: Math.abs(crop.w), height: Math.abs(crop.h) }}>
                  <div className="absolute -top-5 left-0 text-[10px] text-primary bg-black/50 px-1 rounded">
                    {Math.round(Math.abs(crop.w))}×{Math.round(Math.abs(crop.h))}
                  </div>
                </div>
              )}
              {currentStroke && currentStroke.points.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none">
                  <polyline
                    points={currentStroke.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={currentStroke.color}
                    strokeWidth={currentStroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={currentStroke.isHighlight ? currentStroke.opacity : 1}
                  />
                </svg>
              )}
            </div>
            <div className="w-80 border-l border-[#222] p-4 space-y-4 overflow-y-auto">
              {/* tool mode selection */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">tool mode</div>
                <div className="flex gap-1">
                  <Button size="sm" variant={!isDrawing && !isHighlighting ? 'secondary' : 'outline'} onClick={() => { setIsDrawing(false); setIsHighlighting(false); }} className="flex-1 text-xs">crop</Button>
                  <Button size="sm" variant={isDrawing ? 'secondary' : 'outline'} onClick={() => { setIsDrawing(true); setIsHighlighting(false); }} className="flex-1 text-xs">draw</Button>
                  <Button size="sm" variant={isHighlighting ? 'secondary' : 'outline'} onClick={() => { setIsDrawing(false); setIsHighlighting(true); }} className="flex-1 text-xs">highlight</Button>
                </div>
              </div>

              {/* drawing/highlighting controls */}
              {(isDrawing || isHighlighting) && (
                <div className="space-y-3 p-3 rounded-md border border-[#333] bg-[#111]">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>color</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#ffffff', '#000000'].map(c => (
                        <div
                          key={c}
                          className={`w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform border ${drawColor === c ? 'border-white ring-1 ring-white' : 'border-white/20'}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setDrawColor(c)}
                        />
                      ))}
                      <input
                        type="color"
                        value={drawColor}
                        onChange={(e) => setDrawColor(e.target.value)}
                        className="w-5 h-5 rounded-full border-0 p-0 overflow-hidden cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>width</span>
                      <span>{drawWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={drawWidth}
                      onChange={(e) => setDrawWidth(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  {isHighlighting && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>opacity</span>
                        <span>{Math.round(drawOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={Math.round(drawOpacity * 100)}
                        onChange={(e) => setDrawOpacity(Number(e.target.value) / 100)}
                        className="w-full accent-primary"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* crop aspect ratio presets */}
              {!isDrawing && !isHighlighting && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">crop aspect ratio</div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant={cropAspect === null ? 'secondary' : 'outline'} onClick={() => setCropAspect(null)} className="text-xs">free</Button>
                    <Button size="sm" variant={cropAspect === 1 ? 'secondary' : 'outline'} onClick={() => setCropAspect(1)} className="text-xs">1:1</Button>
                    <Button size="sm" variant={cropAspect === 16 / 9 ? 'secondary' : 'outline'} onClick={() => setCropAspect(16 / 9)} className="text-xs">16:9</Button>
                    <Button size="sm" variant={cropAspect === 4 / 3 ? 'secondary' : 'outline'} onClick={() => setCropAspect(4 / 3)} className="text-xs">4:3</Button>
                    <Button size="sm" variant={cropAspect === 3 / 2 ? 'secondary' : 'outline'} onClick={() => setCropAspect(3 / 2)} className="text-xs">3:2</Button>
                    <Button size="sm" variant={cropAspect === 9 / 16 ? 'secondary' : 'outline'} onClick={() => setCropAspect(9 / 16)} className="text-xs">9:16</Button>
                  </div>
                  {crop && (
                    <Button size="sm" variant="ghost" className="w-full text-xs text-red-400" onClick={() => setCrop(null)}>
                      clear crop
                    </Button>
                  )}
                </div>
              )}

              {/* basic adjustments */}
              <div className="space-y-2 pt-2 border-t border-[#333]">
                <div className="text-xs text-muted-foreground">basic adjustments</div>
                {['brightness', 'contrast', 'saturation', 'hue', 'blur', 'clarity', 'sharpness'].map((key) => {
                  const min = key === 'hue' ? -180 : 0;
                  const max = key === 'hue' ? 180 : key === 'blur' ? 10 : 200;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>{key}</span>
                        <span>{filters[key as keyof typeof filters]}</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={filters[key as keyof typeof filters]}
                        onChange={(e) => setFilters(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                    </div>
                  );
                })}
              </div>

              {/* color grading - shadows */}
              <div className="space-y-2 pt-2 border-t border-[#333]">
                <div className="text-xs text-muted-foreground">shadow tint</div>
                <div className="flex gap-1 mb-1">
                  <input
                    type="color"
                    value={`rgb(${filters.shadowR}, ${filters.shadowG}, ${filters.shadowB})`}
                    onChange={(e) => {
                      const rgb = e.target.value;
                      const r = parseInt(rgb.slice(1, 3), 16);
                      const g = parseInt(rgb.slice(3, 5), 16);
                      const b = parseInt(rgb.slice(5, 7), 16);
                      setFilters(prev => ({ ...prev, shadowR: r, shadowG: g, shadowB: b }));
                    }}
                    className="w-6 h-6 rounded border-0 p-0"
                  />
                  <span className="text-xs text-muted-foreground flex-1">color</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>amount</span>
                    <span>{filters.shadowAmount}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={filters.shadowAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, shadowAmount: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {/* color grading - midtones */}
              <div className="space-y-2 pt-2 border-t border-[#333]">
                <div className="text-xs text-muted-foreground">midtone tint</div>
                <div className="flex gap-1 mb-1">
                  <input
                    type="color"
                    value={`rgb(${filters.midR}, ${filters.midG}, ${filters.midB})`}
                    onChange={(e) => {
                      const rgb = e.target.value;
                      const r = parseInt(rgb.slice(1, 3), 16);
                      const g = parseInt(rgb.slice(3, 5), 16);
                      const b = parseInt(rgb.slice(5, 7), 16);
                      setFilters(prev => ({ ...prev, midR: r, midG: g, midB: b }));
                    }}
                    className="w-6 h-6 rounded border-0 p-0"
                  />
                  <span className="text-xs text-muted-foreground flex-1">color</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>amount</span>
                    <span>{filters.midAmount}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={filters.midAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, midAmount: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {/* color grading - highlights */}
              <div className="space-y-2 pt-2 border-t border-[#333]">
                <div className="text-xs text-muted-foreground">highlight tint</div>
                <div className="flex gap-1 mb-1">
                  <input
                    type="color"
                    value={`rgb(${filters.highlightR}, ${filters.highlightG}, ${filters.highlightB})`}
                    onChange={(e) => {
                      const rgb = e.target.value;
                      const r = parseInt(rgb.slice(1, 3), 16);
                      const g = parseInt(rgb.slice(3, 5), 16);
                      const b = parseInt(rgb.slice(5, 7), 16);
                      setFilters(prev => ({ ...prev, highlightR: r, highlightG: g, highlightB: b }));
                    }}
                    className="w-6 h-6 rounded border-0 p-0"
                  />
                  <span className="text-xs text-muted-foreground flex-1">color</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>amount</span>
                    <span>{filters.highlightAmount}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={filters.highlightAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, highlightAmount: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isEditing) {
    if (isLocation) {
      return (
        <div className="w-[400px] bg-[#111] border border-[#333] p-2 rounded shadow-xl z-50 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-xs text-white">set location</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSave()}><Check className="h-3 w-3 text-green-500" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3 text-red-500" /></Button>
            </div>
          </div>
          <LocationField value={localValue} onChange={setLocalValue} />
        </div>
      );
    }

    if (isCode && showFormulaEditor) {
      return (
        <FormulaEditor
          value={localValue}
          record={record}
          client={client}
          onSave={(newCode) => {
            setLocalValue(newCode);
            onChange(newCode);
            setIsEditing(false);
            setShowFormulaEditor(false);
          }}
          onCancel={() => {
            setIsEditing(false);
            setShowFormulaEditor(false);
          }}
        />
      );
    }

    if (isMarkdown || isCode) {
      if (isCode) {
        setShowFormulaEditor(true);
        return null;
      }
      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b0b] w-full max-w-3xl h-[80vh] border border-[#333] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-2 border-b border-[#333] flex justify-between items-center bg-[#111]">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-bold text-white">editor</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave()} className="bg-primary text-black hover:bg-primary/90">save</Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} className="text-white hover:bg-white/10">cancel</Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#050505]">
              <RichEditor
                value={localValue && String(localValue).trim().startsWith('<') ? localValue : (localValue ? `<p>${String(localValue).replace(/\n/g, '<br/>')}</p>` : '')}
                onChange={(html: string) => setLocalValue(sanitizeHTML(html))}
                uploadImage={async (file: File) => {
                  const res = await client?.upload(file);
                  return res?.data?.url || '';
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (isEditing) {
      const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const res = await client?.upload(file);
          const newValue = res?.data?.url;
          if (newValue) {
            if (field.interface === 'attachments' || field.type === 'attachments') {
              const current = Array.isArray(localValue) ? localValue : [];
              setLocalValue([...current, { url: newValue }]);
            } else {
              setLocalValue(newValue);
            }
          }
        } catch (err) { toast.error("upload failed"); }
      };
      return (
        <div className="flex items-center gap-2 border border-[#333] p-1 bg-[#111] min-w-[200px]">
          <Input
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            className="bg-transparent text-white border-none h-7 text-sm focus-visible:ring-0"
            placeholder="paste url or upload..."
          />
          <div className="relative">
            <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-6" onChange={handleFileChange} />
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave()}><Check className="h-3 w-3" /></Button>
        </div>
      );
    }

    if (isDate || isDateTime || isTime) {
      if (isDateTime || isTime) {
        return (
          <div className="flex items-center gap-1 bg-[#111] p-1 border border-[#333]">
            <Input
              type={isDateTime ? 'datetime-local' : 'time'}
              value={localValue || ''}
              onChange={(e) => setLocalValue(e.target.value)}
              className="bg-transparent text-white border-0 h-7 text-sm"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave(localValue)}><Check className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
          </div>
        );
      }
      return (
        <Popover open={true} onOpenChange={(open) => { if (!open) handleSave(); }}>
          <PopoverTrigger asChild>
            <div className="text-xs text-white cursor-pointer px-2 py-1 bg-[#111] border border-[#333] min-w-[100px] rounded">
              {formatDate(localValue)} {formatTime(localValue) || 'select date...'}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-[#111] border-[#333]" align="start">
            <Calendar mode="single" selected={localValue ? new Date(localValue) : undefined} onSelect={(d) => d && handleSave(d.toISOString())} initialFocus />
          </PopoverContent>
        </Popover>
      );
    }

    if (isMultiSelect || isSelect) {
      // searchable dropdown with add-option support
      const options = localOptions;
      const filtered = options.filter((o) => o.label.toLowerCase().includes(searchText.toLowerCase()));
      const showAdd = searchText && !options.some(o => o.label.toLowerCase() === searchText.toLowerCase());

      const addOption = async (label: string) => {
        const value = label.toLowerCase().replace(/\s+/g, '_');
        const newOpt = { label, value, color: undefined };
        setLocalOptions(prev => [...prev, newOpt]);
        // persist back to field configuration along with default color
        try {
          await client.updateField(collectionName, field.name, {
            uiSchema: { ...field.uiSchema, enum: [...options, newOpt] },
            optionColors: [...(field?.optionColors || []), '#ffffff']
          });
        } catch (err) {
          secureLogger.error('failed to persist new option', err);
        }
        if (isMultiSelect) {
          const arr = Array.isArray(localValue) ? [...localValue] : [];
          arr.push(value);
          setLocalValue(arr);
        } else {
          setLocalValue(value);
          handleSave(value);
        }
        setSearchText('');
      };

      return (
        <div className="flex flex-col bg-[#111] border border-[#333] p-1 rounded min-w-[150px]">
          <input
            ref={colorInputRef}
            type="color"
            value={currentColor}
            onChange={(e) => {
              const col = e.target.value;
              setCurrentColor(col);
              if (colorTarget) changeOptionColor(colorTarget, col);
            }}
            style={{ display: 'none' }}
          />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="search..."
            className="bg-transparent text-white border-b border-[#333] h-7 text-xs px-1"
            autoFocus
          />
          {palette.length > 0 && (
            <div className="flex gap-1 my-1">
              {palette.map((c, i) => (
                <button
                  key={i}
                  className="w-4 h-4 rounded"
                  style={{ background: c }}
                  onClick={() => setCurrentColor(c)}
                />
              ))}
              <button
                className="w-4 h-4 rounded border"
                onClick={() => setCurrentColor('#ffffff')}
                title="reset"
              />
            </div>
          )}
          <div className="max-h-40 overflow-auto mt-1">
            {filtered.map(opt => {
              const checked = isMultiSelect
                ? Array.isArray(localValue) && localValue.includes(opt.value)
                : localValue === opt.value;
              return (
                <div
                  key={opt.value}
                  className="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer"
                  onContextMenu={(e) => { e.preventDefault(); openColorPicker(opt); }}
                  onClick={() => {
                    if (isMultiSelect) {
                      let newArr = Array.isArray(localValue) ? [...localValue] : [];
                      if (newArr.includes(opt.value)) newArr = newArr.filter(v => v !== opt.value);
                      else newArr.push(opt.value);
                      setLocalValue(newArr);
                    } else {
                      setLocalValue(opt.value);
                      handleSave(opt.value);
                    }
                  }}
                >
                  {isMultiSelect && (
                    <Checkbox
                      checked={!!checked}
                      onCheckedChange={() => {
                        let newArr = Array.isArray(localValue) ? [...localValue] : [];
                        if (newArr.includes(opt.value)) newArr = newArr.filter(v => v !== opt.value);
                        else newArr.push(opt.value);
                        setLocalValue(newArr);
                      }}
                    />
                  )}
                  <span
                    className="text-xs"
                    style={{
                      background: opt.color ? opt.color : undefined,
                      color: opt.color ? getContrastColor(opt.color) : undefined,
                      padding: opt.color ? '0 0.25rem' : undefined,
                      borderRadius: opt.color ? '0.25rem' : undefined,
                    }}
                  >
                    {opt.label}
                  </span>
                </div>
              );
            })}
            {showAdd && (
              <div
                className="flex items-center gap-2 p-1 text-primary cursor-pointer hover:bg-[#222]"
                onClick={() => addOption(searchText)}
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">add "{searchText}"</span>
              </div>
            )}
          </div>
          {isMultiSelect && (
            <div className="flex justify-end gap-1 mt-1">
              <Button size="sm" onClick={() => handleSave()} className="h-6 text-xs">done</Button>
              <Button size="sm" onClick={handleCancel} className="h-6 text-xs">cancel</Button>
            </div>
          )}
        </div>
      );
    }

    if (isColor) {
      return (
        <div className="flex items-center gap-2 p-1 bg-[#111] border border-[#333] rounded">
          <input type="color" value={localValue || '#000000'} onChange={(e) => setLocalValue(e.target.value)} className="h-7 w-7 bg-transparent border-0 cursor-pointer" />
          <Input value={localValue || ''} onChange={(e) => setLocalValue(e.target.value)} className="h-7 w-20 bg-transparent text-white border-0 text-xs font-mono" />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave()}><Check className="h-3 w-3" /></Button>
        </div>
      );
    }

    if (isRelation) {
      return <RelationPicker field={field} value={localValue} onChange={handleSave} onCancel={handleCancel} />;
    }

    if (isLinkDatabase) {
      return <LinkDatabasePicker value={localValue} onChange={handleSave} onCancel={handleCancel} />;
    }

    if (isLinkItem) {
      return <LinkItemPicker value={localValue} onChange={handleSave} onCancel={handleCancel} />;
    }

    if (isJson) {
      return (
        <div className="flex flex-col gap-1 min-w-[200px] bg-[#111] border border-[#333] p-2 rounded shadow-2xl z-50">
          <textarea autoFocus value={typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2)} onChange={(e) => setLocalValue(e.target.value)} className="w-full h-32 text-xs font-mono bg-black text-green-400 p-2 border border-[#333] focus:outline-none" />
          <div className="flex justify-end gap-1 mt-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => { try { handleSave(JSON.parse(localValue)); } catch (e) { toast.error("invalid json"); } }}><Check className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50" onClick={handleCancel}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("flex items-center gap-1 min-w-[120px] bg-[#050505] border border-[#222] relative z-10 px-1 shadow-xl", className)}>
        <Input
          autoFocus
          type={isNumber ? "number" : "text"}
          value={localValue || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
          className={cn("h-8 bg-transparent text-white border-0 shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none", size === 'lg' ? "text-lg" : "text-sm", inputClassName)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        {isPercentField && <span className="text-white text-xs">%</span>}
        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-white/5" onClick={() => handleSave()}>
          <Check className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-white/5" onClick={handleCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const renderView = () => {
    if (isId) return <span className={cn("font-mono opacity-50 select-text text-white/70", size === 'lg' ? "text-lg" : "text-[10px]")}>{value?.toString()}</span>;

    if (isLinkDatabase && value) {
      return (
        <div
          className="flex items-center gap-1 cursor-pointer group"
          onClick={() => navigate(`/databases/${encodeURIComponent(value.id)}`)}
        >
          <div className={cn(
            "px-2 py-1 bg-indigo-900/40 text-indigo-300 rounded border border-indigo-700/50 hover:bg-indigo-800/50 hover:border-indigo-600 transition-colors flex items-center gap-1.5",
            size === 'lg' ? "text-lg" : "text-xs"
          )}>
            <Database className="h-3 w-3" />
            <span className="truncate">{value.name || value.id}</span>
          </div>
        </div>
      );
    }

    if (isLinkItem && value) {
      const handleClick = () => {
        if (value.type === 'canvas') {
          navigate(`/canvas/${value.id}`);
        } else if (value.type === 'document') {
          navigate(`/page/${value.id}`);
        } else {
          navigate(`/databases/${encodeURIComponent(value.collection)}/${value.id}`);
        }
      };

      return (
        <div
          className="flex items-center gap-1 cursor-pointer group"
          onClick={handleClick}
        >
          <div className={cn(
            "px-2 py-1 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-700/50 hover:bg-emerald-800/50 hover:border-emerald-600 transition-colors flex items-center gap-1.5",
            size === 'lg' ? "text-lg" : "text-xs"
          )}>
            {value.type === 'canvas' && <Layout className="h-3 w-3" />}
            {value.type === 'document' && <FileText className="h-3 w-3" />}
            {value.type === 'record' && <Database className="h-3 w-3" />}
            <span className="truncate">{value.title || 'Untitled'}</span>
          </div>
        </div>
      );
    }

    if (isRelation) {
      let display = '';
      if (Array.isArray(value)) {
        display = value.map(v => (field.property && v && typeof v === 'object' ? v[field.property] : v?.title || v?.name || v?.id || JSON.stringify(v))).join(', ');
      } else if (typeof value === 'object' && value !== null) {
        display = (field.property && value[field.property] !== undefined ? String(value[field.property]) : value.title || value.name || value.id || JSON.stringify(value));
      } else {
        display = String(value || '');
      }
      return (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsEditing(true)}>
          <div className={cn("px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded border border-blue-800 w-full", size === 'lg' ? "text-lg" : "text-xs")}>
            {display || <span className="opacity-50 italic">empty</span>}
          </div>
        </div>
      );
    }

    if (isDateTime || isDate || isTime) {
      return (
        <div
          onDoubleClick={() => setIsEditing(true)}
          className={cn("cursor-pointer text-right min-h-[20px] font-varela text-white/90", size === 'lg' ? "text-lg" : "text-sm")}
        >
          {value !== null && value !== undefined ? formatNumber(value) : <span className="opacity-20">-</span>}
        </div>
      );
    }

    // show label text instead of raw value for select/multi-select, and open on click
    if (isSelect) {
      const options = enrich(field?.uiSchema?.enum || []);
        if (isMultiSelect) {
          return (
            <div className="flex flex-wrap gap-1 cursor-pointer" onClick={() => setIsEditing(true)}>
              {Array.isArray(value) ? value.map(v => {
                const opt = options.find(o => o.value === v);
                const label = opt?.label || v;
                const color = opt?.color;
                return (
                  <span
                    key={v}
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      background: color || undefined,
                      color: color ? getContrastColor(color) : undefined,
                      border: color ? '1px solid #444' : undefined
                    }}
                  >
                    {label}
                  </span>
                );
              }) : null}
              {(!value || (Array.isArray(value) && value.length === 0)) && (
                <span className="opacity-50 italic">empty</span>
              )}
            </div>
          );
        } else {
          const opt = options.find(o => o.value === value);
          const label = opt?.label || value;
          const color = opt?.color;
          return (
            <div
              onClick={() => setIsEditing(true)}
              className={cn("cursor-pointer text-right min-h-[20px] font-varela text-white/90", size === 'lg' ? "text-lg" : "text-sm")}
              style={color ? { background: color, color: getContrastColor(color), padding: '0 0.25rem', borderRadius: '0.25rem' } : undefined}
            >
              {label || <span className="opacity-50 italic">empty</span>}
            </div>
          );
        }
    if (isEmail) return <a href={`mailto:${strValue}`} className={cn("text-primary hover:underline flex items-center gap-1 w-full", size === 'lg' ? "text-lg" : "text-sm")} onClick={e => e.stopPropagation()}><Mail className="h-3 w-3" /> {strValue}</a>;
    if (isUrl) {
      return (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              onContextMenu={(e) => { e.stopPropagation(); }}
              className={cn("text-blue-400 hover:underline flex items-center gap-1 w-full cursor-pointer truncate", size === 'lg' ? "text-lg" : "text-sm")}
              onClick={(e) => e.stopPropagation()}
              title={value}
            >
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{value}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onSelect={() => window.open(value, '_blank')}>open externally</ContextMenuItem>
            <ContextMenuItem onSelect={() => { setIsEditing(true); }}>edit url</ContextMenuItem>
            <ContextMenuItem onSelect={() => { navigator.clipboard.writeText(String(value || '')); toast.success('copied'); }}>copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }
    if (isPassword) return <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="cursor-pointer flex items-center gap-1 text-white/30 hover:text-white/60"><Lock className="h-3 w-3" /> <span className="font-mono">••••••••</span></div>;
    if (isColor) return <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer group"><div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: value || 'transparent' }} /><span className={cn("font-mono text-white/70 text-xs", size === 'lg' && "text-base")}>{value}</span></div>;
    if (isCheckbox) return <div className="flex items-center justify-center h-full w-full cursor-pointer" onClick={() => onChange(!value)}><Checkbox checked={!!value} className="data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black border-white/20" onCheckedChange={(checked: boolean) => onChange(checked)} /></div>;

    if (isFile) {
      const imgs: string[] = Array.isArray(value) ? value.map((v: any) => v?.url || v).filter(Boolean) : (value?.url || (typeof value === 'string' && value.startsWith('http') ? value : null));
      const imgArr = Array.isArray(imgs) ? imgs : (imgs ? [imgs] : []);
      if (imgArr.length > 0) {
        return (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex items-center justify-center gap-1 h-full w-full overflow-hidden px-1" onContextMenu={(e) => { e.stopPropagation(); }}>
                <div
                  className="cursor-pointer flex items-center gap-1 transition-transform hover:scale-110"
                  onClick={(e) => { e.stopPropagation(); setFullscreenIndex(0); setGalleryImgs(imgArr); }}
                >
                  <img src={imgArr[0]} className="h-7 w-7 object-cover rounded border border-white/10" alt="p" />
                  {imgArr.length > 1 && <span className="text-[10px] text-white/50">+{imgArr.length - 1}</span>}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
              <ContextMenuItem onSelect={() => { setFullscreenIndex(0); setGalleryImgs(imgArr); }}>view</ContextMenuItem>
              <ContextMenuItem onSelect={() => { setEditorImage(imgArr[0]); setEditorOpen(true); }}>edit image</ContextMenuItem>
              <ContextMenuItem onSelect={() => window.open(imgArr[0], '_blank')}>open externally</ContextMenuItem>
              <ContextMenuItem onSelect={() => { navigator.clipboard.writeText(String(imgArr[0])); toast.success('copied'); }}>copy url</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      }
      return (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              onClick={() => setIsEditing(true)}
              onContextMenu={(e) => { e.stopPropagation(); }}
              className="h-full w-full flex items-center justify-center cursor-pointer opacity-20 hover:opacity-100"
            >
              <Paperclip className="h-3 w-3 text-white" />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onSelect={() => setIsEditing(true)}>add/upload</ContextMenuItem>
            <ContextMenuItem onSelect={() => setEditorOpen(true)}>open editor</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    if (isMarkdown) {
      return (
        <div onDoubleClick={() => setIsEditing(true)} className="cursor-pointer group relative min-h-[20px] w-full h-full overflow-hidden text-white/90">
          <div
            className={cn(
              "prose prose-invert prose-xs line-clamp-2 opacity-90",
              size === 'lg' ? "text-base" : "text-[11px]",
              "[&>p]:first:mt-0 [&>p]:mb-0 [&>p]:leading-[1.1]"
            )}
            style={{ marginLeft: 0 }}
          >
            <ReactMarkdown>{value || ''}</ReactMarkdown>
          </div>
          {!value && <span className="opacity-20 italic">empty</span>}
        </div>
      );
    }

    return (
      <div
        onDoubleClick={() => setIsEditing(true)}
        className={cn(
          "cursor-pointer hover:bg-white/5 px-0.5 py-0.5 rounded transition-colors min-h-[20px] break-words text-white/90 whitespace-normal",
          size === 'lg' ? "text-lg" : "text-sm",
          "[&]:first:mt-0 [&]:mb-0 [&]:leading-[1.1]",
          className
        )}
        style={{ wordBreak: 'break-word', minWidth: 0 }}
        title="double-click to edit"
      >
        {value || <span className="opacity-20 italic">empty</span>}
      </div>
    );
  };

  const viewContent = renderView();
  console.log('has viewContent', !!viewContent);
  console.log('about to return outer markup');
  return (
    <div className={cn("font-varela", size === 'lg' ? "text-lg" : "text-sm", "w-full h-full")}>
      <FieldContextMenu onEdit={() => setIsEditing(true)} onClear={() => onChange(null)} value={value} record={record} collectionName={collectionName}>
        {renderView()}
      </FieldContextMenu>
      {fullscreenIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 animate-in fade-in" onClick={() => setFullscreenIndex(null)}>
          <img src={galleryImgs[fullscreenIndex]} className="max-h-full max-w-full object-contain shadow-2xl" alt="fs" />
        </div>
      )}
      {editorOpen && editorImage && renderImageEditor(editorImage)}
    </div>
  );
}

}