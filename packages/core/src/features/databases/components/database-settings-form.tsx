
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Image as ImageIcon, Filter, ArrowUpDown, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppSetting } from '@/hooks/use-app-setting';
import { IconPicker } from '@/components/icon-picker-dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// color palette
const COLORS = [
  'var(--primary)', '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E',
  '#71717a', '#ffffff'
];

interface DatabaseSettingsFormProps {
  collectionName: string; // ID or Name
  title?: string;
  viewConfig?: Record<string, any>;
  fields?: any[];
  currentView?: string; // Optional: current active view
  onUpdateConfig?: (key: string, val: any) => void;
  onUpdateMetadata?: (updates: any) => void; // Name, Icon, Color
  onDelete?: () => void;
  isPage?: boolean;
}

export function DatabaseSettingsForm({
  collectionName,
  title,
  viewConfig = {},
  fields = [],
  currentView,
  onUpdateConfig,
  onUpdateMetadata,
  onDelete,
  isPage = false
}: DatabaseSettingsFormProps) {
  const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {}, { pollIntervalMs: 3000 });
  const info = metadata[collectionName] || {};

  const [localName, setLocalName] = useState(title || info.title || collectionName);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // filter/sort state
  const currentSort = viewConfig.sort?.[0] || '';

  // helpers
  const updateMeta = (key: string, val: any) => {
    const next = { ...metadata, [collectionName]: { ...metadata[collectionName], [key]: val } };
    setMetadata(next);
    onUpdateMetadata?.({ [key]: val });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'image') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (type === 'icon') {
          updateMeta('icon', res);
          updateMeta('icontype', 'image');
        } else {
          updateMeta('image', res); // associated image / cover
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-semibold text-sm">settings</span>
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={onDelete} title="delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* general meta */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground ">name</Label>
          <Input
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              updateMeta('title', e.target.value);
            }}
            className="h-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground ">icon</Label>
            <div className="flex gap-1">
              {/* icon picker trigger - assume generic icon picker available or simple usage */}
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8" onClick={() => setIconPickerOpen(true)}>
                {info.icontype === 'image' ? (
                  <img src={info.icon} className="h-4 w-4 object-contain" />
                ) : (
                  <span className="text-xs">{info.icon || 'Select'}</span>
                )}
              </Button>
              {/* hidden upload for icon */}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'icon')} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} title="upload icon">
                <Upload className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground ">color</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full h-8 px-2 flex gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: info.color || 'var(--primary)' }} />
                  <span className="text-xs opacity-50">pick</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="grid grid-cols-7 gap-1">
                  {COLORS.map(c => (
                    <Button
                      key={c}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full border border-border/50 hover:scale-110 transition-transform p-0"
                      style={{ backgroundColor: c }}
                      onClick={() => updateMeta('color', c)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground ">associated image</Label>
          <div className="flex gap-2">
            <Input disabled value={info.image ? 'image set' : 'none'} className="h-8 text-xs flex-1" />
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'image')} />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => coverInputRef.current?.click()} title="upload cover">
              <ImageIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* default view setting */}
      {currentView && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground ">default view</Label>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-8"
            onClick={() => updateMeta('default_view', currentView)}
          >
            <Star className={cn("h-3 w-3", info.default_view === currentView ? "fill-yellow-500 text-yellow-500" : "")} />
            <span className="text-xs">
              {info.default_view === currentView ? 'Current view is default' : `Set "${currentView}" as default`}
            </span>
          </Button>
        </div>
      )}

      <Separator />

      {/* view config (sort/filter etc) */}
      {!isPage && onUpdateConfig && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <ArrowUpDown className="h-3 w-3" /> sort
            </Label>
            <Select value={currentSort || '_none'} onValueChange={(v) => onUpdateConfig?.('sort', v === '_none' ? [] : [v])}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="sort by..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">none</SelectItem>
                <SelectItem value="-created_at">newest first</SelectItem>
                <SelectItem value="created_at">oldest first</SelectItem>
                {fields.map(f => (
                  <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <Filter className="h-3 w-3" /> filter
            </Label>
            <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs text-muted-foreground" disabled>
              advanced filter (coming soon)
            </Button>
          </div>
        </div>
      )}

      <Separator />

      {/* view specific settings */}
      {(['gallery', 'list', 'calendar', 'timeline', 'gantt'].includes(currentView || '')) && onUpdateConfig && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground ">{currentView} appearance</Label>

          {/* cover image field (gallery/list) */}
          {(currentView === 'gallery' || currentView === 'list') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">cover image / icon</Label>
              <Select
                value={viewConfig.coverField || '_default'}
                onValueChange={(v) => onUpdateConfig('coverField', v === '_default' ? undefined : v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="auto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_default">auto (first image)</SelectItem>
                  {fields.filter(f => f.interface === 'attachment' || f.name.includes('img') || f.name.includes('cover') || f.name.includes('icon')).map(f => (
                    <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* date field (calendar/timeline/gantt) */}
          {(currentView === 'calendar' || currentView === 'timeline' || currentView === 'gantt') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">primary date field</Label>
              <Select
                value={viewConfig.dateField || '_default'}
                onValueChange={(v) => onUpdateConfig('dateField', v === '_default' ? undefined : v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="auto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_default">auto (nearest date)</SelectItem>
                  {fields.filter(f => f.type === 'date' || f.interface === 'date' || f.type === 'datetime' || f.interface === 'datetime').map(f => (
                    <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* title field */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">display title</Label>
            <Select
              value={viewConfig.titleField || '_default'}
              onValueChange={(v) => onUpdateConfig('titleField', v === '_default' ? undefined : v)}
            >
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="auto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_default">auto</SelectItem>
                {fields.filter(f => f.interface === 'input' || f.type === 'string' || f.name === 'title' || f.name === 'label' || f.name === 'name').map(f => (
                  <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* visible properties */}
          <div className="space-y-2 pt-1">
            <Label className="text-[10px] text-muted-foreground">visible properties / metadata</Label>
            <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-1">
              {fields.map(f => {
                const isChecked = (viewConfig.visibleFields || []).includes(f.name);
                return (
                  <div key={f.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vf-${f.name}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const current = viewConfig.visibleFields || [];
                        const next = checked
                          ? [...current, f.name]
                          : current.filter((n: string) => n !== f.name);
                        onUpdateConfig('visibleFields', next);
                      }}
                    />
                    <Label htmlFor={`vf-${f.name}`} className="text-xs lowercase cursor-pointer select-none">
                      {f.uiSchema?.title || f.name}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <IconPicker
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        onSelect={(icon, type) => {
          updateMeta('icon', icon);
          updateMeta('iconType', type);
        }}
      />
    </div>
  );
}