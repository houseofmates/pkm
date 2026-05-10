import { Home, Database, Users, Search, Inbox, BookOpen, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
<<<<<<< HEAD
  activeTab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar') => void;
=======
  activeTab: 'databases' | 'home' | 'captures' | 'journal' | 'calendar';
  onTabChange: (tab: 'databases' | 'home' | 'captures' | 'journal' | 'calendar') => void;
>>>>>>> main
  className?: string;
}

export function BottomNav({ activeTab, onTabChange, className }: BottomNavProps) {
<<<<<<< HEAD
 
  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent('pkm:open-chat'));
  };
 
  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('pkm:open-search'));
  };
 
=======

  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent('pkm:open-chat'));
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('pkm:open-search'));
  };

>>>>>>> main
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center w-full pb-safe px-2">
        <div className={cn(
          "w-full max-w-md flex items-center justify-between bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_32px_rgba(0,0,0,0.5)] px-2 py-2 pointer-events-auto",
          className
        )}>
          {/* chat button - leftmost */}
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10"
            onClick={handleOpenChat}
          >
            <MessageSquare className="h-10 w-10" />
            <span className="text-[12px] font-medium lowercase">chat</span>
          </Button>
<<<<<<< HEAD
 
=======

>>>>>>> main
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10", activeTab === 'home' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('home')}
          >
            <Home className="h-10 w-10" />
            <span className="text-[12px] font-medium lowercase">home</span>
          </Button>
<<<<<<< HEAD
 
=======

>>>>>>> main
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10", activeTab === 'databases' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('databases')}
          >
            <Database className="h-10 w-10" />
            <span className="text-[12px] font-medium lowercase">data</span>
          </Button>
<<<<<<< HEAD
 
=======

>>>>>>> main
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10", activeTab === 'captures' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('captures')}
          >
            <Inbox className="h-10 w-10" />
            <span className="text-[12px] font-medium lowercase">inbox</span>
          </Button>
<<<<<<< HEAD
 
=======

>>>>>>> main
          {/* search button - centered in middle of toolbar */}
          <Button
            variant="ghost"
            size="icon"
            className="h-[56px] w-[56px] min-w-[56px] rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
            onClick={handleOpenSearch}
          >
            <Search className="h-11 w-11" />
          </Button>
<<<<<<< HEAD
 
=======

>>>>>>> main
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10", activeTab === 'calendar' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('calendar')}
          >
            <Calendar className="h-10 w-10" />
            <span className="text-[12px] font-medium lowercase">cal</span>
          </Button>
<<<<<<< HEAD
 
=======

>>>>>>> main
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10", activeTab === 'journal' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('journal')}
          >
            <BookOpen className="h-10 w-10" />
            <span className="text-[12px] font-medium lowercase">journal</span>
          </Button>
<<<<<<< HEAD
 
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10", activeTab === 'headmates' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('headmates')}
          >
            <Users className="h-10 w-10" />
            <span className="text-[12px] font-medium lowercase">mates</span>
          </Button>
 
=======

          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-[56px] w-[56px] min-w-[56px] rounded-3xl gap-0.5 hover:bg-white/10"
            onClick={() => window.location.href = '/system-tracker'}
          >
            <span className="text-3xl font-bold">&</span>
            <span className="text-[12px] font-medium lowercase">system</span>
          </Button>

>>>>>>> main
        </div>
      </div>
    </>
  );
}
