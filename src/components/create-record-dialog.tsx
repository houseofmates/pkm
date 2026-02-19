import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  onSuccess?: () => void;
  fields?: unknown[];
  trigger?: React.ReactNode;
}

export function CreateRecordDialog({ open, onOpenChange, collectionName, onSuccess, trigger }: CreateRecordDialogProps) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, val: unknown) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // dispatch event to create record
      window.dispatchEvent(new CustomEvent('pkm:create-record', {
        detail: { collection: collectionName, data }
      }));
      toast.success("record created");
      onSuccess?.();
      onOpenChange(false);
      setData({});
    } catch {
      toast.error("failed to create record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>create record</DialogTitle>
          <DialogDescription>
            add a new record to {collectionName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">title</Label>
            <Input
              id="title"
              value={(data.title as string) || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="enter title..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'creating...' : 'create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
