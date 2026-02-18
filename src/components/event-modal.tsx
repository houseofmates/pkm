import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type EventModalProps = {
  open: boolean;
  onClose?: () => void;
  event?: any;
  onSave?: (e: any) => void;
  onDelete?: (e: any) => void;
};

export default function EventModal({ open, onClose, event, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    setTitle(event?.title || '');
    setDate(event?.date || '');
  }, [event, open]);

  function handleSave() {
    const payload = { ...(event || {}), title };
    payload[event?.dateField || 'date'] = date;
    onSave && onSave(payload);
    onClose && onClose();
  }

  function handleDelete() {
    onDelete && onDelete(event);
    onClose && onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose && onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Modify event details and save.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-2">
          <input
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <DialogFooter>
          <div className="flex w-full justify-end gap-2">
            {event && (
              <button type="button" onClick={handleDelete} className="rounded-md bg-red-600 px-3 py-1 text-sm">
                Delete
              </button>
            )}
            <button type="button" onClick={handleSave} className="rounded-md bg-emerald-500 px-3 py-1 text-sm">
              Save
            </button>
            <button type="button" onClick={() => onClose && onClose()} className="rounded-md bg-zinc-700 px-3 py-1 text-sm">
              Close
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
