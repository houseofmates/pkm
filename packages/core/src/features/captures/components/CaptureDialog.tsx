import { useState } from 'react';
import { useRecords } from '@/hooks/use-records';
import { useCollection } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Inbox } from 'lucide-react';
import { SmartField } from '@/components/fields/smart-field';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function CaptureDialog({ open, onOpenChange, onSaved }: CaptureDialogProps) {
  const { createRecord } = useRecords('captures');
  const { data: collection, loading } = useCollection('captures');

  const [values, setValues] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fields = collection?.fields?.filter((f: any) =>
    !f.hidden &&
    f.interface !== 'subtable' &&
    !['createdat', 'updatedat', 'createdby', 'updatedby', 'id'].includes(f.name.toLowerCase())
  ) || [];

  const handleSave = async () => {
    // basic validation: ensure we have at least one field filled
    const hasData = Object.keys(values).some(k => values[k] !== undefined && values[k] !== '' && values[k] !== null);
    if (!hasData) {
      toast.error("please fill at least one field");
      return;
    }

    setSaving(true);
    try {
      await createRecord({
        ...values,
        source: 'capture-dialog',
        createdAt: new Date().toISOString()
      });
      toast.success("capture saved successfully");
      setValues({});
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error("failed to save capture");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setValues({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-primary/30 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-primary/10 pb-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <DialogTitle className="text-primary lowercase tracking-wide">new capture</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {loading && (
            <div className="flex items-center justify-center py-8 text-primary/60">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm lowercase">loading fields...</span>
            </div>
          )}

          {!loading && fields.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <p className="text-sm lowercase">no fields available in captures collection</p>
              <p className="text-xs text-zinc-600 mt-1">create fields in nocobase to capture data</p>
            </div>
          )}

          {fields.map((field: any) => (
            <div key={field.name} className="space-y-2">
              <Label className="text-xs uppercase text-primary/60 font-mono tracking-wider">
                {field.uiSchema?.title || field.name}
                {field.allowNull === false && <span className="text-red-400 ml-1">*</span>}
              </Label>
              <SmartField
                value={values[field.name]}
                field={field}
                onChange={(val) => setValues((v: any) => ({ ...v, [field.name]: val }))}
                className="bg-black/40 border-primary/20 text-primary w-full"
                inputClassName="bg-transparent"
                size="md"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t border-primary/10">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-white/10 hover:bg-white/5 lowercase"
          >
            cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || fields.length === 0}
            className="flex-1 bg-primary text-black hover:bg-primary/80 gap-2 font-bold lowercase"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'saving...' : 'save capture'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
