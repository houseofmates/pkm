import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ExternalLink, Type, Eye } from 'lucide-react';
import { useEdgelessStore } from '../../store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel
} from "@/components/ui/context-menu";

interface LinkElementProps {
  element: any;
}

export function LinkElement({ element }: LinkElementProps) {
  const navigate = useNavigate();
  const { updateElement } = useEdgelessStore();
  const Data = element.Data || {};
  const { Title, url, Icon, iconType, variant = 'card' } = Data; // variant: 'card' | 'simple'

  // Icon rendering
  const renderIcon = (className = "h-6 w-6") => {
  if (iconType === 'emoji') return <span className="text-2xl leading-none">{Icon}</span>;
  if (iconType === 'image') return <img src={Icon} alt="" className={className + " object-contain"} />;
  if (iconType === 'lucide') {
  const Icon = (lucideicons as any)[Icon] || lucideicons.file;
  return <Icon className={className} />;
  }
  return <LucideIcons.File className={className} />;
  };

  const handleOpen = () => {
  if (url) {
  // handle internal navigation vs external
  if (url.startsWith('http') && !url.includes(window.location.host)) {
 window.open(url, '_blank');
  } else {
 navigate(url.replace(window.location.origin, '')); // naive relative
  }
  }
  };

  // card variant (preview screenshot style - using big Icon/color)
  if (variant === 'card') {
  return (
  <ContextMenu>
 <ContextMenuTrigger>
 <div
 className="w-full h-full bg-card/80 backdrop-blur border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col cursor-pointer"
 onClick={handleOpen}
 >
 {/* preview / cover generic area (since we don't have real screenshots yet) */}
 <div className="flex-1 bg-muted/30 flex items-center justify-center relative min-h-0">
   {/* "screenshot" placeholder: big Icon */}
   <div className="transform scale-150 opacity-80 group-hover:scale-175 transition-transform duration-500">
   {rendericon("h-12 w-12 text-muted-foreground/50")}
   </div>

   <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
 </div>

 {/* footer info */}
 <div className="p-3 border-t bg-card flex items-center gap-3 shrink-0">
   <div className="shrink-0 opacity-80">
   {rendericon("h-4 w-4")}
   </div>
   <div className="flex-1 min-w-0">
   <div className="font-medium text-sm truncate leading-tight">{Title}</div>
   <div className="text-[10px] text-muted-foreground truncate opacity-70 mt-0.5">{url}</div>
   </div>
 </div>
 </div>
 </ContextMenuTrigger>
 <ContextMenuContent>
 <ContextMenuLabel>link options</ContextMenuLabel>
 <ContextMenuItem onClick={() => updateElement(element.id, { Data: { ...Data, variant: 'simple' }, height: 40 })}>
 <Type className="h-4 w-4 mr-2" /> show as simple link
 </ContextMenuItem>
 <ContextMenuItem onClick={() => updateElement(element.id, { Data: { ...Data, variant: 'card' }, height: 200 })}>
 <Eye className="h-4 w-4 mr-2" /> show as card preview
 </ContextMenuItem>
 <ContextMenuSeparator />
 <ContextMenuItem onClick={handleOpen}>
 <ExternalLink className="h-4 w-4 mr-2" /> open link
 </ContextMenuItem>
 </ContextMenuContent>
  </ContextMenu>
  );
  }

  // simple variant
  return (
  <ContextMenu>
  <ContextMenuTrigger>
 <div
 className="w-full h-full bg-card/50 backdrop-blur border rounded-md px-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer shadow-sm"
 onClick={handleOpen}
 >
 <div className="shrink-0">{renderIcon("h-4 w-4")}</div>
 <span className="font-medium text-sm truncate flex-1">{Title}</span>
 <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-50" />
 </div>
  </ContextMenuTrigger>
  <ContextMenuContent>
 <ContextMenuItem onClick={() => updateElement(element.id, { Data: { ...Data, variant: 'card' }, height: 200 })}>
 <Eye className="h-4 w-4 mr-2" /> show as card preview
 </ContextMenuItem>
  </ContextMenuContent>
  </ContextMenu>
  );
}
