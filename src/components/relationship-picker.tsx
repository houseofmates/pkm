
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

export function RelationshipPicker({ collectionName, onSelect, value }: RelationshipPickerProps) {
  const { client } = useAuth();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);

  // Very basic implementation: fetch all options
  // In a real app we'd need search/pagination here too
  useEffect(() => {
  if (open && options.length === 0) {
  client.listRecords(collectionName, { pageSize: 50 }).then(res => {
 const data: any[] = Array.isArray(res) ? res : ((res as { data?: any[] })?.data || []);
 setOptions(data);
  });
  }
  }, [open, collectionName, client, options.length]);

  const displayValue = value ? (typeof value === 'object' ? (value.title || value.name || value.id) : value) : "Select...";

  return (
  <>
  <Button type="button" variant="outline" onClick={() => setOpen(true)}>
 {displayValue}
  </Button>
  <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>select {collectionName}</DialogTitle>
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
   {opt.title || opt.name || opt.displayName || opt.id}
   </div>
 ))}
 </div>
 </DialogContent>
  </Dialog>
  </>
  )
}
