import { useState } from 'react';
import { Share2, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface ShareDialogProps {
  documentId: string;
  isPublic: boolean;
  onTogglePublic: (isPublic: boolean) => void;
}

export function ShareDialog({ documentId, isPublic, onTogglePublic }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const publicUrl = `${import.meta.env.VITE_PUBLIC_URL || 'http://localhost:3011'}/doc/${documentId}`;

  const handleCopyLink = () => {
  navigator.clipboard.writeText(publicUrl);
  toast.success('link copied to clipboard');
  };

  return (
  <>
  <Button
 variant="outline"
 size="sm"
 onClick={() => setOpen(true)}
 className="gap-2 lowercase"
  >
 <Share2 className="w-4 h-4" />
 share
  </Button>

  <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent className="font-varela">
 <DialogHeader>
 <DialogTitle className="lowercase">share document</DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 {/* Privacy Toggle */}
 <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
   <div className="flex items-center gap-3">
   {isPublic ? (
   <Unlock className="w-5 h-5 text-green-500" />
   ) : (
   <Lock className="w-5 h-5 text-muted-foreground" />
   )}
   <div>
   <Label className="lowercase font-semibold">
  {isPublic ? 'public' : 'private'}
   </Label>
   <p className="text-xs text-muted-foreground lowercase">
  {isPublic
  ? 'anyone with the link can view'
  : 'only you can access this document'}
   </p>
   </div>
   </div>
   <Switch
   checked={isPublic}
   onCheckedChange={onTogglePublic}
   />
 </div>

 {/* Public Link */}
 {isPublic && (
   <div className="space-y-2">
   <Label className="lowercase">public link</Label>
   <div className="flex gap-2">
   <Input
  value={publicUrl}
  readOnly
  className="font-mono text-xs"
   />
   <Button
  variant="outline"
  size="sm"
  onClick={handleCopyLink}
  className="lowercase"
   >
  copy
   </Button>
   </div>
   <p className="text-xs text-muted-foreground lowercase">
   share this link to let others view your journal entry
   </p>
   </div>
 )}
 </div>
 </DialogContent>
  </Dialog>
  </>
  );
}
