import { Home, Database, Users, LayoutDashboard, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'databases' | 'home' | 'headmates' | 'board' | 'captures';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'board' | 'captures') => void;
  className?: string;
}

export function BottomNav({ activeTab, onTabChange, className }: BottomNavProps) {
  const handleOpenSearch = () => {
  window.dispatchEvent(new CustomEvent('pkm:open-search'));
  };

  return (
  <>
  <div className={cn("fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-between z-50 px-4 pb-safe", className)}>
 <Button
 variant="ghost"
 className={cn("flex flex-col items-center gap-1 h-full flex-1 rounded-none", activeTab === 'home' && "text-primary")}
 onClick={() => onTabChange('home')}
 >
 <Home className="h-5 w-5" />
 <span className="text-[10px] font-medium lowercase">home</span>
 </Button>

 <Button
 variant="ghost"
 className={cn("flex flex-col items-center gap-1 h-full flex-1 rounded-none", activeTab === 'databases' && "text-primary")}
 onClick={() => onTabChange('databases')}
 >
 <Database className="h-5 w-5" />
 <span className="text-[10px] font-medium lowercase">data</span>
 </Button>

 <Button
 variant="ghost"
 className={cn("flex flex-col items-center gap-1 h-full flex-1 rounded-none", activeTab === 'board' && "text-primary")}
 onClick={() => onTabChange('board')}
 >
 <LayoutDashboard className="h-5 w-5" />
 <span className="text-[10px] font-medium lowercase">board</span>
 </Button>

 <div className="flex-1 flex justify-center">
 <Button
 variant="ghost"
 size="icon"
 className="h-12 w-12 rounded-full hover:bg-primary/10 transition-colors"
 onClick={handleOpenSearch}
 >
 <Search className="h-6 w-6" />
 </Button>
 </div>

 <Button
 variant="ghost"
 className={cn("flex flex-col items-center gap-1 h-full flex-1 rounded-none", activeTab === 'headmates' && "text-primary")}
 onClick={() => onTabChange('headmates')}
 >
 <Users className="h-5 w-5" />
 <span className="text-[10px] font-medium lowercase">mates</span>
 </Button>

 <Button
 variant="ghost"
 className={cn("flex flex-col items-center gap-1 h-full flex-1 rounded-none", activeTab === 'captures' && "text-primary")}
 onClick={() => onTabChange('captures')}
 >
 <LucideIcons.Inbox className="h-5 w-5" />
 <span className="text-[10px] font-medium lowercase">inbox</span>
 </Button>
  </div>

  {/* Render the search palette here so the button can trigger it */}
  {/* Note: GlobalCommandPalette is usually rendered at root, but we can control its open state here if we modify it to accept props,
 OR we let it handle its own state via context/events.
 Looking at existing GlobalCommandPalette, it handles its own 'open' state via Ctrl+K.
 We should refactor it to accept an `isOpen` prop or similar, OR trigger the keyboard event manually.

 Better Approach: We'll modify GlobalCommandPalette to be controlled or expose a trigger.
 For now, let's assume we will pass `open={searchOpen}` and `onOpenChange={setSearchOpen}` to it in the next step.
 I won't render it HERE yet, to avoid duplication if it's already in App.tsx.
 Wait, App.tsx renders GlobalCommandPalette.
 If I want this button to open it, I need a shared state or event.

 Let's update GlobalCommandPalette to listen for a custom event 'pkm:open-search' OR
 Use a simple context.

 Simplest for this refactor: Dispatch a keyboard event or custom event.
  */}
  </>
  );
}
