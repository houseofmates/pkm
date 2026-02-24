
import type { Collection } from "@/types/nocobase";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { storageManager } from '@/lib/storage-manager';
import { Database } from "lucide-react";

import { useAppSetting } from "@/hooks/use-app-setting";

interface CollectionCardProps {
  collection: Collection;
  className?: string;
}

export const CollectionCard = React.memo(const CollectionCard = React.memo(function CollectionCard({ collection, className }: CollectionCardProps) {
  const fields = collection.fields || [];
  const fieldCount = fields.length;

  const [metadata] = useAppSetting<Record<string, { image?: string; color?: string }>>('collection_metadata', {});
  // check for injected meta (from sidebar docs) or global metadata
  const injectedMeta = (collection as any).meta || {};
  const meta = metadata[collection.name] || {};

  const description = collection.description || '';
  // priority: metadata image > description url > none
  const coverImage = meta.image || (description.startsWith('http') || description.startsWith('/') ? description : null);

  // color priority: injected (sidebar) > metadata > default primary
  const borderColor = injectedMeta.color || meta.color;

  // visual preview logic
  const isDrawing = collection.name.startsWith('drawing_');
  const isDoc = collection.name.startsWith('doc_');
  const isVisual = isDrawing || isDoc;

  let visualPreview = null;
  if (isDrawing) {
    // try to get thumbnail from storage manager
    const key = `drawing-config-${collection.name.replace('drawing_', '')}`;
    try {
      const config = JSON.parse(storageManager.getItem(key) || '{}');
      if (config.thumbnail) {
        visualPreview = config.thumbnail;
      }
    } catch (e) { /* ignore malformed storage */ }
  }

  const hasFields = !isVisual && fields.length > 0;
  // actually, user wants: "if something is fully empty... remove the extra space on the bottom"

  // for databases: if no fields, don't render the bottom part.
  // for visuals: if no thumbnail, don't render the bottom part? or render a small "empty" indicator?
  // "remove the extra space... add it when necessary"
  const showBottom = (isVisual && visualPreview) || (!isVisual && hasFields);

  return (
  <Card
    className={cn("hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group flex flex-col rounded-xl isolate", className)}
    style={borderColor ? { borderColor: borderColor, borderWidth: '2px' } : undefined}
  >
    {coverImage ? (
 /* cover image mode - keep fixed height or aspect ratio? use aspect-video? */
 /* for consistency let's keep cover image cards fixed height or aspect ratio because the image is the content */
 <div className="absolute inset-0 h-40">
 <img
 src={coverImage}
 alt={collection.title || collection.name}
 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
 />
 <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
 <div className="absolute bottom-4 left-4 text-white z-10 w-[calc(100%-2rem)]">
 <h3
   className="font-bold text-lg lowercase truncate"
   style={borderColor ? { color: borderColor } : undefined}
 >
   {collection.title || collection.name}
 </h3>
 <p className="text-xs opacity-80 lowercase">{fieldCount} fields</p>
 </div>
 </div>
  ) : (
 <CardHeader className={cn("flex flex-col relative transition-all", showBottom ? "h-40 p-6" : "h-auto p-3")}> 
 {/* if we have content, we use fixed height to align with grid? or let it grow?
 user said: "remove the extra space on the bottom... add it when necessary"
 this implies auto height when empty, but maybe fixed/expanded when full?
 however, in a grid, auto-height cards look messy.
 but request is specific: "just remove the extra space".
 let's try auto height for all, but visual previews might need a specific height.
 */}

 {/* top row: icon */}
 <div className={cn("flex items-center justify-between relative z-10", showBottom ? "mb-2" : "mb-0")}> 
 <Database
   className="h-5 w-5 text-primary"
   style={borderColor ? { color: borderColor } : undefined}
 />
 </div>

 {/* main title - sync color */}
 <CardTitle
 className="lowercase truncate text-xl relative z-10 flex-shrink-0"
 style={borderColor ? { color: borderColor } : undefined}
 >
 {collection.title || collection.name}
 </CardTitle>

 {/* preview area - only render if we have something to show */}
 {showBottom && (
   isVisual ? (
     /* visual preview */
     <div className="absolute inset-x-0 bottom-0 top-[40%] overflow-hidden rounded-b-[inherit]">
       <div className="w-full h-full relative">
         <img src={visualPreview!} className="w-full h-full object-cover opacity-80" />
         <div className="absolute inset-0 bg-gradient-to-t from-transparent to-background/10" />
       </div>
     </div>
   ) : (
     /* database fields preview */
     <div className="mt-4 relative z-10"> {/* added margin top instead of mt-auto if we are auto-height */}
       <div className="flex flex-col gap-1">
         {fields.slice(0, 3).map((f: any) => (
           <div key={f.name} className="flex items-center text-[10px] text-muted-foreground gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-primary/20" style={borderColor ? { backgroundColor: borderColor } : undefined} />
             <span className="truncate opacity-70">{f.name}</span>
             <span className="opacity-40 ml-auto">{f.interface || f.type}</span>
           </div>
         ))}
       </div>
     </div>
   )
 )}
 </CardHeader>
  )}
  </Card>
  );
}
