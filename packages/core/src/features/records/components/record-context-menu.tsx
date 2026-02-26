import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppSetting } from '@/hooks/use-app-setting';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink, X, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmartField } from '@/components/fields/smart-field';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


interface RecordContextMenuProps {
  record: any;
  collection: any;
  children: React.ReactNode;
  onUpdate?: (id: string | number, data: any) => void;
  onDelete?: (rec: any) => void;
  onConfigChange?: (key: string, value: any) => void;
  config?: any;
  className?: string; // for wrapper styling
  style?: React.CSSProperties;
  titleField?: any;
}

export function RecordEditContent({ record, collection, onUpdate, onDelete, onView, titleField: customTitleField, config, onConfigChange, showViewConfig = true }: { record: any, collection: any, onUpdate?: any, onDelete?: any, onView?: any, titleField?: any, config?: any, onConfigChange?: any, showViewConfig?: boolean }) {
  const navigate = useNavigate();
  const [metadata, setMetadata] = useAppSetting<Record<string, { color?: string }>>(`record_meta_${collection?.name || 'unknown'}`, {});

  // identify title field once
  const titleField = customTitleField || collection.fields?.find((f: any) => f.name === 'title' || f.name === 'name') || collection.fields?.find((f: any) => f.interface === 'input');

  const [title, setTitle] = useState<string>(record[titleField?.name || 'title'] || '');

  // color state
  const [color, setColor] = useState(metadata[record.id]?.color || '');

  // update metadata (color)
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setMetadata({
      ...metadata,
      [record.id]: { ...metadata[record.id], color: newColor }
    });
  };

  // update record title
  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    if (titleField && onUpdate) {
      onUpdate(record.id, { [titleField.name]: newTitle });
    }
  };

  // fields to show in quick edit - allow all text-capable fields including ids
  const visibleFields = useMemo(() => {
    if (!collection?.fields) return [];
    return collection.fields.filter((f: any) =>
      f.name !== 'created_at' &&
      f.name !== 'updated_at'
    );
  }, [collection]);

  const [propertySearch, setPropertySearch] = useState('');

  const availableFields = useMemo(() => {
    if (!collection?.fields) return [];
    return collection.fields.filter((f: any) =>
      !config?.visibleFields?.includes(f.name) &&
      f.name !== 'created_at' &&
      f.name !== 'updated_at' &&
      (f.uiSchema?.title || f.name).toLowerCase().includes(propertySearch.toLowerCase())
    );
  }, [collection, config?.visibleFields, propertySearch]);

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* header: title & appearance */}
      <div className="p-4 border-b space-y-4 bg-neutral-900/50">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] font-bold text-muted-foreground ">title / name</Label>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleTitleChange(e.target.value)}
              className="h-8 font-semibold text-sm bg-[#050505] border-transparent hover:border-input focus:border-primary transition-colors text-white"
            />
          </div>
          <div className="space-y-1 flex flex-col items-center">
            <Label className="text-[10px] font-bold text-muted-foreground ">color</Label>
            <div className="relative group">
              <div className="w-8 h-8 rounded-full border-2 cursor-pointer shadow-sm transition-transform active:scale-95"
                style={{ backgroundColor: color || 'transparent', borderColor: color || 'currentColor' }}
              >
                {!color && <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground opacity-50">/</div>}
              </div>
            </div>
          </div>
        </div>

        {/* color swatches */}
        <div className="flex flex-wrap gap-1.5 justify-end">
          {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#64748b'].map(c => (
            <button
              key={c}
              className={cn("w-4 h-4 rounded-full transition-all hover:scale-125 focus:outline-none focus:ring-2 ring-ring", color === c ? "ring-2 ring-offset-1" : "")}
              style={{ backgroundColor: c }}
              onClick={() => handleColorChange(c)}
            />
          ))}
          <button
            className={cn("w-4 h-4 rounded-full border border-dashed border-muted-foreground flex items-center justify-center transition-all hover:scale-125", !color ? "ring-2 ring-offset-1 ring-ring" : "")}
            onClick={() => handleColorChange('')}
            title="no color"
          ><X className="w-2 h-2" /></button>
        </div>
      </div>

      {/* body: fields list */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3 p-1">
          {/* view properties management (max 3) - only when editing how card looks (right-click / view config) */}
          {showViewConfig && onConfigChange && (
            <div className="mb-4 p-2 border rounded-md bg-muted/20 space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground mb-2 block">display properties (max 3)</Label>
              <div className="space-y-1">
                {(config?.visibleFields || []).slice(0, 3).map((fName: string, idx: number) => {
                  const field = collection.fields?.find((f: any) => f.name === fName);
                  if (!field) return null;
                  return (
                    <div key={fName} className="flex items-center gap-2 bg-background border px-2 py-1 rounded-sm text-xs group">
                      <div className="flex-1 truncate lowercase opacity-80">{field.uiSchema?.title || field.name}</div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4"
                          disabled={idx === 0}
                          onClick={() => {
                            const newFields = [...config.visibleFields];
                            [newFields[idx - 1], newFields[idx]] = [newFields[idx], newFields[idx - 1]];
                            onConfigChange('visibleFields', newFields);
                          }}
                        >
                          <span className="text-[10px]">↑</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4"
                          disabled={idx === (config.visibleFields?.length || 0) - 1 || idx === 2}
                          onClick={() => {
                            const newFields = [...config.visibleFields];
                            [newFields[idx + 1], newFields[idx]] = [newFields[idx], newFields[idx + 1]];
                            onConfigChange('visibleFields', newFields);
                          }}
                        >
                          <span className="text-[10px]">↓</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 text-destructive"
                          onClick={() => {
                            onConfigChange('visibleFields', config.visibleFields.filter((f: string) => f !== fName));
                          }}
                        >
                          <X className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {(config?.visibleFields || []).length < 3 && (
                  <Popover onOpenChange={(open) => !open && setPropertySearch('')}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed lowercase">
                        <Plus className="w-3 h-3 mr-1" /> add property
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0 border border-border overflow-hidden shadow-xl z-[10001]" align="start" side="top">
                      <div className="p-2 border-b bg-muted/30">
                        <Input
                          placeholder="search properties..."
                          className="h-7 text-xs lowercase"
                          value={propertySearch}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertySearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <ScrollArea className="h-48">
                        <div className="p-1">
                          {availableFields.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-[10px] lowercase">no properties found</div>
                          ) : (
                            availableFields.map((f: any) => (
                              <Button
                                key={f.name}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs lowercase px-2"
                                onClick={() => {
                                  onConfigChange('visibleFields', [...(config?.visibleFields || []), f.name]);
                                  setPropertySearch('');
                                }}
                              >
                                {f.uiSchema?.title || f.name}
                              </Button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}

          <Label className="text-[10px] font-bold text-muted-foreground mb-2 block">all properties</Label>
          {visibleFields.length === 0 ? (
            <p className="text-xs text-muted-foreground lowercase py-2">no properties in this collection</p>
          ) : (
            visibleFields.map((field: any) => (
              <div key={field.name} className="gap-2 grid grid-cols-[100px_1fr] items-center group">
                <Label className="text-xs text-muted-foreground font-medium truncate group-hover:text-foreground transition-colors lowercase" title={field.uiSchema?.title || field.name}>
                  {field.uiSchema?.title || field.name}
                </Label>
                <div className="min-w-0">
                  <SmartField
                    field={field}
                    value={record[field.name]}
                    record={record}
                    collectionName={collection?.name}
                    className="h-8 text-sm"
                    onChange={(val: any) => {
                      if (onUpdate) onUpdate(record.id, { [field.name]: val });
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* footer: actions */}
      <div className="p-2 border-t bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 lowercase" title="delete" onClick={() => onDelete?.(record)}>
            <Trash2 className="w-3 h-3 mr-1.5" /> delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lowercase text-muted-foreground hover:text-foreground"
            onClick={() => {
              const url = `${window.location.origin}/databases/${collection.name}/${record.id}`;
              navigator.clipboard.writeText(url);
              toast.success("link copied");
            }}
          >
            <Plus className="w-3 h-3 mr-1.5 rotate-45" /> copy link
          </Button>
        </div>
        <div className="flex gap-2">
          {onUpdate && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs lowercase"
              onClick={async () => {
                try {
                  toast.info("duplicating...");
                  // Full duplication logic will be implemented as a separate feature.
                  // For now, it notifies the user of the intent.
                } catch (e) {
                  toast.error("duplication failed");
                }
              }}
            >
              duplicate
            </Button>
          )}
          <Button variant="secondary" size="sm" className="h-8 text-xs lowercase" onClick={() => onView ? onView() : navigate(`/databases/${collection.name}?view=table`)}>
            <ExternalLink className="w-3 h-3 mr-1.5 opacity-50" /> full view
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RecordContextMenu({ record, collection, children, onUpdate, onDelete, config, onConfigChange, className, style, titleField }: RecordContextMenuProps) {
  useAuth(); // kept for hook consistency if needed

  // ... touch logic ...
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchTimer.current = setTimeout(() => {
      const target = e.target as HTMLElement;
      const evt = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        buttons: 2
      });
      target.dispatchEvent(evt);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPos.current && touchTimer.current) {
      const dist = Math.sqrt(
        Math.pow(e.touches[0].clientX - touchStartPos.current.x, 2) +
        Math.pow(e.touches[0].clientY - touchStartPos.current.y, 2)
      );
      if (dist > 10) {
        clearTimeout(touchTimer.current);
        touchTimer.current = null;
      }
    }
  };

  if (!collection) return <>{children}</>;

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className={cn("h-full w-full interactive-el", className)} style={style} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove}>
            {children}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-[380px] p-0 bg-neutral-900 backdrop-blur-none border border-border/50 shadow-2xl flex flex-col max-h-[85vh] z-[9999]">
          {/* quick edit header with explicit edit button */}
          <div className="p-2 border-b flex justify-end">
            <Button
              variant="outline"
              size="xs"
              className="lowercase"
              onClick={() => setDialogOpen(true)}
            >
              edit
            </Button>
          </div>
          <RecordEditContent
            record={record}
            collection={collection}
            onUpdate={onUpdate}
            onDelete={onDelete}
            titleField={titleField}
            config={config}
            onConfigChange={onConfigChange}
          />
        </ContextMenuContent>
      </ContextMenu>

      {/* full popup dialog invoked by "edit" button above */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="lowercase">edit item</DialogTitle>
          </DialogHeader>
          <RecordEditContent
            record={record}
            collection={collection}
            onUpdate={onUpdate}
            onDelete={onDelete}
            titleField={titleField}
            config={config}
            onConfigChange={onConfigChange}
            showViewConfig={true}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}