import { useEffect, useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Collection } from "@/hooks/use-collections";
import { Loader2 } from "lucide-react";
import { SmartField } from '@/components/fields/smart-field';
import { toast } from 'sonner';
import { useAppSetting } from '@/hooks/use-app-setting';
import { getLucideIcon } from '@/lib/field-meta';

interface RecordFormProps {
  collection: Collection;
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function RecordForm({ collection, initialData, onSubmit, onCancel }: RecordFormProps) {
  const [values, setValues] = useState<any>(initialData || {});

  useEffect(() => {
    setValues(initialData || {});
  }, [initialData]);

  // simple reactive formula example
  useEffect(() => {
    const p = parseFloat(values.price);
    const q = parseFloat(values.quantity || values.qty);
    if (!isNaN(p) && !isNaN(q)) {
      const total = (p * q).toFixed(2);
      if (values.total !== total) {
        setValues((v: any) => ({ ...v, total }));
      }
    }
  }, [values.price, values.quantity, values.qty, values.total]);

  // if fields is undefined, we are likely still loading the collection meta
  if (!collection.fields) {
    return <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> loading fields...</div>;
  }

  const fields = collection.fields.filter((f: any) =>
    !f.hidden &&
    f.interface !== 'subtable' &&
    !['createdat', 'updatedat', 'createdby', 'updatedby'].includes(f.name)
  );

  const [metadata] = useAppSetting<Record<string, any>>('collection_metadata', {}, { pollIntervalMs: 3000 });
  const collMeta = metadata[collection.name] || {};
  const renderFieldLabel = (field: any) => {
    const fieldColor: string | undefined = collMeta.fieldColors?.[field.name];
    const iconInfo = collMeta.fieldIcons?.[field.name] || {};
    const text = field.uiSchema?.title || field.name;
    return (
      <span className="flex items-center gap-1" style={{ color: fieldColor || undefined }}>
        {iconInfo.icon && iconInfo.iconType === 'emoji' && (
          <span style={{ color: iconInfo.iconColor || fieldColor }}>{iconInfo.icon}</span>
        )}
        {iconInfo.icon && iconInfo.iconType === 'lucide' && (() => {
          const Icon = getLucideIcon(iconInfo.icon);
          return Icon ? <Icon className="h-4 w-4" style={{ color: iconInfo.iconColor || fieldColor }} /> : null;
        })()}
        {text}
      </span>
    );
  };

  const handleChange = (name: string, val: any) => {
    setValues((v: any) => ({ ...v, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.filter(f => !f.uiSchema?.nullable && (values[f.name] === undefined || values[f.name] === null || values[f.name] === ''));
    if (missing.length > 0) {
      toast.error(`please fill ${missing.map(f => f.uiSchema?.title || f.name).join(', ')}`);
      return;
    }
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      {fields.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {fields.map((field: any) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{renderFieldLabel(field)}</Label>
              <SmartField
                value={values[field.name]}
                field={field}
                onChange={(val) => handleChange(field.name, val)}
                size="lg"
                className="w-full"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground p-4 text-center">no fields available</div>
      )}

      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>cancel</Button>
        <Button type="submit">save record</Button>
      </div>
    </form>
  );
}
