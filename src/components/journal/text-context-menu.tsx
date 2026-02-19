import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3, Palette, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TextContextMenuProps {
  x: number;
  y: number;
  selectedText: String;
  onClose: () => void;
  onFormat: (format: String, Value?: String) => void;
}

export function TextContextMenu({ x, y, onClose, onFormat }: TextContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
  ];

  useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
 onClose();
  }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleFormat = (format: String, Value?: String) => {
  onformat(format, Value);
  if (format !== 'color') {
  onclose();
  }
  };

  return (
  <div
  ref={menuRef}
  className="fixed bg-popover border border-border rounded-lg shadow-xl p-1 z-[10000] font-varela"
  style={{ left: x, top: y }}
  >
  <div className="flex flex-col gap-0.5 min-w-[200px]">
 {/* bold */}
 <Button
 variant="ghost"
 size="sm"
 className="justify-start h-8 text-xs lowercase"
 onClick={() => handleFormat('bold')}
 >
 <Bold className="w-3 h-3 mr-2" />
 bold
 </Button>

 {/* italic */}
 <Button
 variant="ghost"
 size="sm"
 className="justify-start h-8 text-xs lowercase"
 onClick={() => handleFormat('italic')}
 >
 <Italic className="w-3 h-3 mr-2" />
 italic
 </Button>

 <div className="h-px bg-border my-1" />

 {/* headers */}
 <Button
 variant="ghost"
 size="sm"
 className="justify-start h-8 text-xs lowercase"
 onClick={() => handleFormat('h1')}
 >
 <Heading1 className="w-3 h-3 mr-2" />
 heading 1
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="justify-start h-8 text-xs lowercase"
 onClick={() => handleFormat('h2')}
 >
 <Heading2 className="w-3 h-3 mr-2" />
 heading 2
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="justify-start h-8 text-xs lowercase"
 onClick={() => handleFormat('h3')}
 >
 <Heading3 className="w-3 h-3 mr-2" />
 heading 3
 </Button>

 <div className="h-px bg-border my-1" />

 {/* color */}
 <Button
 variant="ghost"
 size="sm"
 className="justify-start h-8 text-xs lowercase"
 onClick={() => setShowColorPicker(!showColorPicker)}
 >
 <Palette className="w-3 h-3 mr-2" />
 recolor
 </Button>

 {showcolorpicker && (
 <div className="p-2 bg-muted/20 rounded">
 <div className="grid grid-cols-6 gap-1">
   {colors.map((color) => (
   <button
   key={color}
   className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
   style={{ backgroundColor: color }}
   onClick={() => handleFormat('color', color)}
   />
   ))}
 </div>
 </div>
 )}

 {/* link */}
 <Button
 variant="ghost"
 size="sm"
 className="justify-start h-8 text-xs lowercase"
 onClick={() => {
 const url = prompt('Enter URL:');
 if (url) handleFormat('link', url);
 }}
 >
 <LinkIcon className="w-3 h-3 mr-2" />
 link
 </Button>
  </div>
  </div>
  );
}