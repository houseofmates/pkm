
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Collection } from '@/types/nocobase';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Trash2, Edit } from 'lucide-react';
import { CollectionDialog } from '@/features/collections/components/collection-dialog';
import { useAppSetting } from '@/hooks/use-app-setting';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RichResourceContextMenuContent } from '@/components/rich-resource-context-menu';

interface DatabaseContextMenuProps {
  collection: Collection;
  children: React.ReactNode;
  onUpdate: () => void;
}

export function DatabaseContextMenu({ collection, children, onUpdate }: DatabaseContextMenuProps) {
  const { client } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [proposedTitle, setProposedTitle] = useState<string | undefined>(undefined);
  const [imageOpen, setImageOpen] = useState(false);

  // Metadata for cosmetics
  const [metadata, setMetadata] = useAppSetting<Record<string, { image?: string; color?: string }>>('collection_metadata', {});

  const updateMeta = (key: 'image' | 'color', value: string | undefined) => {
  setMetadata({
  ...metadata,
  [collection.name]: {
 ...metadata[collection.name],
 [key]: value
  }
  });
  onUpdate();
  };

  const handleDelete = async () => {
  try {
  await client.deleteCollection(collection.name);
  toast.success(`deleted ${collection.title || collection.name}`);
  onUpdate();
  } catch (error) {
  console.error(error);
  toast.error("failed to delete database");
  }
  };

  return (
  <>
  <ContextMenu>
 <ContextMenuTrigger>{children}</ContextMenuTrigger>
 <RichResourceContextMenuContent
 currentName={collection.title || collection.name}
 currentColor={metadata[collection.name]?.color}
 onUpdate={async (updates: any) => {
 const newMeta: any = {};
 if (updates.color) newMeta.color = updates.color;
 if (updates.icon) newMeta.icon = updates.icon;
 if (updates.iconType) newMeta.iconType = updates.iconType;

 try {
   // Handle Name Change Directly
   if (updates.name && updates.name !== (collection.title || collection.name)) {
   await client.updateCollection(collection.name, { title: updates.name });
   toast.success(`renamed to ${updates.name}`);
   }

   // Update Metadata
   if (Object.keys(newMeta).length > 0) {
   setMetadata({
   ...metadata,
   [collection.name]: {
  ...metadata[collection.name],
  ...newMeta
   }
   });
   }

   onUpdate();
 } catch (error) {
   console.error("Update failed:", error);
   toast.error("failed to update database");
 }
 }}
 >
 <ContextMenuLabel className="lowercase font-bold px-2 py-1.5 text-xs text-muted-foreground">{collection.title || collection.name}</ContextMenuLabel>
 <ContextMenuItem onSelect={() => setEditOpen(true)}>
 <Edit className="mr-2 h-4 w-4" />
 rename
 </ContextMenuItem>
 <ContextMenuItem
 className="text-destructive focus:text-destructive"
 onSelect={() => setDeleteOpen(true)}
 >
 <Trash2 className="mr-2 h-4 w-4" />
 delete
 </ContextMenuItem>
 </RichResourceContextMenuContent>
  </ContextMenu>

  <CollectionDialog
 collection={collection}
 open={editOpen}
 onOpenChange={(open) => {
 setEditOpen(open);
 if (!open) setProposedTitle(undefined);
 }}
 onSuccess={() => {
 setEditOpen(false);
 onUpdate();
 }}
 initialTitle={proposedTitle}
  />

  {/* Color Dialog */}
  <Dialog open={colorOpen} onOpenChange={setColorOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>set database color</DialogTitle>
 </DialogHeader>
 <div className="grid grid-cols-5 gap-2 py-4">
 {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#6b7280', ''].map(c => (
   <div
   key={c || 'none'}
   className={cn("h-8 w-8 rounded-full cursor-pointer hover:scale-110 transition-transform border-2", c === (metadata[collection.name]?.color || '') ? "border-foreground" : "border-transparent")}
   style={{ backgroundColor: c || 'transparent' }}
   onClick={() => {
   updateMeta('color', c || undefined);
   setColorOpen(false);
   }}
   title={c || 'Reset'}
   >
   {!c && <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">/</div>}
   </div>
 ))}
 </div>
 </DialogContent>
  </Dialog>

  {/* Image Dialog */}
  <Dialog open={imageOpen} onOpenChange={setImageOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>set cover image</DialogTitle>
 </DialogHeader>
 <div className="flex gap-2 py-4">
 <Input
   placeholder="https://..."
   defaultValue={metadata[collection.name]?.image || ''}
   onKeyDown={(e) => {
   if (e.key === 'Enter') {
   updateMeta('image', e.currentTarget.value);
   setImageOpen(false);
   }
   }}
 />
 <Button onClick={() => {
   // This relies on the input value being set, simpler to just use onKeyDown or controlled state
   // but for brevity in this replace block:
   const input = document.querySelector('input[placeholder="https://..."]') as HTMLInputElement;
   if (input) {
   updateMeta('image', input.value);
   setImageOpen(false);
   }
 }}>save</Button>
 </div>
 </DialogContent>
  </Dialog>

  {/* Delete Alert */}
  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>are you absolutely sure?</AlertDialogTitle>
 <AlertDialogDescription>
   this will permanently delete the <strong>{collection.title || collection.name}</strong> database and all its data.
   this action cannot be undone.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>cancel</AlertDialogCancel>
 <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
   delete
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
  </AlertDialog>
  </>
  );
}
