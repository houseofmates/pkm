
import { useState, useRef } from 'react';
import { useFronter } from '@/contexts/fronter-context';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image, FileText, Trash2, Edit, Upload, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { MemberService } from '@/api/member-service';

import { formatHeadmateName, getCapitalizationClass } from '@/utils/text-formatting';

// local formatting removed in favor of global usage

interface HeadmateContextMenuProps {
  memberId: string;
  memberName: string;
  children: React.ReactNode;
}

export function HeadmateContextMenu({ memberId, memberName, children }: HeadmateContextMenuProps) {
  const { overrides, updateOverride, flushOverrides, activeFronters, registerFrontChange, updateFronters } = useFronter();
  const currentOverride = overrides[memberId] || {};

  const [editOpen, setEditOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);

  // edit state
  const [desc, setDesc] = useState('');
  const [visualName, setVisualName] = useState('');

  // image state
  const [imageUrl, setImageUrl] = useState('');

  // color state
  const [color, setColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#ffffff');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHidden = currentOverride.hidden;

  const toggleHide = () => {
  updateoverride(memberid, { hidden: !ishidden });
  toast.info(ishidden ? "headmate restored" : "headmate hidden");
  };

  // --- image handling ---
  // --- image handling ---
  const handlefilechange = async (e: react.changeevent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // use the new memberservice to handle upload & sync
  // we pass the updateoverride function as the callback
  await MemberService.updateMemberAvatar(memberId, file, async (id, data) => {
  updateOverride(id, data);

  // flush to persist the local override immediately
  try {
 await flushOverrides();
  } catch (flushError) {
 console.warn('Failed to flush overrides:', flushError);
  }
  });

  // reset file input and close dialog
  if (fileInputRef.current) {
  fileInputRef.current.value = '';
  }
  setImageOpen(false);
  };

  const saveImageUrl = async () => {
  if (!imageUrl.trim()) return;
  updateOverride(memberId, { avatarUrl: imageUrl.trim() });

  // flush immediately to ensure persistence
  try {
  await flushOverrides();
  } catch (flushError) {
  console.warn('Failed to flush overrides:', flushError);
  }

  toast.success("image link saved");
  setImageUrl(''); // Clear input after saving
  setImageOpen(false);
  };

  // --- name/desc ---
  const openEdit = () => {
  setDesc(currentOverride.description || '');
  setEditOpen(true);
  };

  const openNameEdit = () => {
  setVisualName((currentOverride as any).name || memberName);
  setNameOpen(true);
  };

  const saveDetails = () => {
  updateOverride(memberId, { description: desc });
  setEditOpen(false);
  toast.success("description saved");
  };

  const saveVisualName = () => {
  updateOverride(memberId, ({ name: visualName } as any));
  setNameOpen(false);
  toast.success("visual name saved");
  };

  // --- colors ---
  const openColor = () => {
  setColor(currentOverride.color || '#cccccc');
  setTextColor(currentOverride.textColor || '#ffffff');
  setColorOpen(true);
  };

  const saveColors = () => {
  updateOverride(memberId, { color, textColor });
  setColorOpen(false);
  toast.success("colors saved");
  };

  // --- front with status ---
  const [frontStatusOpen, setFrontStatusOpen] = useState(false);
  const [customFrontStatus, setCustomFrontStatus] = useState('');

  const openFrontStatus = () => {
  setCustomFrontStatus('');
  setFrontStatusOpen(true);
  };

  const handleFrontWithStatus = async () => {
  // add to active fronters if not already there
  const newFronters = [...activeFronters];
  if (!newFronters.includes(memberId)) {
  newFronters.push(memberId);
  }

  // update local state and sync
  updateFronters(newFronters);
  await registerFrontChange(newFronters, customFrontStatus);

  setFrontStatusOpen(false);
  toast.success(`Front set: ${customFrontStatus}`);
  };

  return (
  <>
  <ContextMenu>
 <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
 <ContextMenuContent className="w-64">
 <ContextMenuLabel className={getCapitalizationClass((currentOverride as any).name || memberName)}>
 {formatheadmatename((currentoverride as any).name || membername)}
 </ContextMenuLabel>
 <ContextMenuSeparator />

 <ContextMenuItem onSelect={openFrontStatus}>
 <div className="flex items-center">
   <span className="mr-2 h-4 w-4 bg-green-500/20 text-green-500 flex items-center justify-center rounded-full text-[10px]">●</span>
   front with status...
 </div>
 </ContextMenuItem>

 <ContextMenuItem onSelect={openNameEdit}>
 <Edit className="mr-2 h-4 w-4" />
 edit visual name
 </ContextMenuItem>

 <ContextMenuItem onSelect={() => setImageOpen(true)}>
 <Image className="mr-2 h-4 w-4" />
 change image
 </ContextMenuItem>

 <ContextMenuItem onSelect={openEdit}>
 <FileText className="mr-2 h-4 w-4" />
 edit description
 </ContextMenuItem>

 <ContextMenuItem onSelect={openColor}>
 <Palette className="mr-2 h-4 w-4" />
 customize colors
 </ContextMenuItem>

 <ContextMenuSeparator />

 <ContextMenuItem
 className={isHidden ? "" : "text-destructive focus:text-destructive-foreground focus:bg-destructive"}
 onSelect={toggleHide}
 >
 <Trash2 className="mr-2 h-4 w-4" />
 {ishidden ? "unhide headmate" : "hide headmate"}
 </ContextMenuItem>
 </ContextMenuContent>
  </ContextMenu>

  {/* hidden file input for direct click if needed, but using dialog now mostly */}
  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onchange={handlefilechange} />

  {/* visual name dialog */}
  <Dialog open={nameOpen} onOpenChange={setNameOpen}>
 <DialogContent>
 <DialogHeader><DialogTitle>edit visual name</DialogTitle></DialogHeader>
 <div className="py-4">
 <Label>name (overrides integration)</Label>
 <Input value={visualName} onChange={e => setVisualName(e.target.value)} className="mt-2" />
 </div>
 <DialogFooter><Button onClick={saveVisualName}>save</Button></DialogFooter>
 </DialogContent>
  </Dialog>

  {/* image source dialog */}
  <Dialog open={imageOpen} onOpenChange={setImageOpen}>
 <DialogContent>
 <DialogHeader><DialogTitle>change image</DialogTitle></DialogHeader>
 <div className="space-y-4 py-4">
 <div className="grid grid-cols-2 gap-4">
   <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
   <Upload className="h-6 w-6" />
   upload from device
   </Button>

   {/* simple visual separator or just standard layout */}
   <div className="col-span-2 border-t pt-4">
   <Label>or paste image link</Label>
   <div className="flex gap-2 mt-2">
   <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
   <Button onClick={saveImageUrl}>save</Button>
   </div>
   </div>
 </div>
 </div>
 </DialogContent>
  </Dialog>

  {/* edit description dialog (existing) */}
  <Dialog open={editOpen} onOpenChange={setEditOpen}>
 <DialogContent>
 <DialogHeader><DialogTitle>edit details</DialogTitle></DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
   <Label>custom description</Label>
   <Textarea
   value={desc}
   onChange={(e) => setDesc(e.target.value)}
   placeholder="enter a custom description..."
   className="min-h-[100px]"
   />
 </div>
 </div>
 <DialogFooter><Button onClick={saveDetails}>save</Button></DialogFooter>
 </DialogContent>
  </Dialog>

  {/* edit color dialog (existing) */}
  <Dialog open={colorOpen} onOpenChange={setColorOpen}>
 <DialogContent>
 <DialogHeader><DialogTitle>customize colors</DialogTitle></DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
   <Label>main color</Label>
   <div className="flex gap-2">
   <Input type="color" className="w-12 h-10 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
   <Input value={color} onChange={(e) => setColor(e.target.value)} />
   </div>
 </div>
 <div className="space-y-2">
   <Label>text color</Label>
   <div className="flex gap-2">
   <Input type="color" className="w-12 h-10 p-1" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
   <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} />
   </div>
 </div>
 </div>
 <DialogFooter><Button onClick={saveColors}>save</Button></DialogFooter>
 </DialogContent>
  </Dialog>

  {/* front with status dialog */}
  <Dialog open={frontStatusOpen} onOpenChange={setFrontStatusOpen}>
 <DialogContent>
 <DialogHeader><DialogTitle>front with status</DialogTitle></DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
   <Label>status message</Label>
   <Input
   value={customFrontStatus}
   onChange={e => setCustomFrontStatus(e.target.value)}
   placeholder="e.g. co-con, cooking, working..."
   onKeyDown={e => e.key === 'Enter' && handleFrontWithStatus()}
   />
 </div>
 </div>
 <DialogFooter><Button onClick={handleFrontWithStatus}>start front</Button></DialogFooter>
 </DialogContent>
  </Dialog>
  </>
  );
}