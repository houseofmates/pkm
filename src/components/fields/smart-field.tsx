import * as React from 'react';
import { useState, useEffect } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, X, Phone, Mail, MapPin, Lock, Terminal, Paperclip, Link as LinkIcon, Sparkles, Copy, Trash2, Edit2, Download, Pipette } from 'lucide-react';

import { LocationField } from './location-field';
import ReactMarkdown from 'react-markdown';
import RichEditor from '@/components/ui/rich-editor';
import { sanitizeHTML } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

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
      } catch (e) { console.error(e); }
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
  console.debug('[SmartField] mount', field?.name, value);  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [galleryImgs, setGalleryImgs] = useState<string[]>([]);

  // formula editor state
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);

  const { client } = useAuth() as any; // cast to any to bypass hook return type mismatch if context is undefined internally

  useEffect(() => {
    if (!isEditing) setLocalValue(value);
  }, [value, isEditing]);

  // saving accepts an optional value (e.g. RelationPicker passes the new record)
  const handleSave = (newVal?: any) => {
    const finalVal = newVal !== undefined ? newVal : localValue;
    onChange(finalVal);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  // --- helper for type detection ---
  // mapping complex user requests to nocobase/generic types
  const baseType = field?.interface || field?.type || 'string';
  const name = field?.name?.toLowerCase() || '';
  const strValue = String(value || '');

  // enhanced detection: if it's a generic string, check content
  const detectedType = (() => {
    if (baseType !== 'string' && baseType !== 'text' && baseType !== 'input') return baseType;

    // email detection (even if no .com)
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(strValue)) return 'email';

    // phone detection (10 digits)
    const digits = strValue.replace(/\D/g, '');
    if (digits.length === 10) return 'phone';

    // password/secret detection (4+ digits, no decimals)
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
  const isCode =
    detectedType === 'code' ||
    name === 'code' ||
    name === 'formula' ||
    field?.type === 'formula'; // Added formula support
  const isMarkdown = detectedType === 'markdown' || detectedType === 'richText' || name.includes('desc') || name.includes('note');
  const isNumber = detectedType === 'number' || detectedType === 'integer' || detectedType === 'percent';
  const isPercentField = field?.type === 'percent' || name.includes('percent');
  const isUrl = detectedType === 'url' || detectedType === 'link' || name.includes('link') || name.includes('url');
  const isFile = detectedType === 'attachment' || name.includes('file') || name.includes('image') || name.includes('avatar');

  // date/time detection
  const isDateTime = detectedType === 'datetime' || field?.interface === 'datetime' || name.includes('datetime');
  const isTime = detectedType === 'time' || name.includes('time');
  const isDate = !isTime && (detectedType === 'date' || name.includes('date') || name.includes('created'));

  const isId = name === 'id' || name === 'uuid' || detectedType === 'uid' || detectedType === 'uuid';
  const isRelation =
    detectedType === 'relation' ||
    detectedType === 'linkToAnotherRecord' ||
    field?.interface === 'linkToAnotherRecord' ||
    detectedType === 'subTable' ||
    baseType === 'hasOne' ||
    baseType === 'hasMany' ||
    baseType === 'belongsTo' ||
    baseType === 'belongsToMany'; // include common nocobase relation interfaces

  // json/object fallback
  // avoid treating null as an object/json literal
  const isJson =
    detectedType === 'json' ||
    detectedType === 'array' ||
    detectedType === 'object' ||
    (typeof value === 'object' && value !== null);

  // --- special formatters ---
  const formatPhoneNumber = (val: string) => {
    const d = val.replace(/\D/g, '');
    if (d.length === 10) {
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }
    return val;
  };

  const handlePhoneClick = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
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
      // format: (lowercase) dec. 25, '93
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
      if (isNaN(t.getTime())) {
        // fallback to raw string when Date parse fails (e.g. simple '12:30')
        return dateStr;
      }
      return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return dateStr; }
  };

  const formatNumber = (val: any) => {
    if (field?.type === 'percent' || name.includes('percent')) return `${val}%`;
    return val;
  }

  // --- editors ---
  if (isEditing) {
    // ... (previous editors: location, markdown/code, select, color) ...

    if (isLocation) {
      return (
        <div className="w-[400px] bg-background border p-2 rounded shadow-xl z-50 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-xs">set location</span>
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-none z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-3xl h-[80vh] border-2 border-primary/50 flex flex-col overflow-hidden shadow-none rounded-none">
            <div className="p-2 border-b-2 border-primary/20 flex justify-between items-center bg-muted/50">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="font-mono text-sm font-bold">rich text editor</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave()} className="rounded-none border border-primary/50 hover:bg-primary hover:text-primary-foreground">save</Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} className="rounded-none hover:bg-destructive hover:text-destructive-foreground">cancel</Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <RichEditor
                value={localValue && String(localValue).trim().startsWith('<') ? localValue : (localValue ? `<p>${String(localValue).replace(/\n/g, '<br/>')}</p>` : '')}
                onChange={(html: string) => setLocalValue(sanitizeHTML(html))}
                uploadImage={async (file: File) => {
                  try {
                    const res = await client?.upload(file);
                    return res?.data?.url || '';
                  } catch (e) {
                    console.error('upload failed', e);
                    throw e;
                  }
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (isFile) {
      const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const res = await client?.upload(file);
          const newValue = res?.data?.url;
          if (newValue) {
            // for multi-file fields, we should append to the existing array
            if (field.interface === 'attachments' || field.type === 'attachments') {
              const current = Array.isArray(localValue) ? localValue : [];
              setLocalValue([...current, { url: newValue }]);
            } else {
              setLocalValue(newValue);
            }
          }
        } catch (err) {
          toast.error("file upload failed");
          console.error(err);
        }
      };

      return (
        <div className="flex items-center gap-2 border border-primary p-1 bg-background min-w-[200px]">
          <Input
            placeholder="paste url or upload..."
            value={localValue || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
            className="h-8 text-xs border-none focus-visible:ring-0 focus:outline-none rounded-none"
          />
          <div className="relative">
            <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-6" onChange={handleFileChange} />
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave()}><Check className="h-3 w-3" /></Button>
        </div>
      )
    }

    if (isDate || isDateTime || isTime) {
      // when time or datetime is requested, fall back to native input for simplicity
      if (isDateTime || isTime) {
        const inputType = isDateTime ? 'datetime-local' : 'time';
        return (
          <div className="flex items-center gap-1">
            <Input
              type={inputType}
              value={localValue || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
              className="h-8 text-xs"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave(localValue)}><Check className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
          </div>
        );
      }

      // date only picker remains calendar popover
      return (
        <Popover open={true} onOpenChange={(open) => { if (!open) handleSave(); }}>
          <PopoverTrigger asChild>
            {/* use visible trigger to ensure correct positioning and prevent cell collapse */}
            <div className="nav-button cursor-pointer text-xs min-h-[20px] min-w-[50px] whitespace-nowrap">
              {formatDate(localValue)} {formatTime(localValue) || <span className="opacity-50">select date...</span>}
            </div>
          </PopoverTrigger>
          {/* use standard popover which portals to body */}
          <PopoverContent className="w-auto p-0" align="start" collisionPadding={16}>
            <Calendar
              mode="single"
              selected={localValue ? new Date(localValue) : undefined}
              onSelect={(d: Date | undefined) => {
                if (d) {
                  setLocalValue(d.toISOString());
                  // slight delay to allow visual feedback before closing
                  setTimeout(() => {
                    onChange(d.toISOString());
                    setIsEditing(false);
                  }, 100);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (isMultiSelect) {
      const options = field?.uiSchema?.enum || [{ label: 'option 1', value: 'opt1' }, { label: 'option 2', value: 'opt2' }];
      const currentArray: string[] = Array.isArray(localValue) ? localValue : [];
      const toggleOption = (val: string) => {
        const exists = currentArray.includes(val);
        let next;
        if (exists) next = currentArray.filter(v => v !== val);
        else next = [...currentArray, val];
        setLocalValue(next);
      };

      return (
        <div className="flex flex-col gap-2 p-2 bg-background border rounded-md">
          {options.map((opt: any) => (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                id={`checkbox-${opt.value}`}
                checked={currentArray.includes(opt.value)}
                onCheckedChange={() => toggleOption(opt.value)}
              />
              <label htmlFor={`checkbox-${opt.value}`} className="text-sm">{opt.label}</label>
            </div>
          ))}
          <div className="flex justify-end gap-1 mt-2">
            <Button size="sm" className="h-6 text-xs" onClick={() => handleSave()}>done</Button>
          </div>
        </div>
      );
    }

    if (isSelect) {
      const options = field?.uiSchema?.enum || [{ label: 'option 1', value: 'opt1' }, { label: 'option 2', value: 'opt2' }];
      if (field.interface === 'radioGroup') {
        return (
          <div className="flex flex-col gap-2 p-2 bg-background border rounded-md">
            {options.map((opt: any) => (
              <div key={opt.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`radio-${opt.value}`}
                  name={field.name}
                  value={opt.value}
                  checked={localValue === opt.value}
                  onChange={(e) => setLocalValue(e.target.value)}
                />
                <label htmlFor={`radio-${opt.value}`} className="text-sm">{opt.label}</label>
              </div>
            ))}
            <div className="flex justify-end gap-1 mt-2">
              <Button size="sm" className="h-6 text-xs" onClick={() => handleSave()}>done</Button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1">
          <Select value={localValue} onValueChange={setLocalValue}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="select..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave()}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
        </div>
      )
    }

    if (isColor) {
      return (
        <div className="flex items-center gap-2 p-1 bg-card border rounded shadow-lg">
          <input
            type="color"
            value={localValue || '#000000'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
            className="h-8 w-8 cursor-pointer border-0 p-0 rounded overflow-hidden"
          />
          <Input
            value={localValue || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
            className="h-8 w-24 text-xs font-mono"
            placeholder="#hex"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave()}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
        </div>
      )
    }

    if (isRelation) {
      // relation editor: simple picker that fetches target records
      // we need to fetch the target collection list.
      // assumption: field.target is the collection name of the relation.
      return (
        <RelationPicker
          field={field}
          value={localValue}
          onChange={(v: any) => {
            // if a specific property was configured, store only that value
            const out = field.property && v ? v[field.property] : v;
            setLocalValue(out);
            handleSave(out);
          }}
          onCancel={handleCancel}
        />
      );
    }

    if (isJson) {
      return (
        <div className="flex flex-col gap-1 min-w-[200px] bg-background border p-2 rounded shadow-lg">
          <div className="text-[10px] font-bold text-muted-foreground opacity-50 mb-1">json/object editor</div>
          <textarea
            autoFocus
            value={typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2)}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setLocalValue(e.target.value)}
            className="w-full h-32 text-[10px] font-mono bg-[#050505] text-green-400 p-2 border border-primary/20 focus:outline-none"
          />
          <div className="flex justify-end gap-1 mt-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => {
              try {
                const parsed = typeof localValue === 'string' ? JSON.parse(localValue) : localValue;
                onChange(parsed);
                setIsEditing(false);
              } catch (e) {
                toast.error("invalid json format");
              }
            }}><Check className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )
    }

    return (
      <div className={cn("flex items-center gap-1 min-w-[120px] bg-background relative z-10", className)}>
        <Input
          autoFocus
          type={isNumber ? "number" : "text"}
          value={localValue || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
          className={cn("h-8 text-xs border-0 shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none", inputClassName)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        {isPercentField && <span className="text-xs">%</span>}
        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-600" onClick={() => handleSave()}>
          <Check className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={handleCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }


  // --- view mode ---

  const renderView = () => {
    if (isId) return <span className={cn("font-mono opacity-50 select-text font-varela", size === 'lg' ? "text-lg" : "text-[10px]")}>{value?.toString()}</span>;

    if (isRelation) {
      // prepare display value: if object, show title/name or property.
      let display = '';
      if (Array.isArray(value)) {
        display = value
          .map(v => {
            if (field.property && v && typeof v === 'object') return v[field.property];
            return v?.title || v?.name || v?.id || JSON.stringify(v);
          })
          .join(', ');
      } else if (typeof value === 'object' && value !== null) {
        if (field.property && value[field.property] !== undefined) {
          display = String(value[field.property]);
        } else {
          display = value.title || value.name || value.id || JSON.stringify(value);
        }
      } else {
        display = String(value || '');
      }

      return (
        <div
          className="flex items-center gap-1 cursor-pointer font-varela"
          onClick={() => setIsEditing(true)}
        >
          <div className={cn("px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 truncate max-w-[200px]", size === 'lg' ? "text-lg" : "text-xs")}>
            {display || <span className="opacity-50 italic">empty relation</span>}
          </div>
        </div>
      )
    }

    if (isDateTime) {
      return (
        <div onClick={() => setIsEditing(true)} className={cn("cursor-pointer font-varela", size === 'lg' ? "text-lg" : "text-xs")}>{formatDate(value)} {formatTime(value)}</div>
      );
    }

    if (isTime) {
      return (
        <div onClick={() => setIsEditing(true)} className={cn("cursor-pointer font-varela", size === 'lg' ? "text-lg" : "text-xs")}>{formatTime(value)}</div>
      );
    }

    if (isPhone) {
      return (
        <div
          className={cn("text-primary hover:underline flex items-center gap-1 cursor-pointer font-varela", size === 'lg' ? "text-lg" : "text-xs")}
          onClick={(e) => handlePhoneClick(e, strValue)}
        >
          <Phone className="h-3 w-3" />
          {formatPhoneNumber(strValue)}
        </div>
      );
    }

    if (isEmail) {
      return (
        <a
          href={`mailto:${strValue}`}
          className={cn("text-primary hover:underline flex items-center gap-1 truncate max-w-[200px] font-varela", size === 'lg' ? "text-lg" : "text-sm")}
          onClick={e => e.stopPropagation()}
        >
          <Mail className="h-3 w-3" />
          {strValue}
        </a>
      );
    }

    if (isUrl) return <a href={value} target="_blank" rel="noopener noreferrer" className={cn("text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[150px] font-varela", size === 'lg' ? "text-lg" : "text-sm")} onClick={e => e.stopPropagation()}><LinkIcon className="h-3 w-3" /> {value}</a>;

    if (isDate) return <div onClick={() => setIsEditing(true)} className={cn("cursor-pointer font-varela", size === 'lg' ? "text-lg" : "text-xs")}>{formatDate(value)} {formatTime(value)}</div>;

    if (isPassword) {
      return (
        <div
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group"
          title="click to edit/reveal"
        >
          <Lock className="h-3 w-3" />
          <span className={cn("font-mono group-hover:hidden", size === 'lg' ? "text-base" : "text-xs")}>••••••••</span>
          <span className={cn("font-mono hidden group-hover:inline opacity-50", size === 'lg' ? "text-sm" : "text-[10px]")}>{strValue.slice(0, 1)}***{strValue.slice(-1)}</span>
        </div>
      );
    }

    if (isColor) {
      return (
        <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: value || 'transparent' }} />
          <span className={cn("font-mono opacity-80 group-hover:opacity-100", size === 'lg' ? "text-lg" : "text-xs")}>{value}</span>
        </div>
      );
    }

    if (isCheckbox) {
      return (
        <div
          className="flex items-center justify-center h-full w-full cursor-pointer"
          onClick={() => onChange(!value)}
        >
          <Checkbox
            checked={!!value}
            className={cn("data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black border-muted-foreground", !value && "opacity-50")}
            onCheckedChange={(checked: boolean) => onChange(checked)}
          />
        </div>
      )
    }

    if (isFile) {
      // normalize to array of urls
      const imgs: string[] = [];
      if (Array.isArray(value)) {
        value.forEach((v: any) => {
          if (!v) return;
          if (typeof v === 'string') imgs.push(v);
          else if (v.url) imgs.push(v.url);
        });
      } else if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
        imgs.push(value);
      } else if (value?.url) {
        imgs.push(value.url);
      }

      if (imgs.length > 0) {
        return (
          <div className="flex items-center justify-center gap-1 h-full w-full overflow-hidden px-1">
            <div
              className="cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
              onClick={(e) => { e.stopPropagation(); setFullscreenIndex(0); setGalleryImgs(imgs); }}
            >
              {imgs.slice(0, 1).map((u, i) => (
                <img
                  key={i}
                  src={u}
                  className="h-7 w-7 object-cover rounded shadow-sm border border-white/10"
                  alt="preview"
                  onError={(e) => {
                    (e.target as any).style.display = 'none';
                  }}
                />
              ))}
              {imgs.length > 1 && (
                <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-1 rounded">+{imgs.length - 1}</span>
              )}
            </div>

            {/* fullscreen viewer */}
            {fullscreenIndex !== null && (
              <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
                <div className="absolute top-4 right-4 flex gap-2 z-50">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={async () => {
                      if ('EyeDropper' in window) {
                        try {
                          // @ts-ignore
                          const eyeDropper = new window.EyeDropper();
                          // @ts-ignore
                          const result = await eyeDropper.open();
                          navigator.clipboard.writeText(result.sRGBHex);
                          toast.success(`copied ${result.sRGBHex}`);
                        } catch (e) { console.error(e); }
                      } else {
                        toast.error("color picker not supported");
                      }
                    }}
                    title="pick color"
                  >
                    <Pipette className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = galleryImgs[fullscreenIndex!];
                      link.download = `image-${fullscreenIndex}.jpg`;
                      link.target = "_blank";
                      link.click();
                    }}
                    title="download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setFullscreenIndex(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 relative">
                  <img
                    src={galleryImgs[fullscreenIndex!]}
                    className="max-h-full max-w-full object-contain shadow-2xl"
                    alt="fullscreen"
                  />
                  {galleryImgs.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-0"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setFullscreenIndex(prev => (prev === null || prev === 0) ? galleryImgs.length - 1 : prev - 1);
                        }}
                      >
                        ←
                      </Button>
                      <Button
                        variant="outline"
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-0"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setFullscreenIndex(prev => (prev === null || prev === galleryImgs.length - 1) ? 0 : prev + 1);
                        }}
                      >
                        →
                      </Button>
                    </>
                  )}
                </div>
                <div className="pb-4 text-center text-white/50 text-sm">
                  {fullscreenIndex! + 1} / {galleryImgs.length}
                </div>
              </div>
            )}
          </div>
        )
      }

      return (
        <div
          onClick={() => setIsEditing(true)}
          className="h-full w-full flex items-center justify-center cursor-pointer opacity-20 hover:opacity-100 transition-opacity"
        >
          <Paperclip className="h-3 w-3" />
        </div>
      );
    }

    if (isSelect) {
      return (
        <div onClick={() => setIsEditing(true)} className={cn("cursor-pointer hover:bg-muted/50 px-2 py-0.5 rounded border border-transparent hover:border-muted-foreground/20 font-varela", size === 'lg' ? "text-lg" : "text-sm")}>
          {value || <span className="opacity-40">Select...</span>}
        </div>
      )
    }

    if (isLocation) {
      return (
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer group">
              <MapPin className="h-4 w-4 text-primary group-hover:animate-bounce" />
              <span className={cn("truncate max-w-[150px] underline decoration-dotted text-muted-foreground group-hover:text-primary font-varela", size === 'lg' ? "text-lg" : "text-sm")}>
                {value ? 'view map' : 'set location'}
              </span>
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100" onClick={(e: MouseEvent) => { e.stopPropagation(); setIsEditing(true); }}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl h-[500px]">
            <LocationField value={value} onChange={() => { }} readOnly={true} />
          </DialogContent>
        </Dialog>
      );
    }

    if (isMarkdown) {
      return (
        <div
          onDoubleClick={() => setIsEditing(true)}
          className="cursor-pointer group relative min-h-[20px] font-varela w-full h-full overflow-hidden"
        >
          <div className={cn(
            "prose prose-invert prose-xs line-clamp-2 leading-tight opacity-90 group-hover:opacity-100 transition-opacity",
            "prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-li:my-0 pb-0.5 pt-0.5",
            size === 'lg' ? "text-base" : "text-[11px]"
          )}>
            <ReactMarkdown>{value || ''}</ReactMarkdown>
          </div>
          {!value && <span className={cn("opacity-20 italic font-varela", size === 'lg' ? "text-lg" : "text-xs")}>Empty</span>}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity">
            <Edit2 className="h-2.5 w-2.5" />
          </div>
        </div>
      )
    }

    if (isJson) {
      return (
        <div onClick={() => setIsEditing(true)} className={cn("cursor-pointer font-mono bg-muted px-1 rounded text-muted-foreground truncate max-w-[150px] hover:text-foreground hover:bg-muted/80", size === 'lg' ? "text-sm" : "text-[10px]")}>
          {JSON.stringify(value)}
        </div>
      )
    }

    if (isCode) {
      return (
        <div className="flex items-center gap-2 font-varela">
          <div onClick={() => { setIsEditing(true); setShowFormulaEditor(true); }} className={cn("cursor-pointer font-mono bg-muted px-1 rounded text-muted-foreground truncate max-w-[100px] hover:text-foreground hover:bg-muted/80", size === 'lg' ? "text-sm" : "text-[10px]")}>
            {value ? '<script...>' : 'empty code'}
          </div>
          {value && (
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-5 text-[10px] px-1" title="run" onClick={() => {
                try {
                  const func = new Function('record', 'api', value);
                  func(record, client); // Run with context
                  toast.success("script executed");
                } catch (e) {
                  alert("Error running code: " + e);
                }
              }}>
                <Terminal className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-5 text-[10px] px-1" title="ai edit" onClick={() => { setIsEditing(true); setShowFormulaEditor(true); }}>
                <Sparkles className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )
    }

    if (isNumber) {
      return (
        <div
          onClick={() => {
            console.debug('[SmartField] number cell clicked', field?.name, value);
            setIsEditing(true);
          }}
          className={cn("cursor-pointer text-right min-h-[20px] font-varela", size === 'lg' ? "text-lg" : "text-sm")}
        >
          {value !== null && value !== undefined ? formatNumber(value) : <span className="opacity-20">-</span>}
        </div>
      );
    }

    // default string
    return (
      <div
        onClick={() => {
          console.debug('[SmartField] string cell clicked', field?.name, value);
          setIsEditing(true);
        }}
        onContextMenu={(e) => {
          console.debug('[SmartField] contextmenu on cell', field?.name, value);
        }}
        className={cn(
          "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors min-h-[20px] break-words font-varela",
          size === 'lg' ? "text-lg" : "text-sm",
          className
        )}
        title="click to edit"
      >
        {value || <span className={cn("opacity-20 italic font-varela", size === 'lg' ? "text-lg" : "text-xs")}>empty</span>}
      </div>
    );

  }

  return (
    <div className={cn("font-varela", size === 'lg' ? "text-lg" : "text-sm")}>
      <FieldContextMenu onEdit={() => setIsEditing(true)} onClear={() => onChange(null)} value={value} record={record} collectionName={collectionName}>
        {renderView()}
      </FieldContextMenu>
    </div>
  );
}
