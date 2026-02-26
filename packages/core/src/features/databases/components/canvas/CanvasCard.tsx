import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
// icons
import { ExternalLink, GripVertical } from 'lucide-react';
import { useContextMenuStore } from '@/components/ui/context-menu-store';

import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import api from '@/api/nocobase-client';
import { SmartField } from '@/components/fields/smart-field';

interface CanvasCardProps {
  data: any; // NocoBASE row data
  collection: any;
  layout: any; // Position/Size data
  fields: any[]; // Schema definition
  isSelected?: boolean;
  onUpdate?: (id: string | number, data: any) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function CanvasCard({ data, collection, layout: _layout, fields, isSelected, onUpdate, style, className }: CanvasCardProps) {
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

  // helpers to find key fields
  const titleField = fields.find(f => f.name === 'title' || f.name === 'name' || f.primary) || fields.find(f => f.type === 'string' && !f.name.includes('id') && !f.name.includes('date')) || { name: 'id' };
  const imageField = fields.find(f => f.type === 'attachment')?.name || 'cover';

  const previewImage = useMemo(() => {
    // 1. try 'thumbnail' (base64)
    const thumb = localData['thumbnail'];
    if (thumb && typeof thumb === 'string' && thumb.startsWith('data:image')) return thumb;

    // 2. try 'content' if it's an image (raw base64 sometimes stored here for drawing)
    const content = localData['content'];
    if (content && typeof content === 'string' && content.startsWith('data:image')) return content;

    // 3. fallback to attachment
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
        collection: collection.name,
        title: localData[titleField.name] || 'Untitled',
        color: localData['color'] // Assuming color might be on record
      }
    );
  };

  const handleSave = (key: string, value: any) => {
    const newdata = { ...localData, [key]: value };
    setLocalData(newdata);
    if (onUpdate) onUpdate(data.id, { [key]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // upload to nocobase
      const uploaded = await api.upload(file);
      secureLogger.info("Uploaded:", uploaded);

      // structure expected by nocobase attachment field is usually an array of objects
      // or just the object depending on the field config.
      // safest default is to append to existing array or create new array.
      const current = localData[imageField] || [];
      const newValue = Array.isArray(current) ? [...current, uploaded] : [uploaded];

      handleSave(imageField, newValue);
    } catch (error) {
      secureLogger.error("Upload failed", error);
      // optional: show toast error
    }
  };

  // filter fields to show (first 3 relevant ones excluding title/image)
  // order based on fields array order
  const visibleFields = fields
    .filter(f => !f.hidden && f.name !== titleField.name && f.name !== imageField && f.interface !== 'attachment' && f.name !== 'id')
    .slice(0, 3);

  // selection style: use box-shadow instead of ring to respect radius
  const selectionStyle = isSelected
    ? { boxShadow: '0 0 0 2px var(--primary-gold), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }
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
          type="file"
          id={`upload-${data.id}`}
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* image cover */}
        {(previewImage || (visibleFields.length > 0)) ? (
          <div className="flex-1 w-full bg-muted/20 relative min-h-[80px] flex items-center justify-center overflow-hidden group rounded-t-[inherit]">
            {previewImage ? (
              <img
                src={previewImage}
                alt="cover"
                className="w-full h-full object-cover rounded-t-[inherit]" // Inherit top radius
                draggable={false}
              />
            ) : null}

            {/* overlay drag handle */}
            {previewImage && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-black/50 rounded-md">
                <GripVertical className="h-4 w-4 text-white/70" />
              </div>
            )}
          </div>
        ) : null}

        {/* content footer */}
        <div className="shrink-0 p-3 flex flex-col gap-1.5 bg-card/95 border-t border-transparent pointer-events-auto h-auto rounded-b-[inherit] overflow-hidden">
          {/* drag handle (if no image) */}
          {(!previewImage) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-muted rounded-md z-20">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* title */}
          <SmartField
            value={localData[titleField.name]}
            field={titleField}
            record={localData}
            collectionName={collection.name}
            onChange={(val) => handleSave(titleField.name, val)}
            className="font-bold text-sm leading-tight font-[Varela Round] outline-none truncate pr-6"
          />

          {/* fields */}
          {visibleFields.length > 0 && (
            <div className="flex flex-col gap-1">
              {visibleFields.map(field => {
                return (
                  <div key={field.name} className="flex items-center gap-2 text-[10px] text-muted-foreground h-4 overflow-hidden">
                    <span className="opacity-50 shrink-0 ">{field.uiSchema?.title || field.name}</span>
                    <div className="truncate flex-1 font-medium">
                      <SmartField
                        value={localData[field.name]}
                        field={field}
                        record={localData}
                        collectionName={collection.name}
                        onChange={(val) => handleSave(field.name, val)}
                        size="sm"
                      />
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
