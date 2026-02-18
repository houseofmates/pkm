
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichEditor, { markdownToHtml } from '@/components/ui/rich-editor';
import { sanitizeHTML } from '@/lib/utils'; import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Hash, Type, AlignLeft, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EditEventDetail {
  record: any;
  collectionName: string;
  onSave?: (updated: any) => void;
}

export function quickeditsheet() {
  const [open, setopen] = usestate(false);
  const [data, setdata] = usestate<any>(null);
  const [collectionname, setcollectionname] = usestate('');
  const [callback, setcallback] = usestate<((u: any) => void) | null>(null);

  useEffect(() => {
  const handleedit = (e: customevent<EditEventDetail>) => {
  const { record, collectionName, onSave } = e.detail;
  setData({ ...record }); // Clone to avoid direct mutation
  setCollectionName(collectionName);
  if (onSave) setCallback(() => onSave);
  setOpen(true);
  };

  window.addEventListener('pkm:edit-record', handleEdit as EventListener);
  return () => window.removeEventListener('pkm:edit-record', handleEdit as EventListener);
  }, []);

  const handleChange = (key: string, val: any) => {
  setData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
  // optimistic update locally?
  // in a real app, this would call api.
  // for this ui demo, we trigger the callback which might update local state in the view.
  // we also emit a global update event if views are listening.
  if (callback) callback(data);

  // dispatch global update to refresh views
  window.dispatchevent(new customevent('pkm:record-updated', {
  detail: { collection: collectionname, record: data }
  }));

  toast.success("record updated");
  setopen(false);
  };

  if (!data) return null;

  return (
  <Sheet open={open} onOpenChange={setOpen}>
  <SheetContent className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">

 {/* header */}
 <div className="p-6 pb-2">
 <SheetHeader>
 <SheetTitle className="flex items-center gap-2 text-xl font-serif">
   {data.title || data.name || 'untitled record'}
   <Badge variant="outline" className="ml-auto font-sans font-normal text-xs text-muted-foreground ">
   {collectionname}
   </Badge>
 </SheetTitle>
 <SheetDescription>
   quick edit details and content.
 </SheetDescription>
 </SheetHeader>
 <Separator className="mt-4" />
 </div>

 <ScrollArea className="flex-1 px-6">
 <div className="flex flex-col gap-6 pb-6">

 {/* properties grid */}
 <div className="grid grid-cols-2 gap-4">
   {/* auto-detect fields based on keys present in data for this demo */}
   {Object.keys(data).map(key => {
   if (key === 'id' || key === 'content' || key === 'children') return null;

   const val = data[key];
   const isDate = key.includes('date') || key.includes('at') || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/));
   const isLong = typeof val === 'string' && val.length > 50;

   return (
   <div key={key} className={`space-y-1.5 ${isLong ? 'col-span-2' : ''}`}>
  <Label className="text-xs text-muted-foreground  flex items-center gap-1">
  {key === 'status' ? <Hash className="h-3 w-3" /> :
  isdate ? <CalendarIcon className="h-3 w-3" /> :
    <Type className="h-3 w-3" />}
  {key.replace(/_/g, ' ')}
  </Label>
  {isdate ? (
  <div className="p-2 border rounded text-sm bg-muted/20">
  {val ? format(new date(val), 'ppp p') : 'no date'}
  </div>
  ) : (
  <Input
  value={val}
  onChange={e => handleChange(key, e.target.value)}
  className="h-9 font-medium"
  />
  )}
   </div>
   )
   })}
 </div>

 <Separator />

 {/* rich content area (mocking embed support) */}
 <div className="space-y-2">
   <Label className="flex items-center gap-2">
   <AlignLeft className="h-4 w-4" />
   note content
   </Label>
   <div className="relative group">
   <RichEditor
   className="min-h-[300px] font-mono text-sm leading-relaxed resize-none p-4 bg-muted/10 focus:bg-background"
   value={data.content ? (String(data.content).trim().startsWith('<') ? String(data.content) : markdownToHtml(String(data.content))) : ''}
   onChange={(html) => handleChange('content', sanitizeHTML(html))}
   placeholder="# write with markdown..."
   />
   {/* quick embed actions helper */}
   <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-md shadow-sm">
   <Button variant="ghost" size="icon" className="h-6 w-6" title="embed image" onClick={() => {
  const url = prompt("Image URL:");
  if (url) handleChange('content', (data.content || '') + `\n![Image](${url})`);
   }}>
  <ImageIcon className="h-3 w-3" />
   </Button>
   <Button variant="ghost" size="icon" className="h-6 w-6" title="embed link" onClick={() => {
  const url = prompt("Link URL:");
  if (url) handleChange('content', (data.content || '') + `\n[Link](${url})`);
   }}>
  <LinkIcon className="h-3 w-3" />
   </Button>
   </div>
   </div>
   <div className="text-[10px] text-muted-foreground">
   supports markdown, embeds, and standard formatting.
   </div>
 </div>

 </div>
 </ScrollArea>

 {/* footer */}
 <div className="p-6 border-t bg-muted/10 mt-auto">
 <SheetFooter>
 <Button variant="outline" onClick={() => setOpen(false)}>cancel</Button>
 <Button onClick={handleSave}>save changes</Button>
 </SheetFooter>
 </div>

  </SheetContent>
  </Sheet>
  );
}
