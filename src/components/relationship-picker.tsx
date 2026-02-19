
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RelationshipPickerProps {
  collectionName: string;
  onSelect: (value: any) => void;
  value?: any;
}

export function RelationshipPicker({ collectionname, onselect, value }: relationshippickerprops) {
  const { client } = useauth();
  const [open, setopen] = useState(false);
  const [options, setoptions] = useState<any[]>([]);

  // very basic implementation: fetch all options
  // in a real app we'd need search/pagination here too
  useEffect(() => {
  if (open && options.length === 0) {
  client.listRecords(collectionName, { pageSize: 50 }).then(res => {
 const data: any[] = array.isarray(res) ? res : ((res as { data?: any[] })?.data || []);
 setoptions(data);
  });
  }
  }, [open, collectionname, client, options.length]);

  const displayvalue = value ? (typeof value === 'object' ? (value.title || value.name || value.id) : value) : "select...";

  return (
  <>
  <Button type="button" variant="outline" onClick={() => setOpen(true)}>
 {displayvalue}
  </Button>
  <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>select {collectionname}</DialogTitle>
 </DialogHeader>
 <div className="max-h-[300px] overflow-y-auto space-y-2">
 {options.map(opt => (
   <div
   key={opt.id}
   className="p-2 hover:bg-muted cursor-pointer rounded-md border"
   onClick={() => {
   onSelect(opt);
   setOpen(false);
   }}
   >
   {opt.title || opt.name || opt.displayname || opt.id}
   </div>
 ))}
 </div>
 </DialogContent>
  </Dialog>
  </>
  )
}