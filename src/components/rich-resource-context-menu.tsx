import { useState, useEffect, useMemo, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Upload, Search, Loader2, type LucideIcon } from 'lucide-react';
// Dynamic icon loader for Lucide icons
const lucideIconMap: Record<string, LucideIcon> = {};
// ALL_ICONS is defined below, so we fill the map after its definition
function getLucideIcon(name: string): LucideIcon | undefined {
  return lucideIconMap[name];
}
import { ContextMenuContent } from "@/components/ui/context-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface RichResourceContextMenuProps {
  currentName?: string;
  currentColor?: string;
  onUpdate: (data: { name?: string; color?: string; icon?: string; iconType?: 'emoji' | 'lucide' | 'image' }) => void;
  children?: React.ReactNode;
}

// full icon list derived from lucide
// we filter out:
// 1. 'icons', 'createlucideicon', 'default' (internal exports)
// 2. keys starting with 'lucide' (duplicates of base names)
// 3. keys ending with 'icon' (duplicates of base names, e.g. 'appleicon' vs 'apple')
const ALL_ICONS = Object.keys(Icons).filter(key =>
  key !== 'icons' &&
  key !== 'createlucideicon' &&
  key !== 'default' &&
  !key.startsWith('lucide') &&
  !key.endsWith('icon') &&
  /^[A-Z]/.test(key)
);

// semantic keywords for "smart search"
const iconKeywords: Record<string, string[]> = {
  // food & drink
  'food': ['Apple', 'Banana', 'Cherry', 'Citrus', 'Coffee', 'Cookie', 'Croissant', 'CupSoda', 'Donut', 'Egg', 'Fish', 'Grape', 'IceCream', 'Lollipop', 'Martini', 'Milk', 'Nut', 'Pizza', 'Popcorn', 'Potato', 'Sandwich', 'Soup', 'Utensils', 'Wheat', 'Wine', 'Beef', 'Beer', 'Candy', 'Carrot', 'Vegan', 'Cake', 'IceCream2'],
  'drink': ['Beer', 'Coffee', 'CupSoda', 'Martini', 'Milk', 'Wine', 'GlassWater'],

  // nature & environment
  'nature': ['Cloud', 'Sun', 'Moon', 'Tree', 'Flower', 'Leaf', 'Mountain', 'Snowflake', 'Flame', 'Zap', 'Droplets', 'Waves', 'Wind', 'Cat', 'Dog', 'Bird', 'Fish', 'Rabbit', 'Squirrel', 'Bug', 'Palmtree', 'Tent', 'Flower2'],
  'weather': ['Cloud', 'CloudRain', 'CloudSnow', 'CloudLightning', 'Sun', 'Moon', 'Thermometer', 'Umbrella', 'Wind', 'Rainbow', 'Sunset', 'Sunrise'],
  'beach': ['Palmtree', 'Umbrella', 'Sun', 'Waves', 'Shell', 'Fish'],
  'garden': ['Flower', 'Shovel', 'Sprout', 'Tree', 'Fence'],

  // tech & electronics
  'tech': ['Cpu', 'Database', 'HardDrive', 'Keyboard', 'Laptop', 'Monitor', 'Mouse', 'Phone', 'Server', 'Smartphone', 'Tablet', 'Tv', 'Watch', 'Wifi', 'Battery', 'Bluetooth', 'Camera', 'Headphones', 'Speaker', 'Radio', 'Gamepad', 'Printer', 'Scanner'],
  'computer': ['Monitor', 'Laptop', 'Cpu', 'Keyboard', 'Mouse', 'HardDrive', 'Server', 'Code', 'Terminal'],
  'gaming': ['Gamepad', 'Gamepad2', 'Joystick', 'Dice', 'Sword', 'Ghost', 'Skull', 'Trophy', 'Crown'],
  'xbox': ['Gamepad', 'Gamepad2'], // specific request
  'boombox': ['BoomBox', 'Speaker', 'Radio'], // specific request

  // money & finance
  'money': ['Banknote', 'CircleDollarSign', 'Coins', 'CreditCard', 'DollarSign', 'Gem', 'Landmark', 'PiggyBank', 'Receipt', 'Wallet', 'BadgeDollarSign', 'HandCoins', 'CircleDollarSign'],
  'finance': ['TrendingUp', 'TrendingDown', 'BarChart', 'PieChart', 'LineChart', 'Activity', 'BadgePercent', 'Calculator'],

  // objects & life
  'life': ['Home', 'Bed', 'Bath', 'Briefcase', 'ShoppingBag', 'ShoppingCart', 'Ticket', 'Key', 'Lock', 'Map', 'Compass', 'Gift', 'Tag', 'Bookmark'],
  'home': ['Home', 'Bed', 'AppWindow', 'Armchair', 'Bath', 'ConciergeBell', 'DoorOpen', 'Fan', 'Lamp', 'Refrigerator', 'Sofa', 'Tv', 'WashingMachine'],
  'minecraft': ['Box', 'Cuboid', 'Ghost', 'Pickaxe', 'Axe', 'Shovel', 'Sword'], // specific request

  // office & work
  'office': ['Folder', 'File', 'Archive', 'Briefcase', 'Calculator', 'Clipboard', 'Paperclip', 'Printer', 'Scissors', 'Stapler', 'Trash', 'Briefcase', 'Calendar'],

  // transport
  'transport': ['Bike', 'Bus', 'Car', 'Plane', 'Rocket', 'Ship', 'Train', 'Truck', 'Anchor', 'Sailboat', 'TramFront'],

  // misc specific requests
  'cane': ['CandyCane', 'Accessibility', 'Crutch'], // "cane"
  'umbrella': ['Umbrella'],
  'cart': ['ShoppingCart', 'ShoppingBag'],
};

// fallback emoji list (common)
const DEFAULT_EMOJIS = [
  { unified: '1f600', short_name: 'grinning face' },
  { unified: '1f603', short_name: 'grinning face with big eyes' },
  { unified: '1f604', short_name: 'grinning face with smiling eyes' },
  { unified: '1f601', short_name: 'beaming face with smiling eyes' },
  { unified: '1f606', short_name: 'grinning squinting face' },
  { unified: '1f605', short_name: 'grinning face with sweat' },
  { unified: '1f923', short_name: 'rolling on the floor laughing' },
  { unified: '1f602', short_name: 'face with tears of joy' },
  { unified: '1f642', short_name: 'slightly smiling face' },
  { unified: '1f643', short_name: 'upside-down face' },
  { unified: '1f60d', short_name: 'smiling face with heart-eyes' },
  { unified: '1f929', short_name: 'star-struck' },
  { unified: '1f618', short_name: 'face blowing a kiss' },
  { unified: '1f617', short_name: 'kissing face' },
  { unified: '1f61a', short_name: 'kissing face with closed eyes' },
  { unified: '1f619', short_name: 'kissing face with smiling eyes' },
  { unified: '1f60b', short_name: 'face savoring food' },
  { unified: '1f61b', short_name: 'face with tongue' },
  { unified: '1f61c', short_name: 'winking face with tongue' },
  { unified: '1f92a', short_name: 'zany face' },
  { unified: '1f61d', short_name: 'squinting face with tongue' },
  { unified: '1f911', short_name: 'money-mouth face' },
  { unified: '1f917', short_name: 'hugging face' },
  { unified: '1f92d', short_name: 'face with hand over mouth' },
  { unified: '1f92b', short_name: 'shushing face' },
  { unified: '1f914', short_name: 'thinking face' },
  { unified: '1f910', short_name: 'zipper-mouth face' },
  { unified: '1f928', short_name: 'face with raised eyebrow' },
  { unified: '1f610', short_name: 'neutral face' },
  { unified: '1f611', short_name: 'expressionless face' },
  { unified: '1f636', short_name: 'face without mouth' },
  { unified: '1f60f', short_name: 'smirking face' },
  { unified: '1f612', short_name: 'unamused face' },
  { unified: '1f644', short_name: 'face with rolling eyes' },
  { unified: '1f62c', short_name: 'grimacing face' },
  { unified: '1f925', short_name: 'lying face' },
  { unified: '1f60c', short_name: 'relieved face' },
  { unified: '1f614', short_name: 'pensive face' },
  { unified: '1f62a', short_name: 'sleepy face' },
  { unified: '1f924', short_name: 'drooling face' },
  { unified: '1f634', short_name: 'sleeping face' },
  { unified: '1f637', short_name: 'face with medical mask' },
  { unified: '1f912', short_name: 'face with thermometer' },
  { unified: '1f915', short_name: 'face with head-bandage' },
  { unified: '1f922', short_name: 'nauseated face' },
  { unified: '1f92e', short_name: 'face vomiting' },
  { unified: '1f927', short_name: 'sneezing face' },
  { unified: '1f975', short_name: 'hot face' },
  { unified: '1f976', short_name: 'cold face' },
  { unified: '1f974', short_name: 'woozy face' },
  { unified: '1f635', short_name: 'dizzy face' },
  { unified: '1f92f', short_name: 'exploding head' },
  { unified: '1f920', short_name: 'cowboy hat face' },
  { unified: '1f973', short_name: 'partying face' },
  { unified: '1f60e', short_name: 'smiling face with sunglasses' },
  { unified: '1f913', short_name: 'nerd face' },
  { unified: '1f9d0', short_name: 'face with monocle' },
  { unified: '1f615', short_name: 'confused face' },
  { unified: '1f61f', short_name: 'worried face' },
  { unified: '1f641', short_name: 'slightly frowning face' },
  { unified: '2639', short_name: 'frowning face' },
  { unified: '1f62e', short_name: 'face with open mouth' },
  { unified: '1f62f', short_name: 'hushed face' },
  { unified: '1f632', short_name: 'astonished face' },
  { unified: '1f633', short_name: 'flushed face' },
  { unified: '1f97a', short_name: 'pleading face' },
  { unified: '1f626', short_name: 'frowning face with open mouth' },
  { unified: '1f627', short_name: 'anguished face' },
  { unified: '1f628', short_name: 'fearful face' },
  { unified: '1f630', short_name: 'face screaming in fear' },
  { unified: '1f625', short_name: 'sad but relieved face' },
  { unified: '1f622', short_name: 'crying face' },
  { unified: '1f62d', short_name: 'loudly crying face' },
  { unified: '1f631', short_name: 'face screaming in fear' },
  { unified: '1f616', short_name: 'confounded face' },
  { unified: '1f623', short_name: 'persevering face' },
  { unified: '1f61e', short_name: 'disappointed face' },
  { unified: '1f613', short_name: 'downcast face with sweat' },
  { unified: '1f629', short_name: 'weary face' },
  { unified: '1f62b', short_name: 'tired face' },
  { unified: '1f971', short_name: 'yawning face' },
  { unified: '1f624', short_name: 'face with steam from nose' },
  { unified: '1f621', short_name: 'pouting face' },
  { unified: '1f620', short_name: 'angry face' },
  { unified: '1f92c', short_name: 'face with symbols on mouth' },
  { unified: '1f608', short_name: 'smiling face with horns' },
  { unified: '1f47f', short_name: 'angry face with horns' },
  { unified: '1f480', short_name: 'skull' },
  { unified: '2620', short_name: 'skull and crossbones' },
  { unified: '1f4a9', short_name: 'pile of poo' },
  { unified: '1f921', short_name: 'clown face' },
  { unified: '1f479', short_name: 'ogre' },
  { unified: '1f47a', short_name: 'goblin' },
  { unified: '1f47b', short_name: 'ghost' },
  { unified: '1f47d', short_name: 'alien' },
  { unified: '1f47e', short_name: 'alien monster' },
  { unified: '1f916', short_name: 'robot' },
  { unified: '1f63a', short_name: 'smiling cat face with open mouth' },
  { unified: '1f638', short_name: 'grinning cat face with smiling eyes' },
  { unified: '1f639', short_name: 'cat face with tears of joy' },
  { unified: '1f63b', short_name: 'smiling cat face with heart-eyes' },
  { unified: '1f63c', short_name: 'cat face with wry smile' },
  { unified: '1f63d', short_name: 'kissing cat face' },
  { unified: '1f640', short_name: 'weary cat face' },
  { unified: '1f63f', short_name: 'crying cat face' },
  { unified: '1f63e', short_name: 'pouting cat face' },
  { unified: '1f648', short_name: 'see-no-evil monkey' },
  { unified: '1f649', short_name: 'hear-no-evil monkey' },
  { unified: '1f64a', short_name: 'speak-no-evil monkey' },
  { unified: '1f48b', short_name: 'kiss mark' },
  { unified: '1f48c', short_name: 'love letter' },
  { unified: '1f498', short_name: 'heart with arrow' },
  { unified: '1f49d', short_name: 'heart with ribbon' },
  { unified: '1f496', short_name: 'sparkling heart' },
  { unified: '1f497', short_name: 'growing heart' },
  { unified: '1f493', short_name: 'beating heart' },
  { unified: '1f49e', short_name: 'revolving hearts' },
  { unified: '1f495', short_name: 'two hearts' },
  { unified: '1f49f', short_name: 'heart decoration' },
  { unified: '2763', short_name: 'heart exclamation' },
  { unified: '1f494', short_name: 'broken heart' },
  { unified: '2764', short_name: 'red heart' },
  { unified: '1f9e1', short_name: 'orange heart' },
  { unified: '1f49b', short_name: 'yellow heart' },
  { unified: '1f49a', short_name: 'green heart' },
  { unified: '1f499', short_name: 'blue heart' },
  { unified: '1f49c', short_name: 'purple heart' },
  { unified: '1f90e', short_name: 'brown heart' },
  { unified: '1f5a4', short_name: 'black heart' },
  { unified: '1f90d', short_name: 'white heart' },
  { unified: '1f4af', short_name: 'hundred points' },
  { unified: '1f4a2', short_name: 'anger symbol' },
  { unified: '1f4a5', short_name: 'collision' },
  { unified: '1f4ab', short_name: 'dizzy' },
  { unified: '1f4a6', short_name: 'sweat droplets' },
  { unified: '1f4a8', short_name: 'dashing away' },
  { unified: '1f573', short_name: 'hole' },
  { unified: '1f4a3', short_name: 'bomb' },
  { unified: '1f4ac', short_name: 'speech balloon' },
  { unified: '1f441', short_name: 'eye in speech bubble' },
  { unified: '1f5e8', short_name: 'left speech bubble' },
  { unified: '1f5ef', short_name: 'right anger bubble' },
  { unified: '1f4ad', short_name: 'thought balloon' },
  { unified: '1f4a4', short_name: 'zzz' },
  { unified: '1f44b', short_name: 'waving hand' },
  { unified: '1f91a', short_name: 'raised back of hand' },
  { unified: '1f590', short_name: 'hand with fingers splayed' },
  { unified: '270b', short_name: 'raised hand' },
  { unified: '1f596', short_name: 'vulcan salute' },
  { unified: '1f44c', short_name: 'OK hand' },
  { unified: '1f90f', short_name: 'pinching hand' },
  { unified: '270c', short_name: 'victory hand' },
  { unified: '1f91e', short_name: 'crossed fingers' },
  { unified: '1f91f', short_name: 'love-you gesture' },
  { unified: '1f918', short_name: 'sign of the horns' },
  { unified: '1f919', short_name: 'call me hand' },
  { unified: '1f448', short_name: 'backhand index pointing left' },
  { unified: '1f449', short_name: 'backhand index pointing right' },
  { unified: '1f446', short_name: 'backhand index pointing up' },
  { unified: '1f595', short_name: 'middle finger' },
  { unified: '1f447', short_name: 'backhand index pointing down' },
  { unified: '261d', short_name: 'index pointing up' },
  { unified: '1f44d', short_name: 'thumbs up' },
  { unified: '1f44e', short_name: 'thumbs down' },
  { unified: '270a', short_name: 'raised fist' },
  { unified: '1f44a', short_name: 'oncoming fist' },
  { unified: '1f91b', short_name: 'left-facing fist' },
  { unified: '1f91c', short_name: 'right-facing fist' },
  { unified: '1f44f', short_name: 'clapping hands' },
  { unified: '1f64c', short_name: 'raising hands' },
  { unified: '1f450', short_name: 'open hands' },
  { unified: '1f932', short_name: 'palms up together' },
  { unified: '1f91d', short_name: 'handshake' },
  { unified: '1f64f', short_name: 'folded hands' },
  { unified: '270d', short_name: 'writing hand' },
  { unified: '1f485', short_name: 'nail polish' },
  { unified: '1f933', short_name: 'selfie' },
  { unified: '1f4aa', short_name: 'flexed biceps' },
  { unified: '1f9be', short_name: 'mechanical arm' },
  { unified: '1f9bf', short_name: 'mechanical leg' },
  { unified: '1f9b5', short_name: 'leg' },
  { unified: '1f9b6', short_name: 'foot' },
  { unified: '1f442', short_name: 'ear' },
  { unified: '1f9bb', short_name: 'ear with hearing aid' },
  { unified: '1f443', short_name: 'nose' },
  { unified: '1f9e0', short_name: 'brain' },
  { unified: '1f9b7', short_name: 'tooth' },
  { unified: '1f9b4', short_name: 'bone' },
  { unified: '1f440', short_name: 'eyes' },
  { unified: '1f441', short_name: 'eye' },
  { unified: '1f445', short_name: 'tongue' },
  { unified: '1f444', short_name: 'mouth' },
  { unified: '1f476', short_name: 'baby' },
  { unified: '1f9d2', short_name: 'child' },
  { unified: '1f466', short_name: 'boy' },
  { unified: '1f467', short_name: 'girl' },
  { unified: '1f9d1', short_name: 'person' },
  { unified: '1f471', short_name: 'person with blond hair' },
  { unified: '1f468', short_name: 'man' },
  { unified: '1f9d4', short_name: 'person with beard' },
  { unified: '1f468', short_name: 'man with beard' },
  { unified: '1f9d4', short_name: 'woman with beard' },
  { unified: '1f469', short_name: 'woman' },
  { unified: '1f9d3', short_name: 'older person' },
  { unified: '1f474', short_name: 'old man' },
  { unified: '1f475', short_name: 'old woman' },
  { unified: '1f64d', short_name: 'person frowning' },
  { unified: '1f64e', short_name: 'person pouting' },
  { unified: '1f645', short_name: 'person gesturing NO' },
  { unified: '1f646', short_name: 'person gesturing OK' },
  { unified: '1f481', short_name: 'person tipping hand' },
  { unified: '1f64b', short_name: 'person raising hand' },
  { unified: '1f9cf', short_name: 'deaf person' },
  { unified: '1f647', short_name: 'person bowing' },
  { unified: '1f926', short_name: 'person facepalming' },
  { unified: '1f937', short_name: 'person shrugging' },
];

export function RichResourceContextMenuContent({ currentName, currentColor, onUpdate, children }: RichResourceContextMenuProps) {
  const [activeTab, setActiveTab] = useState('icons');
  const [localColor, setLocalColor] = useState(currentColor || 'var(--primary)');
  const [localName, setLocalName] = useState(currentName || '');
  const [search, setSearch] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // debounce timer for rename
  const renameDebounce = useRef<NodeJS.Timeout | null>(null);

  // sync local name if prop changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (currentName) setLocalName(currentName);
    });
    return () => cancelAnimationFrame(raf);
  }, [currentName]);

  // emoji state
  const [emojis, setEmojis] = useState<any[]>(DEFAULT_EMOJIS);
  const [loadingEmojis, setLoadingEmojis] = useState(false);

  // load emojis (twemoji based source or standard list)
  useEffect(() => {
  if (activeTab === 'emojis' && emojis.length === DEFAULT_EMOJIS.length) {
    const raf = requestAnimationFrame(() => setLoadingEmojis(true));
    // fetch a comprehensive emoji list
    fetch('https://unpkg.com/emoji-datasource-twitter@15.0.0/emoji.json')
      .then(res => res.json())
      .then((data: any[]) => {
        // sort by sort_order to ensure smileys are first (fixing the "flags only" issue)
        const sorted = data.sort((a, b) => a.sort_order - b.sort_order);
        setEmojis(sorted);
        setLoadingEmojis(false);
      })
      .catch(() => {
        // fail silently, we have defaults
        setLoadingEmojis(false);
      });
    return () => cancelAnimationFrame(raf);
  }
  }, [activeTab, emojis.length]);

  const filteredEmojis = useMemo(() => {
  if (!search) return emojis.slice(0, 200); // limit initial render
  return emojis.filter(e => e.short_name.includes(search.toLowerCase())).slice(0, 100);
  }, [emojis, search]);

  const filteredIcons = useMemo(() => {
  if (!search) return ALL_ICONS.slice(0, 200);

  const lowerSearch = search.toLowerCase();

  // 1. direct search
  const directMatches = ALL_ICONS.filter(name => name.toLowerCase().includes(lowerSearch));

  // 2. keyword search
  const keywordMatches = Object.entries(iconKeywords)
  .filter(([key]) => key.includes(lowerSearch))
  .flatMap(([, icons]) => icons);

  // combine and dedup
  const unique = Array.from(new Set([...directMatches, ...keywordMatches]));
  return unique.slice(0, 100);
  }, [search]);

  // twemoji url helper
  const getTwemojiUrl = (unified: string) => {
  const code = unified.toLowerCase().replace(/-fe0f/g, '');
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${code}.png`;
  };

  // file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
  const reader = new FileReader();
  reader.onloadend = () => {
 onUpdate({ icon: reader.result as string, iconType: 'image' });
  };
  reader.readAsDataURL(file);
  }
  };

  return (
  <ContextMenuContent ref={contextMenuRef} className="w-[90vw] sm:w-[360px] p-0 overflow-hidden bg-[#050505] border-border/50 flex flex-col transition-all duration-300">
  {/* header: name & color toggle */}
  <div className="p-4 border-b shrink-0 relative flex items-center gap-3">
 <div className="flex-1 space-y-1.5">
 <Label className="text-[10px] font-bold  text-muted-foreground/70">name</Label>
 <Input
   value={localName}
   onChange={(e) => {
     const val = e.target.value;
     setLocalName(val);
     // debounce rename to avoid multiple updates per spacebar tap
     if (renameDebounce.current) clearTimeout(renameDebounce.current);
     renameDebounce.current = setTimeout(() => {
       if (val !== currentName && val.trim()) {
         onUpdate({ name: val });
         // close context menu after rename
         setTimeout(() => {
           // try to close the menu (works for Radix UI context menu)
           if (contextMenuRef.current) {
             const evt = new Event('pointerdown', { bubbles: true });
             contextMenuRef.current.dispatchEvent(evt);
           }
         }, 100);
       }
     }, 200);
   }}
   onBlur={() => {
     if (localName !== currentName && localName.trim()) {
       onUpdate({ name: localName });
       setTimeout(() => {
         if (contextMenuRef.current) {
           const evt = new Event('pointerdown', { bubbles: true });
           contextMenuRef.current.dispatchEvent(evt);
         }
       }, 100);
     }
   }}
   onKeyDown={(e) => {
     if (e.key === 'Enter') {
       e.currentTarget.blur();
     }
   }}
   className="h-9 font-medium text-sm bg-transparent border-transparent hover:border-input focus:border-ring transition-colors px-2 shadow-none"
   placeholder="untitled"
 />
 </div>

  </div>

  {/* color dot toggle removed - moved to tabs */}

  {/* main content area */}
  <div className="h-[400px] relative">
 <Tabs defaultValue="icons" className="w-full h-full flex flex-col" onValueChange={setActiveTab}>
 <div className="px-0 border-b bg-muted/30 shrink-0 flex items-center">
 <TabsList className="bg-transparent p-0 h-12 w-full flex justify-between gap-0">
   <TabsTrigger
   value="icons"
   className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:underline underline-offset-8 rounded-none h-full px-0 font-semibold text-base text-muted-foreground/60 transition-all hover:text-foreground/80"
   >
   icons
   </TabsTrigger>
   <TabsTrigger
   value="emojis"
   className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:underline underline-offset-8 rounded-none h-full px-0 font-semibold text-base text-muted-foreground/60 transition-all hover:text-foreground/80"
   >
   emojis
   </TabsTrigger>
   <TabsTrigger
   value="color"
   className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:underline underline-offset-8 rounded-none h-full px-0 font-semibold text-base transition-all hover:opacity-80"
   style={{ color: localColor }}
   >
   color
   </TabsTrigger>
 </TabsList>
 </div>

 {/* search bar - moved below tabs to prevent overlap */}
 {(activeTab === 'icons' || activeTab === 'emojis') && (
 <div className="p-2 border-b bg-muted/10 shrink-0 relative">
   <div className="relative">
   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
   <Input
   value={search}
   onChange={(e) => setSearch(e.target.value)}
   placeholder="search..."
   className="h-9 pl-9 text-sm bg-background border-input shadow-sm w-full"
   />
   </div>
 </div>
 )}

 <div className="flex-1 min-h-0 relative">
 <TabsContent value="emojis" className="absolute inset-0 m-0">
   {loadingEmojis ? (
   <div className="flex items-center justify-center h-full text-muted-foreground">
   <Loader2 className="h-6 w-6 animate-spin mr-2" /> loading...
   </div>
   ) : (
   <ScrollArea className="h-full p-2">
   <div className="grid grid-cols-7 gap-1">
  {filteredEmojis.map((emoji: any) => (
    <button
      key={emoji.unified}
      className="flex items-center justify-center h-9 w-9 text-xl hover:bg-muted rounded-md active:scale-90 transition-transform"
      onClick={() => onUpdate({ icon: emoji.unified, iconType: 'emoji' })}
      title={emoji.short_name}
    >
      <img
        src={getTwemojiUrl(emoji.unified)}
        alt={emoji.short_name}
        className="h-6 w-6 object-contain pointer-events-none"
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </button>
  ))}
   </div>
   {!filteredEmojis.length && (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-8">
      <span className="text-2xl mb-2">🤔</span>
      <span className="text-xs">no emojis found</span>
    </div>
   )}
   </ScrollArea>
   )}
 </TabsContent>

 <TabsContent value="icons" className="absolute inset-0 m-0">
   <ScrollArea className="h-full p-2">
   <div className="grid grid-cols-7 gap-1">
   {filteredIcons.map(name => {
    const IconComponent = getLucideIcon(name);
    if (!IconComponent) return null;
    return (
      <button
        key={name}
        className="flex items-center justify-center h-9 w-9 hover:bg-muted rounded-md active:scale-90 transition-transform"
        onClick={() => onUpdate({ icon: name, iconType: 'lucide' })}
        style={{ color: localColor }}
        title={name}
      >
        <IconComponent className="h-5 w-5 pointer-events-none" strokeWidth={1.5} />
      </button>
    );
   })}
   </div>
   {!filteredIcons.length && (
     <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-8">
       <Search className="h-8 w-8 mb-2 opacity-50" />
       <span className="text-xs">no icons found</span>
     </div>
   )}
   </ScrollArea>
 </TabsContent>

 <TabsContent value="color" className="absolute inset-0 m-0 flex flex-col items-center justify-center p-4 bg-muted/10">
   <div
   className="bg-popover p-2 rounded-xl shadow-xl border animate-in fade-in zoom-in-95 duration-200"
   onPointerDown={(e) => e.stopPropagation()}
   >
   <HexColorPicker
   color={localColor}
   onChange={(c) => { setLocalColor(c); onUpdate({ color: c }); }}
   style={{ width: '220px', height: '220px' }}
   />
   </div>
 </TabsContent>
 </div>
 </Tabs>
  </div>

  {/* footer: upload */}
  <div className="p-3 border-t bg-muted/30 shrink-0">
 <Button
 variant="outline"
 className="w-full h-10 text-sm font-medium border-dashed border-muted-foreground/30 hover:bg-muted hover:text-foreground transition-all rounded-xl"
 onClick={() => document.getElementById('icon-upload')?.click()}
 >
 <Upload className="h-4 w-4 mr-2" /> upload custom icon
 </Button>
 {/* hidden children or separator logic if needed, but 'children' props seemed unused in snippet view context or just generic actions */}
 {children && (
 <div className="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1">
 {children}
 </div>
 )}
 <input
 id="icon-upload"
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleFileUpload}
 />
  </div>
  </ContextMenuContent >
  );
}
