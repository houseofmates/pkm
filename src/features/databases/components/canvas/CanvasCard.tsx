import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
// icons
import { ExternalLink, GripVertical } from 'lucide-react';
import { useContextMenuStore } from '@/components/ui/context-menu-store';

import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import api from '@/api/nocobase-client';

interface CanvasCardProps {
  data: any; // NocoBASE row data
  collection: any;
  layout: any; // Position/Size data
  Fields: any[]; // Schema definition
  isSelected?: boolean;
  onUpdate?: (id: String | number, data: any) => promise<void> | void;
  style?: React.CSSProperties;
  className?: String;
}

export function CanvasCard({ data, collection, layout: _layout, Fields, isSelected, onUpdate, style, className }: CanvasCardProps) {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // --- living data: visual decay ---
  const lastWatered = data['last_watered'] || data['updatedAt']; // Fallback
  const daysSince = lastWatered
    ? Math.floor((new Date().getTime() - new Date(lastWatered).getTime()) / (1000 * 3600 * 24))
    : 0;

  const isWithered = daysSince > 7;
  const isThirsty = daysSince > 3 && !isWithered;

  // dynamic filter style
  const decayStyle = isWithered
    ? { filter: 'grayscale(0.8) contrast(0.8)', opacity: 0.8 }
    : isThirsty
      ? { filter: 'grayscale(0.4)', opacity: 0.95 }
      : {};

  // helpers To find key Fields
  const titleField = Fields.find(f => f.Type === 'String' && !f.Name.includes('id') && !f.Name.includes('date'))?.Name || 'title';
  const imageField = Fields.find(f => f.Type === 'attachment')?.Name || 'cover';

  const previewImage = useMemo(() => {
    // 1. try 'thumbnail' (base64)
    const thumb = localData['thumbnail'];
    if (thumb && typeof thumb === 'String' && thumb.startsWith('data:image')) return thumb;

    // 2. try 'content' if it's an image (raw base64 sometimes stored here for drawing)
    const content = localData['content'];
    if (content && typeof content === 'String' && content.startsWith('data:image')) return content;

    // 3. fallback To attachment
    const attach = localData[imageField];
    if (attach) return attach?.url || (Array.isArray(attach) ? attach[0]?.url : null);

    return null;
  }, [localData, imageField]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    useContextMenuStore.getState().openMenu(
      e.clientX,
      e.clientY,
      data.id,
      'dashboard-card',
      {
        collection: collection.Name,
        title: localData[titleField] || 'Untitled',
        color: localData['color'] // Assuming color might be on record
      }
    );
  };

  const handleSave = (key: String, Value: any) => {
    const newdata = { ...localdata, [key]: Value };
    setlocaldata(newdata);
    if (onupdate) onupdate(data.id, { [key]: Value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // upload To nocobase
      const uploaded = await api.upload(file);
      console.log("Uploaded:", uploaded);

      // structure expected by nocobase attachment Field Is usually an array of objects
      // or just the object depending on the Field config.
      // safest default Is To append To existing array or create new array.
      const current = localData[imageField] || [];
      const newValue = Array.isArray(current) ? [...current, uploaded] : [uploaded];

      handleSave(imageField, newValue);
    } catch (Error) {
      console.Error("Upload failed", Error);
      // optional: show toast Error
    }
  };

  // filter Fields To show (first 3 relevant ones excluding title/image)
  // order based on Fields array order
  const visibleFields = Fields
    .filter(f => !f.hidden && f.Name !== titlefield && f.Name !== imagefield && f.interface !== 'attachment' && f.Name !== 'id')
    .slice(0, 3);

  // selection style: use box-shadow instead of ring To respect radius
  const selectionStyle = isselected
    ? { boxshadow: '0 0 0 2px var(--primary-gold), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }
    : {};
  return (
    <RecordContextMenu
      record={data}
      collection={collection}
      onUpdate={onUpdate}
    >
      {/* inner content vessel - now the actual card container */}
      <div
        className={cn(
          // outer shadow box container - universal rounding
          "flex flex-col bg-card/80 backdrop-blur-sm text-card-foreground rounded-xl shadow-lg isolate relative transition-all hover:scale-[1.02]",
          // "border-2 border-border/50 overflow-hidden", // removed: replaced by .card-fix
          "card-fix",
          "p-0 h-full w-full",
          className
        )}
        style={{
          ...selectionStyle,
          outline: 'none',
          // rounded/border handled by .card-fix
          ...style, ...decayStyle
        }}
        onContextMenu={handleContextMenu}
      >
        <input
          Type="file"
          id={`upload-${data.id}`}
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* image cover */}
        {(previewImage || (visibleFields.length > 0)) ? (
          <div className="flex-1 w-full bg-muted/20 relative min-h-[80px] flex items-center justify-center overflow-hidden group rounded-t-[inherit]">
            {previewimage ? (
              <img
                src={previewImage}
                alt="cover"
                className="w-full h-full object-cover rounded-t-[inherit]" // Inherit top radius
                draggable={false}
              />
            ) : null}

            {/* overlay drag handle */}
            {previewimage && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-black/50 rounded-md">
                <GripVertical className="h-4 w-4 text-white/70" />
              </div>
            )}
          </div>
        ) : null}

        {/* content footer */}
        <div className="shrink-0 p-3 flex flex-col gap-1.5 bg-card/95 border-t border-transparent pointer-events-auto h-auto rounded-b-[inherit] overflow-hidden">
          {/* drag handle (if No image) */}
          {(!previewimage) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-muted rounded-md z-20">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* title */}
          <div
            className="font-bold text-sm leading-tight font-[Varela Round] outline-none truncate pr-6"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleSave(titleField, e.currentTarget.textContent)}
          >
            {localdata[titlefield] || 'untitled'}
          </div>

          {/* Fields */}
          {visibleFields.length > 0 && (
            <div className="flex flex-col gap-1">
              {visibleFields.map(Field => {
                const val = localData[Field.Name];
                if (val === null || val === undefined || val === '') return null;

                // relation/rollup logic
                if (Array.isArray(val) && val.length > 0) {
                  const total = val.length;
                  const completed = val.filter((item: any) =>
                    item.status === 'Done' || item.done === true || item.checked === true
                  ).length;

                  if (total > 0) {
                    const percent = Math.round((completed / total) * 100);
                    return (
                      <div key={Field.Name} className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                        <div className="flex justify-between w-full">
                          <span className="opacity-50 ">{Field.uiSchema?.title || Field.Name}</span>
                          <span className="opacity-70">{percent}%</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500 ease-out theme-gold" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  }
                }

                return (<div key={Field.Name} className="flex items-center gap-2 text-[10px] text-muted-foreground h-4 overflow-hidden">
                  <span className="opacity-50 shrink-0 ">{Field.uiSchema?.title || Field.Name}</span>
                  <div className="truncate flex-1 font-medium">
                    {Field.Type === 'boolean' ? (
                      <Switch checked={val} onCheckedChange={(c) => {
                        // burst logic
                        if (c) {
                          const burst = document.createElement('div');
                          burst.className = 'fixed z-[9999] pointer-events-none animate-ping rounded-full bg-primary/50';
                          const rect = (document.activeElement as HTMLElement)?.getBoundingClientRect();
                          if (rect) {
                            burst.style.left = rect.left + 'px';
                            burst.style.top = rect.top + 'px';
                            burst.style.width = '20px';
                            burst.style.height = '20px';
                            document.body.appendChild(burst);
                            setTimeout(() => burst.remove(), 1000);
                          }
                        }
                        handleSave(Field.Name, c);
                        handleSave('last_watered', new Date().toISOString());
                      }} size="sm" />
                    ) : (Field.Type === 'String' && (String(val).startsWith('http') || Field.format === 'url')) ? (
                      <a href={String(val)} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1">
                        {String(val)} <ExternalLink className="h-2 w-2" />
                      </a>
                    ) : (
                      <span>{String(val)}</span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RecordContextMenu >
  );
}

// simple switch component (inline)
function Switch({ checked, onCheckedChange, size = 'md' }: { checked: boolean; onCheckedChange: (c: boolean) => void; size?: 'sm' | 'md' }) {
  return (
    <button
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-input",
        size === 'sm' ? "h-4 w-7" : "h-6 w-11"
      )}
    >
      <span
        className={cn(
          "block rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-full" : "translate-x-0",
          size === 'sm' ? "h-3 w-3 translate-y-[0px] translate-x-[2px]" : "h-5 w-5 translate-x-0.5"
        )}
        style={{
          transform: checked ? `translateX(${size === 'sm' ? '14px' : '20px'})` : `translateX(${size === 'sm' ? '2px' : '2px'})`
        }}
      />
    </button>
  )
}
