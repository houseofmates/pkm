import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartField } from '@/components/fields/smart-field';
import { X, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { humanizeFieldName } from './record-table';

interface RecordDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  collection: any;
  onUpdate?: (id: string | number, data: any) => void;
}

export function RecordDetailDrawer({ isOpen, onClose, record, collection, onUpdate }: RecordDetailDrawerProps) {
  const navigate = useNavigate();
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // reset edited data when record changes
  useEffect(() => {
    if (record) {
      setEditedData({ ...record });
    }
  }, [record, isOpen]);

  if (!record || !collection) return null;

  // Apply fallback fields for collections that don't have fields defined
  const FALLBACK_FIELDS: Record<string, Array<{ name: string; type: string; interface?: string; uiSchema?: { title?: string } }>> = {
    events: [
      { name: 'title', type: 'string', interface: 'input', uiSchema: { title: 'Title' } },
      { name: 'start_time', type: 'datetime', interface: 'datetime', uiSchema: { title: 'Start Time' } },
      { name: 'end_time', type: 'datetime', interface: 'datetime', uiSchema: { title: 'End Time' } },
      { name: 'location', type: 'string', interface: 'input', uiSchema: { title: 'Location' } },
      { name: 'notes', type: 'text', interface: 'textarea', uiSchema: { title: 'Notes' } },
      { name: 'url', type: 'string', interface: 'input', uiSchema: { title: 'URL' } },
      { name: 'uid', type: 'string', interface: 'input', uiSchema: { title: 'UID' } },
      { name: 'fronter', type: 'string', interface: 'input', uiSchema: { title: 'Fronter' } },
    ],
    exercise: [
      { name: 'exercise_type', type: 'string', interface: 'input', uiSchema: { title: 'Exercise Type' } },
      { name: 'duration', type: 'integer', interface: 'integer', uiSchema: { title: 'Duration' } },
      { name: 'intensity', type: 'string', interface: 'select', uiSchema: { title: 'Intensity' } },
      { name: 'calories', type: 'integer', interface: 'integer', uiSchema: { title: 'Calories' } },
      { name: 'notes', type: 'text', interface: 'textarea', uiSchema: { title: 'Notes' } },
      { name: 'created_at', type: 'datetime', interface: 'datetime', uiSchema: { title: 'Created At' } },
      { name: 'fronter', type: 'string', interface: 'input', uiSchema: { title: 'Fronter' } },
    ],
    finances: [
      { name: 'description', type: 'string', interface: 'input', uiSchema: { title: 'Description' } },
      { name: 'amount', type: 'float', interface: 'input', uiSchema: { title: 'Amount' } },
      { name: 'category', type: 'string', interface: 'select', uiSchema: { title: 'Category' } },
      { name: 'type', type: 'string', interface: 'select', uiSchema: { title: 'Type' } },
      { name: 'date', type: 'date', interface: 'datetime', uiSchema: { title: 'Date' } },
      { name: 'notes', type: 'text', interface: 'textarea', uiSchema: { title: 'Notes' } },
      { name: 'fronter', type: 'string', interface: 'input', uiSchema: { title: 'Fronter' } },
    ],
    journal: [
      { name: 'title', type: 'string', interface: 'input', uiSchema: { title: 'Title' } },
      { name: 'content', type: 'text', interface: 'markdown', uiSchema: { title: 'Content' } },
      { name: 'mood', type: 'string', interface: 'select', uiSchema: { title: 'Mood' } },
      { name: 'tags', type: 'json', interface: 'tag', uiSchema: { title: 'Tags' } },
      { name: 'created_at', type: 'datetime', interface: 'datetime', uiSchema: { title: 'Created At' } },
      { name: 'fronter', type: 'string', interface: 'input', uiSchema: { title: 'Fronter' } },
    ],
    sleep: [
      { name: 'bedtime', type: 'datetime', interface: 'datetime', uiSchema: { title: 'Bedtime' } },
      { name: 'wake_time', type: 'datetime', interface: 'datetime', uiSchema: { title: 'Wake Time' } },
      { name: 'duration', type: 'float', interface: 'input', uiSchema: { title: 'Duration' } },
      { name: 'quality', type: 'integer', interface: 'integer', uiSchema: { title: 'Quality' } },
      { name: 'notes', type: 'text', interface: 'textarea', uiSchema: { title: 'Notes' } },
      { name: 'created_at', type: 'datetime', interface: 'datetime', uiSchema: { title: 'Created At' } },
      { name: 'fronter', type: 'string', interface: 'input', uiSchema: { title: 'Fronter' } },
    ],
  };

  const collectionWithFallback = collection.fields && collection.fields.length > 0 
    ? collection 
    : { ...collection, fields: FALLBACK_FIELDS[collection.name] || [] };

  const fields = collectionWithFallback.fields || [];
  
  // filter out internal/system fields
  const displayFields = fields.filter((f: any) => {
    const internalFields = ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'created_at', 'updated_at'];
    return !internalFields.includes(f.name);
  });

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async () => {
    if (!onUpdate) {
      toast.error('Update not available');
      return;
    }

    setIsSaving(true);
    try {
      // only send changed fields
      const changedFields: Record<string, any> = {};
      Object.keys(editedData).forEach(key => {
        if (editedData[key] !== record[key]) {
          changedFields[key] = editedData[key];
        }
      });

      if (Object.keys(changedFields).length === 0) {
        toast.info('no changes to save');
        onClose();
        return;
      }

      await onUpdate(record.id, changedFields);
      toast.success('record updated');
      onClose();
    } catch (error) {
      toast.error('failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenFullPage = () => {
    navigate(`/databases/${encodeURIComponent(collection.name)}/${record.id}`);
    onClose();
  };

  const isDirty = Object.keys(editedData).some(key => editedData[key] !== record[key]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg bg-[#0a0a0a] border-l border-[#222] p-0 flex flex-col"
      >
        <SheetHeader className="border-b border-[#222] p-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-white lowercase">
              record details
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                onClick={handleOpenFullPage}
                title="open full page"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {collection.title || collection.name} • ID: {record.id}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayFields.length === 0 ? (
          <div className="text-center text-zinc-500 py-8 lowercase">
            no editable fields available
          </div>
        ) : (
            displayFields.map((field: any) => {
              const value = editedData[field.name];
              const displayName = field.uiSchema?.title || humanizeFieldName(field.name);

              return (
                <div key={field.name} className="space-y-2">
                  <Label 
                    htmlFor={`field-${field.name}`}
                    className="text-xs text-zinc-400 flex items-center gap-2"
                  >
                    {displayName}
                    {field.required && (
                      <span className="text-red-500">*</span>
                    )}
                  </Label>
                  <div className="bg-[#111] rounded-md p-1">
                    <SmartField
                      value={value}
                      field={field}
                      record={editedData}
                      collectionName={collection.name}
                      size="lg"
                      className="w-full"
                      onChange={(val) => handleFieldChange(field.name, val)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-[#222] p-4 flex-shrink-0 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-zinc-400 hover:text-white lowercase"
          >
            cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="bg-[#ffb10f] text-black hover:bg-[#ffb10f]/90 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2 lowercase">
                <span className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                saving...
              </span>
            ) : (
              <span className="flex items-center gap-2 lowercase">
                <Save className="h-4 w-4" />
                save changes
              </span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
