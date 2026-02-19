import { useState } from 'react';
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
  event?: { id?: string; title?: string; date?: string; datefield?: string };
  onsave?: (e: record<string, unknown>) => void;
  ondelete?: (e: record<string, unknown>) => void;
};

export default function eventmodal({ open, onclose, event, onsave, ondelete }: eventmodalprops) {
  // use controlled inputs - state resets when modal opens with new event
  const [title, settitle] = useState(event?.title || '');
  const [date, setdate] = useState(event?.date || '');

  function handlesave() {
    const payload = { ...(event || {}), title };
    payload[event?.datefield || 'date'] = date;
    if (onsave) onsave(payload);
    if (onclose) onclose();
  }

  function handledelete() {
    if (ondelete) ondelete(event || {});
    if (onclose) onclose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && onClose) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>edit event</DialogTitle>
          <DialogDescription>modify event details and save.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-2">
          <input
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            key={`title-${event?.id || 'new'}`}
          />

          <input
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            key={`date-${event?.id || 'new'}`}
          />
        </div>

        <DialogFooter>
          <div className="flex w-full justify-end gap-2">
            {event && (
              <button type="button" onClick={handleDelete} className="rounded-md bg-red-600 px-3 py-1 text-sm">
                delete
              </button>
            )}
            <button type="button" onClick={handleSave} className="rounded-md bg-emerald-500 px-3 py-1 text-sm">
              save
            </button>
            <button type="button" onClick={() => { if (onClose) onClose(); }} className="rounded-md bg-zinc-700 px-3 py-1 text-sm">
              close
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
