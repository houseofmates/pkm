import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, Phone, Mail, Lock, Terminal, Paperclip, Link as LinkIcon, Copy, Trash2, Edit2 } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [galleryImgs, setGalleryImgs] = useState<string[]>([]);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpness: 0, clarity: 0 });
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<{ points: { x: number; y: number }[]; color: string; width: number }[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ points: { x: number; y: number }[]; color: string; width: number } | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const { client } = useAuth() as any;

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
      strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        stroke.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
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
      strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        stroke.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
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
      if (isDrawing) {
        const stroke = { points: [{ x, y }], color: '#3b82f6', width: 3 };
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
        setCrop({ ...crop, w: x - crop.x, h: y - crop.y });
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
              <Button size="sm" variant="ghost" onClick={() => { setStrokes([]); setCrop(null); setFilters({ brightness:100, contrast:100, saturation:100, hue:0, blur:0, sharpness:0, clarity:0 }); }}>reset</Button>
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
                <div className="absolute border border-primary/70 bg-primary/10" style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }} />
              )}
              {currentStroke && currentStroke.points.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none">
                  <polyline
                    points={currentStroke.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={currentStroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="w-80 border-l border-[#222] p-4 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">draw mode</span>
                <Button size="sm" variant={isDrawing ? 'secondary' : 'outline'} onClick={() => setIsDrawing(!isDrawing)}>{isDrawing ? 'drawing...' : 'markup'}</Button>
              </div>
              {['brightness','contrast','saturation','hue','blur','clarity','sharpness'].map((key) => {
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
      const options = field?.uiSchema?.enum || [];
      return (
        <div className="flex items-center gap-1 bg-[#111] border border-[#333] p-1 rounded min-w-[150px]">
          <Select value={localValue} onValueChange={setLocalValue}>
            <SelectTrigger className="h-7 border-0 bg-transparent text-white text-xs">
              <SelectValue placeholder="select..." />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-[#333] text-white">
              {options.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleSave()}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50" onClick={handleCancel}><X className="h-3 w-3" /></Button>
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

    if (isPhone) return <div className={cn("text-primary hover:underline flex items-center gap-1 cursor-pointer", size === 'lg' ? "text-lg" : "text-xs")} onClick={(e) => handlePhoneClick(e, strValue)}><Phone className="h-3 w-3" /> {formatPhoneNumber(strValue)}</div>;
    if (isEmail) return <a href={`mailto:${strValue}`} className={cn("text-primary hover:underline flex items-center gap-1 w-full", size === 'lg' ? "text-lg" : "text-sm")} onClick={e => e.stopPropagation()}><Mail className="h-3 w-3" /> {strValue}</a>;
    if (isUrl) return <a href={value} target="_blank" rel="noopener noreferrer" className={cn("text-blue-400 hover:underline flex items-center gap-1 w-full", size === 'lg' ? "text-lg" : "text-sm")} onClick={e => e.stopPropagation()}><LinkIcon className="h-3 w-3" /> {value}</a>;
    if (isPassword) return <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="cursor-pointer flex items-center gap-1 text-white/30 hover:text-white/60"><Lock className="h-3 w-3" /> <span className="font-mono">••••••••</span></div>;
    if (isColor) return <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer group"><div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: value || 'transparent' }} /><span className={cn("font-mono text-white/70 text-xs", size === 'lg' && "text-base")}>{value}</span></div>;
    if (isCheckbox) return <div className="flex items-center justify-center h-full w-full cursor-pointer" onClick={() => onChange(!value)}><Checkbox checked={!!value} className="data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black border-white/20" onCheckedChange={(checked: boolean) => onChange(checked)} /></div>;

    if (isFile) {
      const imgs: string[] = Array.isArray(value) ? value.map((v: any) => v?.url || v).filter(Boolean) : (value?.url || (typeof value === 'string' && value.startsWith('http') ? value : null));
      const imgArr = Array.isArray(imgs) ? imgs : (imgs ? [imgs] : []);
      if (imgArr.length > 0) {
        return (
          <div className="flex items-center justify-center gap-1 h-full w-full overflow-hidden px-1">
            <div
              className="cursor-pointer flex items-center gap-1 transition-transform hover:scale-110"
              onClick={(e) => { e.stopPropagation(); setFullscreenIndex(0); setGalleryImgs(imgArr); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setEditorImage(imgArr[0]); setEditorOpen(true); }}
            >
              <img src={imgArr[0]} className="h-7 w-7 object-cover rounded border border-white/10" alt="p" />
              {imgArr.length > 1 && <span className="text-[10px] text-white/50">+{imgArr.length - 1}</span>}
            </div>
          </div>
        );
      }
      return <div onClick={() => setIsEditing(true)} onContextMenu={(e) => { e.preventDefault(); setEditorOpen(true); }} className="h-full w-full flex items-center justify-center cursor-pointer opacity-20 hover:opacity-100"><Paperclip className="h-3 w-3 text-white" /></div>;
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
