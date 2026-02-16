
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu"
import { Palette, Pencil, FolderPlus } from "lucide-react"

interface CollectionContextMenuProps {
  children: React.ReactNode;
  onRename?: () => void;
  onColorChange?: (color: string) => void;
  onAddToFolder?: () => void;
}

const COLORS = [
  { name: 'Yellow', value: 'var(--primary)' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
];

export function CollectionContextMenu({ children, onRename, onColorChange, onAddToFolder }: CollectionContextMenuProps) {
  return (
  <ContextMenu>
  <ContextMenuTrigger asChild>
 {children}
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
 <ContextMenuItem onSelect={onRename}>
 <Pencil className="mr-2 h-4 w-4" />
 rename collection
 </ContextMenuItem>

 <ContextMenuSub>
 <ContextMenuSubTrigger>
 <Palette className="mr-2 h-4 w-4" />
 change color
 </ContextMenuSubTrigger>
 <ContextMenuSubContent className="w-48">
 {COLORS.map(color => (
   <ContextMenuItem key={color.name} onSelect={() => onColorChange?.(color.value)}>
   <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: color.value }} />
   {color.name.toLowerCase()}
   </ContextMenuItem>
 ))}
 </ContextMenuSubContent>
 </ContextMenuSub>

 <ContextMenuSeparator />

 <ContextMenuItem onSelect={onAddToFolder}>
 <FolderPlus className="mr-2 h-4 w-4" />
 add to folder...
 </ContextMenuItem>
  </ContextMenuContent>
  </ContextMenu>
  )
}
