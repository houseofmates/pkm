import { Home, Database, Users, Search, Inbox, Settings, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'databases' | 'home' | 'headmates' | 'board' | 'captures';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'board' | 'captures') => void;
  className?: string;
}

import { useNavigate } from 'react-router-dom';
import { useEdgelessStore } from '@/features/edgeless/store';

export function BottomNav({ activeTab, onTabChange, className }: BottomNavProps) {

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('pkm:open-search'));
  };

  const navigate = useNavigate();
  const setChatOpen = useEdgelessStore((s) => s.setChatOpen);
  const isChatOpen = useEdgelessStore((s) => s.isChatOpen);

  return (
    <>
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
        <div className={cn(
          "flex items-center gap-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1.5 pointer-events-auto",
          className
        )}>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-12 w-12 rounded-full", activeTab === 'home' && "bg-primary/20 text-primary")}
            onClick={() => onTabChange('home')}
          >
            <Home className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-12 w-12 rounded-full", activeTab === 'databases' && "bg-primary/20 text-primary")}
            onClick={() => onTabChange('databases')}
          >
            <Database className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full hover:bg-white/10"
            onClick={handleOpenSearch}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-12 w-12 rounded-full", activeTab === 'headmates' && "bg-primary/20 text-primary")}
            onClick={() => onTabChange('headmates')}
          >
            <Users className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-12 w-12 rounded-full", activeTab === 'captures' && "bg-primary/20 text-primary")}
            onClick={() => onTabChange('captures')}
          >
            <Inbox className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full hover:bg-white/10"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-12 w-12 rounded-full", isChatOpen && "bg-primary/20 text-primary")}
            onClick={() => setChatOpen(!isChatOpen)}
          >
            <BrainCircuit className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* render the search palette here so the button can trigger it */}
      {/* note: globalcommandpalette is usually rendered at root, but we can control its open state here if we modify it to accept props,
 or we let it handle its own state via context/events.
 looking at existing globalcommandpalette, it handles its own 'open' state via ctrl+k.
 we should refactor it to accept an `isopen` prop or similar, or trigger the keyboard event manually.

 better approach: we'll modify globalcommandpalette to be controlled or expose a trigger.
 for now, let's assume we will pass `open={searchopen}` and `onopenchange={setsearchopen}` to it in the next step.
 i won't render it here yet, to avoid duplication if it's already in app.tsx.
 wait, app.tsx renders globalcommandpalette.
 if i want this button to open it, i need a shared state or event.

 let's update globalcommandpalette to listen for a custom event 'pkm:open-search' or
 use a simple context.

 simplest for this refactor: dispatch a keyboard event or custom event.
  */}
    </>
  );
}
