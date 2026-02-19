import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X } from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  onClose: () => void;
}

// curated, deduplicated list of useful icons for feature widgets.
// includes drawing/editing icons (pencil, palette, paintbrush, paintbucket, filetext, clipboard)
const CURATED_ICONS = [
  'Shield', 'Zap', 'Crown', 'MessageCircle', 'Gamepad2', 'Wifi', 'Server', 'Monitor',
  'Users', 'User', 'Heart', 'Star', 'Trophy', 'Target', 'Activity',
  'Bell', 'Settings', 'Info', 'HelpCircle', 'Mail', 'ExternalLink', 'Link', 'Download',
  'Play', 'Pause', 'Square', 'Circle', 'Triangle', 'Hash', 'Code', 'Terminal',
  'Layout', 'Search', 'Home', 'Compass', 'Map', 'Navigation', 'Globe', 'Lock',
  'Unlock', 'Eye', 'EyeOff', 'Camera', 'Image', 'Video', 'Music', 'Volume2',
  'Github', 'Twitter', 'Youtube', 'Twitch', 'Facebook', 'Instagram', 'Dribbble',
  // editing / design icons
  'Pencil', 'Edit', 'Edit2', 'Pen', 'Palette', 'Paintbrush', 'PaintBucket',
  'FileText', 'Clipboard', 'Paperclip'
];

export function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
  const term = searchTerm.toLowerCase();
  return CURATED_ICONS.filter(name => name.toLowerCase().includes(term));
  }, [searchTerm]);

  return (
  <div className="flex flex-col h-[400px] w-[320px] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-bounce-up builder-modal">
  {/* header */}
  <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
 <input
 autoFocus
 type="text"
 placeholder="search icons..."
 className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:border-[var(--primary)] outline-none"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
 <X size={18} />
 </button>
  </div>

  {/* grid */}
  <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
 <div className="grid grid-cols-4 gap-2">
 {filteredIcons.map((iconName) => {
 // @ts-expect-error -- dynamic LucideIcons lookup
 const Icon = (LucideIcons as any)[iconName];
 const isSelected = value.toLowerCase() === iconName.toLowerCase();

 if (!Icon) return null;

 return (
   <button
   key={iconName}
   onClick={() => {
   onChange(iconName.toLowerCase());
   onClose();
   }}
   className={`
   flex items-center justify-center p-2.5 rounded-lg transition-all
   ${isSelected
  ? 'bg-[var(--primary)] text-black shadow-[0_0_15px_rgba(246,176,18,0.3)]'
  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
   }
   `}
   title={iconName}
   >
   <Icon size={20} />
   </button>
 );
 })}
 </div>
 {filteredIcons.length === 0 && (
 <div className="h-full flex flex-col items-center justify-center text-white/30 text-xs py-10">
 no icons found
 </div>
 )}
  </div>

  {/* footer */}
  <div className="p-2 px-3 bg-black/30 border-t border-white/10 text-[10px] text-white/30  font-bold">
 {filteredIcons.length} icons available
  </div>
  </div>
  );
}
