
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRecordDialogProps {
  collectionName: string;
  fields: any[];
  onRecordCreated?: () => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  trigger?: React.ReactNode;
}

export function CreateRecordDialog({ collectionName, fields, onRecordCreated, open: openProp, onOpenChange, trigger }: CreateRecordDialogProps) {
  const { client } = useAuth();
  const { activeFronters } = useFronter();
  const activeFronterId = activeFronters[0] || null;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
  if (onOpenChange) onOpenChange(v);
  else setInternalOpen(v);
  };
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  const dataToSubmit = { ...formData };

  // auto-inject fronter if applicable
  if (activeFronterId) {
  // check if collection has a 'fronter' field
  // note: nocobase fields sometimes use 'name' key.
  const hasFronterField = fields.some(f => f.name === 'fronter');
  if (hasFronterField) {
 // if it's a text field, just save id (or name if we had it, but id is safer for ref)
 // ideally this would be a relationship, but text is simpler for now as requested "metadata"
 dataToSubmit['fronter'] = activeFronterId;
  }
  }

  try {
  // enforce entity_type for notes
  if (collectionName.toLowerCase().includes('note')) {
    dataToSubmit.entity_type = dataToSubmit.entity_type || 'note'
  }
  await client.createRecord(collectionName, dataToSubmit);
  toast.success("record created");
  setOpen(false);
  setFormData({});
  if (onRecordCreated) onRecordCreated();
  } catch (error: any) {
  console.error(error);
  toast.error("failed to create record");
  } finally {
  setLoading(false);
  }
  };

  const handleInputChange = (fieldName: string, value: any) => {
  setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  // filter editable fields
  // exclude system fields and the 'fronter' field (auto-filled)
  const editableFields = (fields || []).filter(f =>
  !['id', 'createdAt', 'updatedAt', 'fronter', 'sort'].includes(f.name) &&
  !f.hidden &&
  f.interface !== 'subTable' && // Skip complex relations
  f.interface !== 'linkTo' // Skip complex relations
  );

  return (
  <Dialog open={open} onOpenChange={setOpen}>
  {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : (
 <DialogTrigger asChild>
 <Button>
 <Plus className="mr-2 h-4 w-4" /> New Item
 </Button>
 </DialogTrigger>
  )}
  <DialogContent className="max-h-[80vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>new item</DialogTitle>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4 py-4">
 {/* {editablefields.length === 0 && (
 <p classname="text-muted-foreground">no editable fields found.</p>
 )} */}
 {editableFields.map(field => (
 <div key={field.name} className="space-y-2">
   <Label className="">{field.uiSchema?.title || field.name}</Label>
   <Input
   value={formData[field.name] || ''}
   onChange={(e) => handleInputChange(field.name, e.target.value)}
   placeholder={field.uiSchema?.title || field.name}
   disabled={loading}
   />
 </div>
 ))}
 <DialogFooter>
 <Button type="submit" disabled={loading}>
   {loading ? 'Creating...' : 'Create'}
 </Button>
 </DialogFooter>
 </form>
  </DialogContent>
  </Dialog>
  );
}
